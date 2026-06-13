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

function fxPurposePriority(purpose: string | null | undefined, preferred: string): number {
  const p = (purpose ?? "general").toLowerCase();
  if (p === preferred) return 0;
  if (p === "general") return 1;
  return 2;
}

function effectiveFxFromRow(r: {
  base_rate_to_inr?: number | null;
  rate_to_inr?: number | null;
  buffer_fixed?: number | null;
  buffer_pct?: number | null;
}): number {
  const base = Number(r.base_rate_to_inr ?? r.rate_to_inr ?? 0);
  let eff = base;
  if (Number(r.buffer_pct ?? 0) > 0) {
    eff = base * (1 + Number(r.buffer_pct) / 100);
  } else {
    eff = base + Number(r.buffer_fixed ?? 2);
  }
  return Math.round(eff * 10000) / 10000;
}

// ---- load effective FX snapshot (purpose-specific, fall back to general) ----
async function loadFxSnapshot(
  svc: Svc,
  period_key: string,
  purpose = "incentive_settlement",
): Promise<Record<string, number>> {
  const { data, error } = await svc
    .from("fx_rates")
    .select("currency, rate_to_inr, base_rate_to_inr, buffer_fixed, buffer_pct, period_key, rate_purpose")
    .lte("period_key", period_key)
    .or(`rate_purpose.eq.${purpose},rate_purpose.eq.general,rate_purpose.is.null`)
    .order("period_key", { ascending: false });
  if (error) throw error;
  const byCur: Record<string, any> = {};
  for (const r of (data ?? []) as any[]) {
    const cur = String(r.currency ?? "").toUpperCase();
    if (!cur) continue;
    const existing = byCur[cur];
    if (!existing) {
      byCur[cur] = r;
      continue;
    }
    const rp = fxPurposePriority(r.rate_purpose, purpose);
    const ep = fxPurposePriority(existing.rate_purpose, purpose);
    if (rp < ep || (rp === ep && String(r.period_key) > String(existing.period_key))) {
      byCur[cur] = r;
    }
  }
  const snap: Record<string, number> = { INR: 1.0 };
  for (const [cur, r] of Object.entries(byCur)) {
    snap[cur] = effectiveFxFromRow(r);
  }
  return snap;
}

function resolveCounselor(c: {
  closing_counselor_id?: string | null;
  assigned_counselor_id?: string | null;
  owner_id?: string | null;
}): string | null {
  return c.closing_counselor_id ?? c.assigned_counselor_id ?? c.owner_id ?? null;
}

function classifyMasterKey(master?: string | null): string {
  const m = (master ?? "").toLowerCase();
  if (m === "allied_services" || m === "travel_financial") return "ancillary";
  return "service_revenue";
}

function discountPenaltyMultiplier(pct: number): number {
  if (pct <= 5) return 1;
  if (pct <= 10) return 0.9;
  if (pct <= 15) return 0.75;
  return 0;
}

function convert(amount: number, from: string, to: string, snap: Record<string, number>): number | null {
  if (amount == null) return null;
  if (from === to) return amount;
  const rf = from === "INR" ? 1 : snap[from];
  const rt = to === "INR" ? 1 : snap[to];
  if (rf == null || rt == null || rt === 0) return null;
  return Math.round(((amount * rf) / rt) * 100) / 100;
}

type RunRow = { id: string; locked: boolean; status: string; calculated_at: string | null };

async function listRunsForScope(
  svc: Svc,
  plan_id: string,
  period_key: string,
  branch_id: string | null,
): Promise<RunRow[]> {
  let q = svc.from("incentive_runs").select("id, locked, status, calculated_at")
    .eq("plan_id", plan_id).eq("period_key", period_key);
  if (branch_id) q = q.eq("branch_id", branch_id);
  else q = q.is("branch_id", null);
  const { data, error } = await q.order("calculated_at", { ascending: false, nullsFirst: false });
  if (error) throw error;
  return (data ?? []) as RunRow[];
}

// ---- scope matching (Phase 1+2) --------------------------------------------
type ScopeJson = {
  master_keys?: string[];
  service_codes?: string[];
  sub_categories?: string[];
  exclude_master_keys?: string[];
  country_codes?: string[];
  country_tags?: string[];
  institution_ids?: string[];
  intakes?: string[];
  program_names?: string[];
};

type LineDims = {
  master_key?: string | null;
  service_code?: string | null;
  sub_category?: string | null;
  country_code?: string | null;
  country_tag?: string | null;
  institution_id?: string | null;
  intake?: string | null;
  program_name?: string | null;
  is_first_payment?: boolean;
};

function normScope(s: string | null | undefined): string {
  return (s ?? "").trim().toLowerCase();
}

