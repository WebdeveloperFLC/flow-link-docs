import { useSyncExternalStore } from "react";
import { supabase } from "@/integrations/supabase/client";
import { runWhenAuthReady } from "./_hydrationGate";
import { postPayrollAccrual, postPayrollPayment } from "../lib/payrollPosting";

export interface PayrollBatch {
  id: string;
  entityId: string;
  branchId: string;
  country: string;
  periodLabel: string;
  periodStart: string;
  periodEnd: string;
  postingDate: string;
  currency: string;
  grossTotal: number;
  deductionsTotal: number;
  employerCostTotal: number;
  netTotal: number;
  status: "DRAFT" | "ACCRUED" | "PAID" | "VOIDED";
  accrualJournalId?: string | null;
  paymentJournalId?: string | null;
  attachmentPath?: string | null;
  bankRoleKey: string;
  createdAt: string;
}

export interface PayrollComponent {
  id: string;
  batchId: string;
  roleKey: string;
  drCr: "DR" | "CR";
  amount: number;
  label?: string | null;
  legOrder: number;
}

let batches: PayrollBatch[] = [];
let componentsByBatch = new Map<string, PayrollComponent[]>();
const listeners = new Set<() => void>();
function emit() { listeners.forEach((l) => l()); }

function batchFromDb(row: any): PayrollBatch {
  return {
    id: row.id,
    entityId: row.entity_id,
    branchId: row.branch_id,
    country: row.country,
    periodLabel: row.period_label,
    periodStart: row.period_start,
    periodEnd: row.period_end,
    postingDate: row.posting_date,
    currency: row.currency,
    grossTotal: Number(row.gross_total) || 0,
    deductionsTotal: Number(row.deductions_total) || 0,
    employerCostTotal: Number(row.employer_cost_total) || 0,
    netTotal: Number(row.net_total) || 0,
    status: row.status,
    accrualJournalId: row.accrual_journal_id,
    paymentJournalId: row.payment_journal_id,
    attachmentPath: row.attachment_path,
    bankRoleKey: row.bank_role_key || "BANK_OPERATING",
    createdAt: row.created_at,
  };
}

async function refreshPayroll() {
  try {
    const { data, error } = await supabase
      .from("accounting_payroll_batches")
      .select("*, accounting_payroll_components(*)")
      .order("created_at", { ascending: false })
      .limit(200);
    if (error) throw error;
    batches = (data ?? []).map(batchFromDb);
    const compMap = new Map<string, PayrollComponent[]>();
    for (const row of data ?? []) {
      compMap.set(
        row.id,
        ((row.accounting_payroll_components ?? []) as any[]).map((c) => ({
          id: c.id,
          batchId: c.batch_id,
          roleKey: c.role_key,
          drCr: c.dr_cr,
          amount: Number(c.amount) || 0,
          label: c.label,
          legOrder: c.leg_order ?? 0,
        })).sort((a, b) => a.legOrder - b.legOrder),
      );
    }
    componentsByBatch = compMap;
    emit();
  } catch (e) {
    console.warn("[payrollStore] refresh failed", e);
  }
}
runWhenAuthReady(refreshPayroll);

export function usePayrollBatches(): PayrollBatch[] {
  return useSyncExternalStore(
    (l) => { listeners.add(l); return () => listeners.delete(l); },
    () => batches,
    () => batches,
  );
}

export const getPayrollBatch = (id: string) => batches.find((b) => b.id === id);
export const getPayrollComponents = (batchId: string) => componentsByBatch.get(batchId) ?? [];

export async function accruePayrollBatch(batchId: string) {
  await postPayrollAccrual(batchId);
  await refreshPayroll();
}

export async function payPayrollBatch(batchId: string) {
  await postPayrollPayment(batchId);
  await refreshPayroll();
}

export { refreshPayroll };
