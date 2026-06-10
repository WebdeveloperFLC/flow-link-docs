// ============================================================================
// incentive-calculate-run  —  all-counselors-per-branch-per-period
// ----------------------------------------------------------------------------
// Calculates a counselor incentive run for one (plan, period, branch).
// Reads VERIFIED payments + RECEIVED commissions, attributes to counselor,
// applies slabs, converts every currency via the period FX snapshot, writes
// incentive_line_items + per-counselor totals, and (on lock) freezes the run.
//
// Respects Future Link rules:
//   R1  Only verified, non-archived, non-refund payments. Commission only when
//       commission_status='paid'. Net (post-applied-discount) base when the
//       plan says revenue_basis='net'.
//   R2  On lock: freeze fx_snapshot + per-line fx_rate_used + earned_amount,
//       set locked=true. Never recalculates a locked run. Corrections come in
//       as incentive_adjustments rows, not edits.
//   R3  Caller must be admin/administrator/manager (checked via has_role RPC).
//
// Modes:
//   action='preview'    -> compute + return numbers, DO NOT persist (spot-check)
//   action='calculate'  -> compute + upsert run + line items (status='calculated')
//   action='lock'       -> mark an already-calculated run locked + snapshot FX
//
// Body: { action, plan_id, period_key, branch_id, period_type? }
// ============================================================================

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;
const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

type Svc = ReturnType<typeof createClient>;

// ---- period_key -> [startISO, endISO) ------------------------------------
// Supports '2026-05' (monthly), '2026-Q2', '2026-H1', '2026' (yearly).
function periodRange(period_key: string): { start: string; end: string } {
  const yearMatch = /^(\d{4})$/.exec(period_key);
  if (yearMatch) {
    const y = +yearMatch[1];
    return { start: `${y}-01-01`, end: `${y + 1}-01-01` };
  }
  const qMatch = /^(\d{4})-Q([1-4])$/.exec(period_key);
  if (qMatch) {
    const y = +qMatch[1], q = +qMatch[2];
    const sm = (q - 1) * 3 + 1;
    const startM = String(sm).padStart(2, "0");
    const endY = q === 4 ? y + 1 : y;
    const endM = q === 4 ? "01" : String(sm + 3).padStart(2, "0");
    return { start: `${y}-${startM}-01`, end: `${endY}-${endM}-01` };
  }
  const hMatch = /^(\d{4})-H([12])$/.exec(period_key);
  if (hMatch) {
    const y = +hMatch[1], h = +hMatch[2];
    return h === 1
      ? { start: `${y}-01-01`, end: `${y}-07-01` }
      : { start: `${y}-07-01`, end: `${y + 1}-01-01` };
  }
  const mMatch = /^(\d{4})-(\d{2})$/.exec(period_key);
  if (mMatch) {
    const y = +mMatch[1], m = +mMatch[2];
    const endY = m === 12 ? y + 1 : y;
    const endM = m === 12 ? "01" : String(m + 1).padStart(2, "0");
    return { start: `${y}-${mMatch[2]}-01`, end: `${endY}-${endM}-01` };
  }
  throw new Error(`Unrecognized period_key: ${period_key}`);
}

// ---- load the period FX snapshot (currency -> rate_to_inr) ----------------
async function loadFxSnapshot(svc: Svc, period_key: string): Promise<Record<string, number>> {
  const { data, error } = await svc
    .from("fx_rates")
    .select("currency, rate_to_inr, period_key")
    .lte("period_key", period_key)
    .order("period_key", { ascending: false });
  if (error) throw error;
  const snap: Record<string, number> = { INR: 1.0 };
  // first (most recent <= period) wins per currency
  for (const r of (data ?? []) as any[]) {
    if (!(r.currency in snap)) snap[r.currency] = Number(r.rate_to_inr);
  }
  return snap;
}

function convert(amount: number, from: string, to: string, snap: Record<string, number>): number | null {
  if (amount == null) return null;
  if (from === to) return amount;
  const rf = from === "INR" ? 1 : snap[from];
  const rt = to === "INR" ? 1 : snap[to];
  if (rf == null || rt == null || rt === 0) return null;
  return Math.round(((amount * rf) / rt) * 100) / 100;
}

// ---- slab application ------------------------------------------------------
// Given a metric value (count or revenue in settlement ccy) and the slabs for
// a source_type, compute earned amount in settlement currency.
interface Slab {
  id: string; source_type: string; service_filter: string | null;
  metric: string; rate_type: string;
  min_threshold: number; max_threshold: number | null; rate_value: number;
  sort_order: number;
}