function resolveScopePreset(preset: string | null | undefined): ScopeJson {
  switch (preset) {
    case "allied_travel":
      return { master_keys: ["allied_services", "travel_financial"] };
    case "all_allied":
      return { master_keys: ["allied_services"] };
    case "all_travel":
      return { master_keys: ["travel_financial"] };
    case "core_only":
      return { master_keys: ["coaching_services", "visa_immigration", "admission_services"] };
    default:
      return {
        master_keys: [
          "coaching_services", "visa_immigration", "admission_services", "allied_services", "travel_financial",
        ],
      };
  }
}

function mergeScope(preset: string | null | undefined, json: ScopeJson | null | undefined): ScopeJson {
  const base = resolveScopePreset(preset);
  const extra = json ?? {};
  return {
    master_keys: extra.master_keys?.length ? extra.master_keys : base.master_keys,
    service_codes: extra.service_codes,
    sub_categories: extra.sub_categories,
    exclude_master_keys: extra.exclude_master_keys,
    country_codes: extra.country_codes,
    country_tags: extra.country_tags,
    institution_ids: extra.institution_ids,
    intakes: extra.intakes,
    program_names: extra.program_names,
  };
}

function serviceCodeMatches(code: string | null | undefined, filter: string): boolean {
  const c = normScope(code);
  const f = normScope(filter);
  if (!c || !f) return false;
  return c === f || c.startsWith(f + "::") || c.split("::")[0] === f;
}

function matchesScope(scope: ScopeJson, dims: LineDims, requireFirst = false): boolean {
  if (requireFirst && dims.is_first_payment === false) return false;
  const mk = normScope(dims.master_key);
  if (scope.exclude_master_keys?.some((x) => normScope(x) === mk)) return false;
  if (scope.master_keys?.length && !scope.master_keys.some((x) => normScope(x) === mk)) return false;
  if (scope.service_codes?.length && !scope.service_codes.some((f) => serviceCodeMatches(dims.service_code, f))) return false;
  if (scope.sub_categories?.length && !scope.sub_categories.some((x) => normScope(x) === normScope(dims.sub_category))) return false;
  if (scope.country_codes?.length && !scope.country_codes.some((x) => normScope(x) === normScope(dims.country_code))) return false;
  if (scope.country_tags?.length && !scope.country_tags.some((x) => normScope(x) === normScope(dims.country_tag))) return false;
  if (scope.institution_ids?.length && !scope.institution_ids.some((x) => normScope(x) === normScope(dims.institution_id))) return false;
  if (scope.intakes?.length && !scope.intakes.some((x) => normScope(x) === normScope(dims.intake))) return false;
  if (scope.program_names?.length && !scope.program_names.some((x) => normScope(x) === normScope(dims.program_name))) return false;
  return true;
}

function matchesServiceFilter(filter: string | null | undefined, dims: LineDims): boolean {
  const f = (filter ?? "").trim();
  if (!f) return true;
  if (normScope(dims.master_key) === normScope(f)) return true;
  return serviceCodeMatches(dims.service_code, f);
}

// ---- slab application ------------------------------------------------------
// Given a metric value (count or revenue in settlement ccy) and the slabs for
// a source_type, compute earned amount in settlement currency.
interface Slab {
  id: string; source_type: string; service_filter: string | null; rule_id?: string | null;
  metric: string; rate_type: string;
  min_threshold: number; max_threshold: number | null; rate_value: number;
  sort_order: number;
}

interface IncentiveRule {
  id: string; name: string; is_active: boolean;
  scope_preset: string | null; scope_json: ScopeJson;
  source_type: string; metric: string; rate_type: string; rate_value: number;
  milestone: string | null; settlement_currency: string | null;
}

function slabGroupKey(s: Slab): string {
  return `${s.source_type}|${(s.service_filter ?? "").trim()}`;
}

