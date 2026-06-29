/**
 * Finance KPI aggregator — reusable for Accounting Overview and future dashboards.
 */
import { supabase } from "@/integrations/supabase/client";
import { loadFinanceQueueCounts } from "../workQueue/financeQueueService";

export interface FinanceOverviewKpis {
  currency: string;
  collectedThisMonth: number;
  collectedYtd: number;
  pendingVerificationCount: number;
  pendingJournalCount: number;
  outstandingAr: number;
  overdueAr: number;
  financeQueueTotal: number;
  verifiedPaymentsCount: number;
}

function monthStartIso(): string {
  const d = new Date();
  return new Date(d.getFullYear(), d.getMonth(), 1).toISOString();
}

function yearStartIso(): string {
  const d = new Date();
  return new Date(d.getFullYear(), 0, 1).toISOString();
}

export async function loadFinanceOverviewKpis(opts?: {
  entityId?: string | null;
  currency?: string;
}): Promise<FinanceOverviewKpis> {
  const currency = opts?.currency ?? "INR";
  const monthStart = monthStartIso();
  const yearStart = yearStartIso();

  const [paymentsRes, invoicesRes, queueCounts] = await Promise.all([
    supabase
      .from("client_invoice_payments")
      .select("amount, amount_in_inr, currency, payment_status, is_refund, paid_at, verified_at")
      .is("archived_at", null)
      .limit(5000),
    supabase
      .from("client_invoices")
      .select("amount, amount_paid, status, due_date, currency, firm_entity_id")
      .is("archived_at", null)
      .limit(5000),
    loadFinanceQueueCounts(),
  ]);

  const payments = (paymentsRes.data ?? []) as {
    amount: number;
    amount_in_inr?: number;
    payment_status?: string;
    is_refund?: boolean;
    paid_at?: string;
    verified_at?: string;
  }[];

  let collectedThisMonth = 0;
  let collectedYtd = 0;
  let pendingVerificationCount = 0;
  let verifiedPaymentsCount = 0;

  for (const p of payments) {
    if (p.is_refund) continue;
    const amt = Number(p.amount_in_inr ?? p.amount ?? 0);
    if (p.payment_status === "awaiting_verification") pendingVerificationCount += 1;
    if (p.payment_status === "verified") {
      verifiedPaymentsCount += 1;
      const ts = p.verified_at ?? p.paid_at;
      if (ts) {
        if (ts >= monthStart) collectedThisMonth += amt;
        if (ts >= yearStart) collectedYtd += amt;
      }
    }
  }

  const invoices = (invoicesRes.data ?? []) as {
    amount: number;
    amount_paid: number;
    status?: string;
    due_date?: string;
    firm_entity_id?: string;
  }[];

  const today = new Date().toISOString().slice(0, 10);
  let outstandingAr = 0;
  let overdueAr = 0;

  for (const inv of invoices) {
    if (opts?.entityId && inv.firm_entity_id && inv.firm_entity_id !== opts.entityId) continue;
    const outstanding = Math.max(Number(inv.amount ?? 0) - Number(inv.amount_paid ?? 0), 0);
    if (outstanding <= 0) continue;
    if (inv.status === "paid" || inv.status === "cancelled") continue;
    outstandingAr += outstanding;
    if (inv.due_date && inv.due_date < today) overdueAr += outstanding;
  }

  return {
    currency,
    collectedThisMonth,
    collectedYtd,
    pendingVerificationCount,
    pendingJournalCount: queueCounts.journal,
    outstandingAr,
    overdueAr,
    financeQueueTotal: queueCounts.total,
    verifiedPaymentsCount,
  };
}

export async function loadPaymentsBySource(): Promise<{ source: string; count: number; total: number }[]> {
  const { data } = await supabase
    .from("client_invoice_payments")
    .select("payment_source, amount, amount_in_inr, is_refund, payment_status")
    .eq("payment_status", "verified")
    .is("archived_at", null)
    .limit(2000);

  const agg = new Map<string, { count: number; total: number }>();
  (data ?? []).forEach((p: Record<string, unknown>) => {
    if (p.is_refund) return;
    const src = String(p.payment_source ?? "manual").replace(/_/g, " ");
    const amt = Number(p.amount_in_inr ?? p.amount ?? 0);
    const cur = agg.get(src) ?? { count: 0, total: 0 };
    agg.set(src, { count: cur.count + 1, total: cur.total + amt });
  });

  return [...agg.entries()].map(([source, v]) => ({ source, ...v })).sort((a, b) => b.total - a.total);
}