function applySlabs(metricValue: number, units: number, slabs: Slab[]): { earned: number; slabId: string | null } {
  // tiered: sum across tiers the metricValue falls into; flat/per_unit/percent
  let earned = 0;
  let lastSlab: string | null = null;
  const sorted = [...slabs].sort((a, b) => a.min_threshold - b.min_threshold);
  for (const s of sorted) {
    const lo = s.min_threshold ?? 0;
    const hi = s.max_threshold ?? Infinity;
    if (metricValue <= lo) continue;
    lastSlab = s.id;
    const inTier = Math.min(metricValue, hi) - lo; // portion of metric in this tier
    if (inTier <= 0) continue;
    switch (s.rate_type) {
      case "percent":
        earned += (inTier * s.rate_value) / 100;
        break;
      case "per_unit":
        // per_unit applies to units, not revenue; approximate by share
        earned += units > 0 ? (inTier / Math.max(metricValue, 1)) * units * s.rate_value : 0;
        break;
      case "flat":
        // flat once if the tier is reached
        earned += s.rate_value;
        break;
      case "slab":
        earned += (inTier * s.rate_value) / 100;
        break;
    }
  }
  return { earned: Math.round(earned * 100) / 100, slabId: lastSlab };
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) return json({ error: "Unauthorized" }, 401);

    const userClient = createClient(SUPABASE_URL, ANON_KEY, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: userData, error: userErr } = await userClient.auth.getUser();
    if (userErr || !userData?.user?.id) return json({ error: "Unauthorized" }, 401);
    const callerId = userData.user.id;

    const svc = createClient(SUPABASE_URL, SERVICE_KEY);

    // role gate: admin / administrator / manager
    const roleChecks = await Promise.all(
      ["admin", "administrator", "manager"].map((r) =>
        svc.rpc("has_role", { _user_id: callerId, _role: r })
      )
    );
    if (!roleChecks.some((c) => c.data === true)) {
      return json({ error: "Forbidden: admin or manager only" }, 403);
    }

    const body = await req.json();
    const action = (body.action ?? "preview") as "preview" | "calculate" | "lock";
    const plan_id = body.plan_id as string;
    const period_key = body.period_key as string;
    const branch_id = (body.branch_id ?? null) as string | null;
    if (!plan_id || !period_key) return json({ error: "plan_id and period_key required" }, 400);

    // --- load plan ---
    const { data: plan, error: planErr } = await svc
      .from("incentive_plans").select("*").eq("id", plan_id).single();
    if (planErr || !plan) return json({ error: "Plan not found" }, 404);
    const settlement = (plan.settlement_currency ?? "INR") as string;
    const useNet = (plan.revenue_basis ?? "net") === "net";
    const period_type = (body.period_type ?? plan.period_type) as string;

    // --- LOCK path: only flip an already-calculated run to locked ---
    if (action === "lock") {
      const snap = await loadFxSnapshot(svc, period_key);
      const { data: run, error: runErr } = await svc
        .from("incentive_runs")
        .update({ status: "approved", locked: true, fx_snapshot: snap, approved_by: callerId, approved_at: new Date().toISOString() })
        .eq("plan_id", plan_id).eq("period_key", period_key)
        .is("branch_id", branch_id) // matches null too via .is when null
        .select().single();
      if (runErr) return json({ error: runErr.message }, 400);
      return json({ ok: true, action, run });
    }

    // --- compute path (preview or calculate) ---
    const { start, end } = periodRange(period_key);
    const snap = await loadFxSnapshot(svc, period_key);

    // slabs for this plan
    const { data: slabsRaw } = await svc.from("incentive_slabs").select("*").eq("plan_id", plan_id);
    const slabs = (slabsRaw ?? []) as Slab[];
    const slabsBySource: Record<string, Slab[]> = {};
    for (const s of slabs) (slabsBySource[s.source_type] ||= []).push(s);

    // counselors in scope: those who own clients in this branch (or all if no branch)
    let clientQ = svc.from("clients").select("id, assigned_counselor_id, branch_id");
    if (branch_id) clientQ = clientQ.eq("branch_id", branch_id);
    const { data: clients } = await clientQ;
    const clientList = (clients ?? []) as any[];
    const clientToCounselor: Record<string, string> = {};
    const counselorSet = new Set<string>();
    for (const c of clientList) {
      if (c.assigned_counselor_id) {
        clientToCounselor[c.id] = c.assigned_counselor_id;
        counselorSet.add(c.assigned_counselor_id);
      }
    }
    const clientIds = clientList.map((c) => c.id);

    // ---- verified service/ancillary revenue from payments ----
    // accumulate per counselor per source_type, in settlement currency
    type Bucket = { count: number; revenue: number; lines: any[] };
    const acc: Record<string, Record<string, Bucket>> = {}; // counselor -> source -> bucket
    const ensure = (cid: string, src: string): Bucket =>
      ((acc[cid] ||= {})[src] ||= { count: 0, revenue: 0, lines: [] });

    if (clientIds.length) {
      const { data: pays } = await svc
        .from("client_invoice_payments")
        .select("id, client_id, invoice_id, currency, amount, amount_in_inr, paid_at, payment_proof_status, archived_at, is_refund")
        .in("client_id", clientIds)
        .eq("payment_proof_status", "verified")
        .is("archived_at", null)
        .gte("paid_at", start).lt("paid_at", end);

      const invoiceIds = [...new Set((pays ?? []).map((p: any) => p.invoice_id).filter(Boolean))] as string[];
      const invoiceMap: Record<string, { amount: number; currency: string }> = {};
      const walletDiscByInvoice: Record<string, number> = {};

      if (useNet && invoiceIds.length) {
        const [{ data: invs }, { data: allocs }] = await Promise.all([
          svc.from("client_invoices").select("id, amount, currency").in("id", invoiceIds),
          svc.from("wallet_allocations")
            .select("invoice_id, amount, currency, status")
            .in("invoice_id", invoiceIds)
            .eq("status", "applied"),
        ]);
        for (const inv of (invs ?? []) as any[]) {
          invoiceMap[inv.id] = { amount: Number(inv.amount ?? 0), currency: inv.currency ?? "INR" };
        }
        for (const a of (allocs ?? []) as any[]) {
          if (!a.invoice_id) continue;
          const conv = convert(Number(a.amount ?? 0), a.currency ?? "INR", settlement, snap) ?? 0;
          walletDiscByInvoice[a.invoice_id] = (walletDiscByInvoice[a.invoice_id] ?? 0) + conv;
        }
      }

      for (const p of (pays ?? []) as any[]) {
        if (p.is_refund) continue;
        const cid = clientToCounselor[p.client_id];
        if (!cid) continue;
        let inSettlement = convert(Number(p.amount), p.currency ?? "INR", settlement, snap);
        if (inSettlement == null) continue;

        if (useNet && p.invoice_id && invoiceMap[p.invoice_id]) {
          const inv = invoiceMap[p.invoice_id];
          const invTotal = convert(inv.amount, inv.currency, settlement, snap);
          if (invTotal != null && invTotal > 0) {
            const share = inSettlement / invTotal;
            const walletDisc = (walletDiscByInvoice[p.invoice_id] ?? 0) * share;
            inSettlement = Math.max(0, inSettlement - walletDisc);
          }
        }

        const src = "service_revenue";
        const b = ensure(cid, src);
        b.count += 1;
        b.revenue += inSettlement;
        b.lines.push({
          source_type: src, source_payment_id: p.id, source_invoice_id: p.invoice_id,
          client_id: p.client_id, base_amount: Number(p.amount), base_currency: p.currency ?? "INR",
          fx_rate_used: p.currency === "INR" ? 1 : snap[p.currency] ?? null,
          settlement_amount: inSettlement,
        });
      }
    }

    // ---- commission revenue (direct visa + b2b): commission_status='paid' ----
    {
      const { data: comm } = await svc
        .from("upi_commission_students")
        .select("id, client_id, commission_amount, tuition_currency, commission_status, commission_paid_date")
        .eq("commission_status", "paid")
        .gte("commission_paid_date", start).lt("commission_paid_date", end);
      for (const cm of (comm ?? []) as any[]) {
        const cid = cm.client_id ? clientToCounselor[cm.client_id] : null;
        if (!cid) continue; // only commissions tied to an attributable client
        const amt = convert(Number(cm.commission_amount ?? 0), cm.tuition_currency ?? "CAD", settlement, snap);
        if (amt == null) continue;
        const src = "direct_visa_commission";
        const b = ensure(cid, src);
        b.count += 1;
        b.revenue += amt;
        b.lines.push({
          source_type: src, source_commission_id: cm.id, client_id: cm.client_id,
          base_amount: Number(cm.commission_amount ?? 0), base_currency: cm.tuition_currency ?? "CAD",
          fx_rate_used: (cm.tuition_currency ?? "CAD") === "INR" ? 1 : snap[cm.tuition_currency ?? "CAD"] ?? null,
          settlement_amount: amt,
        });
      }
    }

    // ---- apply slabs per counselor per source ----
    const perCounselor: Record<string, { total: number; lines: any[] }> = {};
    for (const cid of Object.keys(acc)) {
      perCounselor[cid] = { total: 0, lines: [] };
      for (const src of Object.keys(acc[cid])) {
        const bucket = acc[cid][src];
        const srcSlabs = slabsBySource[src] ?? [];
        // choose metric: revenue-based sources use revenue; count handled inside
        const { earned, slabId } = applySlabs(bucket.revenue, bucket.count, srcSlabs);
        // attach earned proportionally is complex; store one summary line per source
        perCounselor[cid].total += earned;
        for (const ln of bucket.lines) {
          perCounselor[cid].lines.push({
            ...ln, slab_id: slabId,
            earned_amount: 0, // detail lines trace source; earned summarized below
            settlement_currency: settlement,
          });
        }
        // summary earned line
        perCounselor[cid].lines.push({
          source_type: src, slab_id: slabId, client_id: null,
          base_amount: bucket.revenue, base_currency: settlement, fx_rate_used: null,
          earned_amount: earned, settlement_currency: settlement,
          note: `Earned on ${bucket.count} item(s), base ${bucket.revenue.toFixed(2)} ${settlement}`,
        });
      }
    }

    const summary = Object.entries(perCounselor).map(([cid, v]) => ({
      counselor_id: cid, earned: Math.round(v.total * 100) / 100, settlement_currency: settlement,
    }));
    const grandTotal = Math.round(summary.reduce((s, r) => s + r.earned, 0) * 100) / 100;

    if (action === "preview") {
      return json({ ok: true, action, period_key, branch_id, settlement, fx_snapshot: snap, summary, grand_total: grandTotal });
    }

    // --- action === 'calculate': upsert run + replace line items ---
    // refuse to recompute a locked run (R2)
    const { data: existing } = await svc.from("incentive_runs").select("id, locked")
      .eq("plan_id", plan_id).eq("period_key", period_key).is("branch_id", branch_id).maybeSingle();
    if (existing?.locked) return json({ error: "Run is locked; corrections must be adjustments (R2)." }, 409);

    let runId = existing?.id as string | undefined;
    if (runId) {
      await svc.from("incentive_runs").update({
        status: "calculated", settlement_currency: settlement, fx_snapshot: snap,
        total_settlement: grandTotal, calculated_at: new Date().toISOString(), calculated_by: callerId,
      }).eq("id", runId);
      await svc.from("incentive_line_items").delete().eq("run_id", runId);
    } else {
      const { data: ins, error: insErr } = await svc.from("incentive_runs").insert({
        plan_id, period_type, period_key, branch_id, settlement_currency: settlement,
        fx_snapshot: snap, status: "calculated", total_settlement: grandTotal,
        calculated_at: new Date().toISOString(), calculated_by: callerId,
      }).select("id").single();
      if (insErr) return json({ error: insErr.message }, 400);
      runId = ins.id;
    }

    // write line items
    const rows: any[] = [];
    for (const [cid, v] of Object.entries(perCounselor)) {
      for (const ln of v.lines) {
        rows.push({
          run_id: runId, counselor_id: cid,
          source_type: ln.source_type, slab_id: ln.slab_id ?? null,
          source_payment_id: ln.source_payment_id ?? null,
          source_invoice_id: ln.source_invoice_id ?? null,
          source_commission_id: ln.source_commission_id ?? null,
          client_id: ln.client_id ?? null,
          base_amount: ln.base_amount ?? 0, base_currency: ln.base_currency ?? settlement,
          fx_rate_used: ln.fx_rate_used ?? null,
          earned_amount: ln.earned_amount ?? 0, settlement_currency: settlement,
          note: ln.note ?? null,
        });
      }
    }
    if (rows.length) {
      // chunk inserts to stay well under limits
      for (let i = 0; i < rows.length; i += 500) {
        const { error: liErr } = await svc.from("incentive_line_items").insert(rows.slice(i, i + 500));
        if (liErr) return json({ error: liErr.message }, 400);
      }
    }

    await svc.from("activity_logs").insert({
      user_id: callerId, action: "incentive_run_calculated", entity_type: "incentive_run",
      entity_id: runId, details: { plan_id, period_key, branch_id, grand_total: grandTotal, counselors: summary.length },
    });

    return json({ ok: true, action, run_id: runId, period_key, branch_id, settlement, summary, grand_total: grandTotal });
  } catch (e) {
    return json({ error: String((e as Error)?.message ?? e) }, 500);
  }
});