function applyRuleRate(rule: IncentiveRule, revenue: number, count: number): number {
  switch (rule.rate_type) {
    case "percent":
      return Math.round((revenue * rule.rate_value) / 100 * 100) / 100;
    case "flat":
      return count > 0 ? rule.rate_value : 0;
    case "per_unit":
      return Math.round(count * rule.rate_value * 100) / 100;
    default:
      return 0;
  }
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

    // Role-scoped plans: only counselors with matching app role earn
    let roleEligible: Set<string> | null = null;
    if (plan.scope_type === "role" && plan.role_key) {
      const { data: roleRows } = await svc
        .from("user_roles")
        .select("user_id")
        .eq("role", plan.role_key);
      roleEligible = new Set((roleRows ?? []).map((r: { user_id: string }) => r.user_id));
    }
    const counselorInPlan = (cid: string | null | undefined): boolean =>
      !!cid && (!roleEligible || roleEligible.has(cid));

    // --- LOCK path: snapshot plan version + freeze run ---
    if (action === "lock") {
      const { data: readiness, error: readyErr } = await svc.rpc("fn_period_lock_readiness", {
        _period_key: period_key,
      });
      if (readyErr) return json({ error: readyErr.message }, 500);
      if (readiness && (readiness as { can_lock?: boolean }).can_lock === false) {
        const blockers = ((readiness as { blockers?: string[] }).blockers ?? []) as string[];
        return json({
          error: blockers.length
            ? `Period not ready to lock: ${blockers.join("; ")}`
            : "Period not ready to lock — clear open queues first.",
          blockers,
        }, 409);
      }

      const snap = await loadFxSnapshot(svc, period_key);
      const runs = await listRunsForScope(svc, plan_id, period_key, branch_id);
      if (runs.some((r) => r.locked)) {
        return json({ error: "A locked run already exists for this plan/period." }, 409);
      }
      const target = runs.find((r) => r.status === "calculated" && !r.locked);
      if (!target) {
        return json({ error: "No calculated run found — run Calculate & save first." }, 400);
      }

      let planVersionId: string | null = null;
      const { data: verId } = await svc.rpc("fn_snapshot_incentive_plan_version", {
        _plan_id: plan_id,
        _period_key: period_key,
        _created_by: callerId,
      });
      if (verId) planVersionId = verId as string;

      const { data: run, error: runErr } = await svc
        .from("incentive_runs")
        .update({
          status: "approved",
          locked: true,
          fx_snapshot: snap,
          plan_version_id: planVersionId,
          approved_by: callerId,
          approved_at: new Date().toISOString(),
        })
        .eq("id", target.id)
        .select().single();
      if (runErr) return json({ error: runErr.message }, 400);
      return json({ ok: true, action, run, plan_version_id: planVersionId });
    }

    // --- compute path (preview or calculate) ---
    const { start, end } = periodRange(period_key);
    const snap = await loadFxSnapshot(svc, period_key);

    // slabs + rules for this plan
    const { data: slabsRaw } = await svc.from("incentive_slabs").select("*").eq("plan_id", plan_id);
    const slabs = (slabsRaw ?? []) as Slab[];
    const legacySlabs = slabs.filter((s) => !s.rule_id);

    const { data: rulesRaw } = await svc.from("incentive_rules").select("*").eq("plan_id", plan_id).eq("is_active", true);
    const rules = ((rulesRaw ?? []) as IncentiveRule[]).sort((a, b) => (a as any).sort_order - (b as any).sort_order);

    // targets for bonus (period + optional plan)
    const { data: targetsRaw } = await svc
      .from("incentive_targets")
      .select("*")
      .eq("period_key", period_key)
      .or(`plan_id.eq.${plan_id},plan_id.is.null`);

    // counselors in scope — closer-wins attribution
    let branchName: string | null = null;
    if (branch_id) {
      const { data: br } = await svc.from("branches").select("name").eq("id", branch_id).maybeSingle();
      branchName = (br as any)?.name ?? null;
    }

    let clientQ = svc.from("clients").select(
      "id, assigned_counselor_id, owner_id, closing_counselor_id, branch",
    );
    if (branchName) clientQ = clientQ.eq("branch", branchName);
    const { data: clients } = await clientQ;
    const clientList = (clients ?? []) as any[];
    const clientToCounselor: Record<string, string> = {};
    for (const c of clientList) {
      const cid = resolveCounselor(c);
      if (counselorInPlan(cid)) clientToCounselor[c.id] = cid!;
    }
    const clientIds = clientList.map((c) => c.id);

    // client dimension enrichment (country, institution, intake, program)
    const clientDims: Record<string, LineDims> = {};
    if (clientIds.length) {
      const [{ data: progs }, { data: commRows }] = await Promise.all([
        svc.from("cf_client_programs").select("client_id, country_code, course_id").in("client_id", clientIds).eq("is_primary", true),
        svc.from("upi_commission_students").select("client_id, institution_id, program_name, intake_term, intake_year").in("client_id", clientIds),
      ]);
      for (const cid of clientIds) clientDims[cid] = {};
      for (const p of (progs ?? []) as any[]) {
        clientDims[p.client_id] = { ...clientDims[p.client_id], country_code: p.country_code };
      }
      for (const u of (commRows ?? []) as any[]) {
        const intake = [u.intake_term, u.intake_year].filter(Boolean).join("-");
        clientDims[u.client_id] = {
          ...clientDims[u.client_id],
          institution_id: u.institution_id,
          program_name: u.program_name,
          intake: intake || null,
        };
      }
    }

    const serviceSubById: Record<string, string> = {};
    const { data: svcLibRows } = await svc.from("service_library").select("id, service_category, sub_service, service");
    for (const s of (svcLibRows ?? []) as any[]) {
      if (s.id) serviceSubById[s.id] = s.sub_service;
    }

    // ---- verified service/ancillary revenue from payments ----
    type Bucket = { count: number; revenue: number; lines: any[] };
    const slabAcc: Record<string, Record<string, Bucket>> = {}; // counselor -> slabGroupKey
    const ruleAcc: Record<string, Record<string, Bucket>> = {}; // counselor -> rule_id
    const ensureSlab = (cid: string, gk: string): Bucket =>
      ((slabAcc[cid] ||= {})[gk] ||= { count: 0, revenue: 0, lines: [] });
    const ensureRule = (cid: string, rid: string): Bucket =>
      ((ruleAcc[cid] ||= {})[rid] ||= { count: 0, revenue: 0, lines: [] });

    if (clientIds.length) {
      const { data: pays } = await svc
        .from("client_invoice_payments")
        .select("id, client_id, invoice_id, currency, amount, amount_in_inr, paid_at, payment_status, payment_proof_status, archived_at, is_refund")
        .in("client_id", clientIds)
        .or("payment_status.eq.verified,payment_proof_status.eq.verified")
        .neq("payment_status", "rejected")
        .is("archived_at", null)
        .gte("paid_at", start).lt("paid_at", end);

      const invoiceIds = [...new Set((pays ?? []).map((p: any) => p.invoice_id).filter(Boolean))] as string[];
      const invoiceMap: Record<string, { amount: number; currency: string; line_items?: any[] }> = {};
      const walletDiscByInvoice: Record<string, number> = {};
      const serviceMasterByCode: Record<string, string> = {};
      const hadPriorVerified = new Set<string>();
      const seenFirstInPeriod = new Set<string>();

      if (clientIds.length) {
        const { data: priorRows } = await svc
          .from("client_invoice_payments")
          .select("client_id")
          .in("client_id", clientIds)
          .lt("paid_at", start)
          .or("payment_status.eq.verified,payment_proof_status.eq.verified")
          .is("archived_at", null)
          .neq("is_refund", true);
        for (const pr of (priorRows ?? []) as any[]) hadPriorVerified.add(pr.client_id);
      }

      for (const s of (svcLibRows ?? []) as any[]) {
        if (s.id) serviceMasterByCode[s.id] = s.service_category;
        if (s.service) serviceMasterByCode[s.service] = s.service_category;
      }

      if (useNet && invoiceIds.length) {
        const [{ data: invs }, { data: allocs }] = await Promise.all([
          svc.from("client_invoices").select("id, amount, currency, line_items").in("id", invoiceIds),
          svc.from("wallet_allocations")
            .select("invoice_id, amount, currency, status")
            .in("invoice_id", invoiceIds)
            .eq("status", "applied"),
        ]);
        for (const inv of (invs ?? []) as any[]) {
          invoiceMap[inv.id] = {
            amount: Number(inv.amount ?? 0),
            currency: inv.currency ?? "INR",
            line_items: Array.isArray(inv.line_items) ? inv.line_items : [],
          };
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
        let grossSettlement = convert(Number(p.amount), p.currency ?? "INR", settlement, snap);
        if (grossSettlement == null) continue;
        let inSettlement = grossSettlement;

        if (useNet && p.invoice_id && invoiceMap[p.invoice_id]) {
          const inv = invoiceMap[p.invoice_id];
          const invTotal = convert(inv.amount, inv.currency, settlement, snap);
          if (invTotal != null && invTotal > 0) {
            const share = inSettlement / invTotal;
            const walletDisc = (walletDiscByInvoice[p.invoice_id] ?? 0) * share;
            inSettlement = Math.max(0, inSettlement - walletDisc);
          }
        }

        let src = "service_revenue";
        let dims: LineDims = { ...(clientDims[p.client_id] ?? {}) };
        if (p.invoice_id && invoiceMap[p.invoice_id]?.line_items?.length) {
          const firstLine = invoiceMap[p.invoice_id].line_items[0];
          const code = firstLine?.service_code ?? firstLine?.service_id;
          const mk = firstLine?.master_key ?? (code ? serviceMasterByCode[code] ?? serviceMasterByCode[code.split("::")[0]] : null);
          src = classifyMasterKey(mk);
          dims = {
            ...dims,
            master_key: mk,
            service_code: code,
            sub_category: code ? serviceSubById[code.split("::")[0]] ?? null : null,
          };
        }
        const isFirst = !hadPriorVerified.has(p.client_id) && !seenFirstInPeriod.has(p.client_id);
        dims.is_first_payment = isFirst;
        if (isFirst) seenFirstInPeriod.add(p.client_id);

        const lineRec = {
          source_type: src, source_payment_id: p.id, source_invoice_id: p.invoice_id,
          client_id: p.client_id, base_amount: Number(p.amount), base_currency: p.currency ?? "INR",
          fx_rate_used: p.currency === "INR" ? 1 : snap[p.currency] ?? null,
          settlement_amount: inSettlement,
          gross_settlement: grossSettlement,
          dimensions: dims,
        };

        const legacyGroups = new Set<string>();
        for (const sl of legacySlabs.filter((s) => s.source_type === src)) {
          if (matchesServiceFilter(sl.service_filter, dims)) legacyGroups.add(slabGroupKey(sl));
        }
        if (legacyGroups.size === 0) legacyGroups.add(`${src}|`);

        for (const gk of legacyGroups) {
          const b = ensureSlab(cid, gk);
          b.count += 1;
          b.revenue += inSettlement / legacyGroups.size;
          b.lines.push(lineRec);
        }

        for (const rule of rules) {
          if (rule.source_type !== src) continue;
          const scope = mergeScope(rule.scope_preset, rule.scope_json ?? {});
          if (!matchesScope(scope, dims, rule.milestone === "first_payment")) continue;
          const rb = ensureRule(cid, rule.id);
          rb.count += 1;
          rb.revenue += inSettlement;
          rb.lines.push({ ...lineRec, rule_id: rule.id });
        }
      }
    }

    // ---- commission revenue (direct visa + b2b): commission_status='paid' ----
    {
      const { data: comm } = await svc
        .from("upi_commission_students")
        .select("id, client_id, commission_amount, tuition_currency, commission_status, commission_paid_date, channel_type, partnership_route_id, aggregator_id, institution_id, program_name, intake_term, intake_year")
        .eq("commission_status", "paid")
        .gte("commission_paid_date", start).lt("commission_paid_date", end);
      for (const cm of (comm ?? []) as any[]) {
        const cid = cm.client_id ? clientToCounselor[cm.client_id] : null;
        if (!cid) continue;
        const ruleCcy = settlement;
        const amt = convert(Number(cm.commission_amount ?? 0), cm.tuition_currency ?? "CAD", ruleCcy, snap);
        if (amt == null) continue;
        const ch = (cm.channel_type ?? "").toLowerCase();
        let src = "direct_visa_commission";
        if (ch === "indirect" || cm.aggregator_id) src = "b2b_admission_commission";
        else if (ch === "direct" || ch === "student_direct") src = "direct_visa_commission";
        const intake = [cm.intake_term, cm.intake_year].filter(Boolean).join("-");
        const dims: LineDims = {
          ...(clientDims[cm.client_id] ?? {}),
          institution_id: cm.institution_id ?? clientDims[cm.client_id]?.institution_id,
          program_name: cm.program_name ?? clientDims[cm.client_id]?.program_name,
          intake: intake || clientDims[cm.client_id]?.intake,
          master_key: "admission_services",
        };
        const lineRec = {
          source_type: src, source_commission_id: cm.id, client_id: cm.client_id,
          base_amount: Number(cm.commission_amount ?? 0), base_currency: cm.tuition_currency ?? "CAD",
          fx_rate_used: (cm.tuition_currency ?? "CAD") === "INR" ? 1 : snap[cm.tuition_currency ?? "CAD"] ?? null,
          settlement_amount: amt,
          dimensions: dims,
        };
        const legacyGroups = new Set<string>();
        for (const sl of legacySlabs.filter((s) => s.source_type === src)) {
          if (matchesServiceFilter(sl.service_filter, dims)) legacyGroups.add(slabGroupKey(sl));
        }
        if (legacyGroups.size === 0) legacyGroups.add(`${src}|`);
        for (const gk of legacyGroups) {
          const b = ensureSlab(cid, gk);
          b.count += 1;
          b.revenue += amt / legacyGroups.size;
          b.lines.push(lineRec);
        }
        for (const rule of rules) {
          if (rule.source_type !== src) continue;
          const scope = mergeScope(rule.scope_preset, rule.scope_json ?? {});
          if (!matchesScope(scope, dims, rule.milestone === "commission_paid")) continue;
          const rb = ensureRule(cid, rule.id);
          rb.count += 1;
          rb.revenue += amt;
          rb.lines.push({ ...lineRec, rule_id: rule.id });
        }
      }
    }

    // ---- qualifying events: stage milestones + lead_converted (not payment — handled above) ----
    {
      const qeMilestoneRules = rules.filter((r) =>
        r.milestone && ["offer_received", "visa_lodged", "lead_converted"].includes(r.milestone),
      );
      if (qeMilestoneRules.length) {
        const { data: qeMilestoneRows } = await svc
          .from("incentive_qualifying_events")
          .select("id, event_type, counselor_id, client_id, branch_id, amount, currency, dimensions")
          .eq("period_key", period_key)
          .in("event_type", ["stage_change", "lead_converted"]);

        for (const ev of (qeMilestoneRows ?? []) as any[]) {
          const cid = ev.counselor_id as string;
          if (!counselorInPlan(cid)) continue;
          if (branch_id && ev.branch_id && ev.branch_id !== branch_id) continue;

          let eventMilestone: string | null = null;
          if (ev.event_type === "lead_converted") eventMilestone = "lead_converted";
          else if (ev.event_type === "stage_change") {
            eventMilestone = (ev.dimensions?.milestone as string) ?? null;
          }
          if (!eventMilestone) continue;

          const dims: LineDims = {
            ...(clientDims[ev.client_id] ?? {}),
            ...((ev.dimensions ?? {}) as LineDims),
          };

          for (const rule of qeMilestoneRules) {
            if (rule.milestone !== eventMilestone) continue;
            const scope = mergeScope(rule.scope_preset, rule.scope_json ?? {});
            if (!matchesScope(scope, dims, false)) continue;
            const rb = ensureRule(cid, rule.id);
            rb.count += 1;
            rb.revenue += Number(ev.amount ?? 0);
            rb.lines.push({
              source_type: rule.source_type,
              source_qualifying_event_id: ev.id,
              client_id: ev.client_id,
              base_amount: Number(ev.amount ?? 1),
              base_currency: ev.currency ?? settlement,
              fx_rate_used: null,
              settlement_amount: 0,
              dimensions: dims,
              rule_id: rule.id,
            });
          }
        }
      }
    }

    // ---- apply legacy slabs + rules + target bonus + discount penalty ----
    const counselorGross: Record<string, number> = {};
    const counselorNet: Record<string, number> = {};
    const allCounselors = new Set<string>([...Object.keys(slabAcc), ...Object.keys(ruleAcc)]);

    for (const cid of allCounselors) {
      for (const gk of Object.keys(slabAcc[cid] ?? {})) {
        for (const ln of slabAcc[cid][gk].lines) {
          counselorGross[cid] = (counselorGross[cid] ?? 0) + Number(ln.gross_settlement ?? ln.settlement_amount ?? 0);
          counselorNet[cid] = (counselorNet[cid] ?? 0) + Number(ln.settlement_amount ?? 0);
        }
      }
      for (const rid of Object.keys(ruleAcc[cid] ?? {})) {
        for (const ln of ruleAcc[cid][rid].lines) {
          counselorGross[cid] = (counselorGross[cid] ?? 0) + Number(ln.gross_settlement ?? ln.settlement_amount ?? 0);
          counselorNet[cid] = (counselorNet[cid] ?? 0) + Number(ln.settlement_amount ?? 0);
        }
      }
    }

    const perCounselor: Record<string, { total: number; lines: any[] }> = {};
    for (const cid of allCounselors) {
      perCounselor[cid] = { total: 0, lines: [] };
      let subtotalBeforePenalty = 0;

      for (const gk of Object.keys(slabAcc[cid] ?? {})) {
        const bucket = slabAcc[cid][gk];
        const src = gk.split("|")[0];
        const filter = gk.split("|").slice(1).join("|");
        const groupSlabs = legacySlabs.filter((s) => s.source_type === src && (s.service_filter ?? "").trim() === filter);
        const { earned, slabId } = applySlabs(bucket.revenue, bucket.count, groupSlabs);
        subtotalBeforePenalty += earned;
        for (const ln of bucket.lines) {
          perCounselor[cid].lines.push({
            ...ln, slab_id: slabId, rule_id: null,
            earned_amount: 0,
            settlement_currency: settlement,
          });
        }
        if (earned > 0) {
          perCounselor[cid].lines.push({
            source_type: src, slab_id: slabId, rule_id: null, client_id: null,
            base_amount: bucket.revenue, base_currency: settlement, fx_rate_used: null,
            earned_amount: earned, settlement_currency: settlement,
            note: `Slab [${filter || "all"}] on ${bucket.count} item(s), revenue ${bucket.revenue.toFixed(2)}`,
          });
        }
      }

      for (const rule of rules) {
        const bucket = ruleAcc[cid]?.[rule.id];
        if (!bucket) continue;
        const ruleCcy = rule.settlement_currency ?? settlement;
        let earned = 0;
        if (rule.rate_type === "slab") {
          const ruleSlabs = slabs.filter((s) => s.rule_id === rule.id);
          const rev = ruleCcy === settlement ? bucket.revenue : (convert(bucket.revenue, settlement, ruleCcy, snap) ?? bucket.revenue);
          const res = applySlabs(rev, bucket.count, ruleSlabs);
          earned = res.earned;
          perCounselor[cid].lines.push({
            source_type: rule.source_type, slab_id: res.slabId, rule_id: rule.id, client_id: null,
            base_amount: rev, base_currency: ruleCcy, fx_rate_used: null,
            earned_amount: earned, settlement_currency: ruleCcy,
            note: `Rule "${rule.name}" slab`,
          });
        } else {
          const rev = rule.metric.includes("count") || rule.metric === "enrolment_count"
            ? bucket.count : bucket.revenue;
          earned = applyRuleRate(rule, bucket.revenue, bucket.count);
          if (ruleCcy !== settlement) {
            earned = convert(earned, settlement, ruleCcy, snap) ?? earned;
          }
          perCounselor[cid].lines.push({
            source_type: rule.source_type, slab_id: null, rule_id: rule.id, client_id: null,
            base_amount: rev, base_currency: ruleCcy, fx_rate_used: null,
            earned_amount: earned, settlement_currency: ruleCcy,
            note: `Rule "${rule.name}" ${rule.rate_type}`,
          });
        }
        subtotalBeforePenalty += ruleCcy === settlement ? earned : (convert(earned, ruleCcy, settlement, snap) ?? earned);
        for (const ln of bucket.lines) {
          perCounselor[cid].lines.push({
            ...ln, slab_id: null, earned_amount: 0, settlement_currency: ruleCcy,
          });
        }
      }

      const gross = counselorGross[cid] ?? subtotalBeforePenalty;
      const net = counselorNet[cid] ?? subtotalBeforePenalty;
      const discPct = gross > 0 ? ((gross - net) / gross) * 100 : 0;
      const penalized = Math.round(subtotalBeforePenalty * discountPenaltyMultiplier(discPct) * 100) / 100;
      if (penalized !== subtotalBeforePenalty) {
        perCounselor[cid].lines.push({
          source_type: "service_revenue", slab_id: null, client_id: null,
          base_amount: discPct, base_currency: settlement, fx_rate_used: null,
          earned_amount: penalized - subtotalBeforePenalty, settlement_currency: settlement,
          note: `Discount penalty ${discPct.toFixed(1)}% effective`,
        });
      }
      perCounselor[cid].total += penalized;

      // target bonus
      const tgt = ((targetsRaw ?? []) as any[]).find((t) => t.counselor_id === cid);
      if (tgt?.bonus_rate_type && tgt.bonus_value != null) {
        const achieved = net;
        const targetVal = Number(tgt.target_value) || 0;
        const achPct = targetVal > 0 ? (achieved / targetVal) * 100 : 0;
        const trigger = Number(tgt.bonus_trigger_pct ?? 100);
        if (achPct >= trigger) {
          let bonus = 0;
          if (tgt.bonus_rate_type === "flat") bonus = Number(tgt.bonus_value);
          else if (tgt.bonus_rate_type === "percent") bonus = (achieved * Number(tgt.bonus_value)) / 100;
          bonus = Math.round(bonus * 100) / 100;
          if (bonus > 0) {
            perCounselor[cid].total += bonus;
            perCounselor[cid].lines.push({
              source_type: "service_revenue", slab_id: null, client_id: null,
              base_amount: achieved, base_currency: settlement, fx_rate_used: null,
              earned_amount: bonus, settlement_currency: settlement,
              note: `Target bonus @ ${achPct.toFixed(1)}% achievement`,
            });
          }
        }
      }
    }

    // ---- Phase 3: campaign overlays + branch contests ----
    {
      const { data: qeRows } = await svc
        .from("incentive_qualifying_events")
        .select("counselor_id, branch_id, amount, currency, dimensions")
        .eq("period_key", period_key);

      const { data: campaigns } = await svc
        .from("incentive_campaigns")
        .select("*")
        .eq("period_key", period_key)
        .eq("is_active", true);

      for (const camp of (campaigns ?? []) as any[]) {
        for (const cid of Object.keys(perCounselor)) {
          const matching = ((qeRows ?? []) as any[]).filter((e) => {
            if (e.counselor_id !== cid) return false;
            const d = (e.dimensions ?? {}) as LineDims;
            const scope = mergeScope(camp.scope_preset, camp.scope_json ?? {});
            if (camp.country_code && normScope(d.country_code) !== normScope(camp.country_code)) return false;
            if (camp.institution_id && normScope(d.institution_id) !== normScope(camp.institution_id)) return false;
            if (camp.intake && normScope(d.intake) !== normScope(camp.intake)) return false;
            return matchesScope(scope, d, false);
          });
          if (!matching.length) continue;
          let bonus = 0;
          if (camp.bonus_type === "flat_per_event") {
            bonus = Math.round(matching.length * Number(camp.bonus_value) * 100) / 100;
          } else if (camp.bonus_type === "percent_revenue") {
            const rev = matching.reduce((s: number, e: any) => s + Number(e.amount ?? 0), 0);
            bonus = Math.round((rev * Number(camp.bonus_value)) / 100 * 100) / 100;
          } else if (camp.bonus_type === "pool_fixed") {
            bonus = Number(camp.pool_amount ?? camp.bonus_value);
          }
          if (bonus <= 0) continue;
          const ccy = camp.settlement_currency ?? settlement;
          const inSettlement = ccy === settlement ? bonus : (convert(bonus, ccy, settlement, snap) ?? bonus);
          perCounselor[cid].total += inSettlement;
          perCounselor[cid].lines.push({
            source_type: "service_revenue", slab_id: null, rule_id: null, client_id: null,
            base_amount: matching.length, base_currency: ccy, fx_rate_used: null,
            earned_amount: inSettlement, settlement_currency: settlement,
            note: `Campaign overlay "${camp.name}"`,
          });
        }
      }

      const { data: contests } = await svc
        .from("incentive_branch_contests")
        .select("*")
        .eq("period_key", period_key)
        .eq("is_active", true)
        .eq("status", "active");

      for (const contest of (contests ?? []) as any[]) {
        const { data: cBranches } = await svc
          .from("incentive_contest_branches")
          .select("branch_id")
          .eq("contest_id", contest.id);
        const branchIds = new Set(((cBranches ?? []) as any[]).map((b) => b.branch_id));
        if (!branchIds.size) continue;

        const useCount = contest.metric === "enrolment_count";
        const branchTotals: Record<string, number> = {};
        const branchCounselors: Record<string, Record<string, number>> = {};

        for (const e of (qeRows ?? []) as any[]) {
          if (!e.branch_id || !branchIds.has(e.branch_id)) continue;
          const bid = e.branch_id as string;
          const cid = e.counselor_id as string;
          const add = useCount ? 1 : Number(e.amount ?? 0);
          branchTotals[bid] = (branchTotals[bid] ?? 0) + add;
          (branchCounselors[bid] ||= {})[cid] = (branchCounselors[bid][cid] ?? 0) + add;
        }

        const ranked = Object.entries(branchTotals)
          .map(([branch_id, total]) => ({ branch_id, total }))
          .filter((r) => r.total >= Number(contest.min_branch_total ?? 0))
          .sort((a, b) => b.total - a.total);
        if (!ranked.length) continue;

        const pool = Number(contest.pool_amount ?? 0);
        const contestPayouts: Record<string, number> = {};

        if (contest.winner_mode === "proportional_all") {
          const sum = ranked.reduce((s, r) => s + r.total, 0);
          for (const r of ranked) {
            const branchPool = sum > 0 ? Math.round((pool * (r.total / sum)) * 100) / 100 : 0;
            const counselors = Object.entries(branchCounselors[r.branch_id] ?? {}).map(([counselor_id, total]) => ({ counselor_id, total }));
            const cSum = counselors.reduce((s, c) => s + c.total, 0);
            for (const c of counselors) {
              if (cSum <= 0) continue;
              const share = Math.round((branchPool * (c.total / cSum)) * 100) / 100;
              contestPayouts[c.counselor_id] = (contestPayouts[c.counselor_id] ?? 0) + share;
            }
          }
        } else {
          const winner = ranked[0];
          const counselors = Object.entries(branchCounselors[winner.branch_id] ?? {}).map(([counselor_id, total]) => ({ counselor_id, total }));
          const cSum = counselors.reduce((s, c) => s + c.total, 0);
          if (contest.split_mode === "equal_among_counselors") {
            const each = counselors.length ? Math.round((pool / counselors.length) * 100) / 100 : 0;
            for (const c of counselors) contestPayouts[c.counselor_id] = (contestPayouts[c.counselor_id] ?? 0) + each;
          } else {
            for (const c of counselors) {
              if (cSum <= 0) continue;
              contestPayouts[c.counselor_id] = (contestPayouts[c.counselor_id] ?? 0) + Math.round((pool * (c.total / cSum)) * 100) / 100;
            }
          }
        }

        for (const [cid, amt] of Object.entries(contestPayouts)) {
          if (amt <= 0) continue;
          if (!perCounselor[cid]) perCounselor[cid] = { total: 0, lines: [] };
          perCounselor[cid].total += amt;
          perCounselor[cid].lines.push({
            source_type: "service_revenue", slab_id: null, rule_id: null, client_id: null,
            base_amount: amt, base_currency: contest.settlement_currency ?? settlement, fx_rate_used: null,
            earned_amount: amt, settlement_currency: settlement,
            note: `Branch contest "${contest.name}" pool share`,
          });
        }
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
    const runs = await listRunsForScope(svc, plan_id, period_key, branch_id);
    if (runs.some((r) => r.locked)) {
      return json({
        error: "Run is locked for this plan/period. Corrections must be incentive adjustments (R2), not a recalculate.",
      }, 409);
    }
    const existing = runs.find((r) => !r.locked) ?? null;

    let runId = existing?.id as string | undefined;
    if (runId) {
      const { error: updErr } = await svc.from("incentive_runs").update({
        status: "calculated", settlement_currency: settlement, fx_snapshot: snap,
        total_settlement: grandTotal, calculated_at: new Date().toISOString(), calculated_by: callerId,
      }).eq("id", runId);
      if (updErr) return json({ error: updErr.message }, 400);
      const { error: delErr } = await svc.from("incentive_line_items").delete().eq("run_id", runId);
      if (delErr) return json({ error: delErr.message }, 400);
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
          rule_id: ln.rule_id ?? null,
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
