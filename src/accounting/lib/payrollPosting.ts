import { supabase } from "@/integrations/supabase/client";
import { postJournal, type PostingLeg } from "./journalEngine";
import type { Journal } from "../data/mockJournals";

/**
 * Payroll Posting (Phase 1).
 *
 * Accrual: DR salary & employer-cost expenses
 *          CR deduction payables (CPP/EI/Tax | PF/ESIC/PT/TDS)
 *          CR net payroll payable
 * Payment: DR net payroll payable  CR bank
 *
 * Accrual legs come straight from the batch's posting components so that
 * multi-country deduction structures stay declarative.
 */

const round2 = (n: number) => Math.round((Number(n) || 0) * 100) / 100;

export interface PayrollComponent {
  roleKey: string;
  drCr: "DR" | "CR";
  amount: number;
  label?: string;
}

/** Build accrual legs directly from declarative batch components. */
export function payrollAccrualLegs(components: PayrollComponent[]): PostingLeg[] {
  return components
    .map((c) => ({
      roleKey: c.roleKey,
      drCr: c.drCr,
      amount: round2(c.amount),
      description: c.label || c.roleKey,
    }))
    .filter((l) => l.amount > 0);
}

/** Pay net salaries: DR net payroll payable, CR bank. */
export function payrollPaymentLegs(
  net: number,
  bankRoleKey = "BANK_OPERATING",
  netRoleKey = "NET_PAYROLL_PAYABLE",
): PostingLeg[] {
  const amt = round2(net);
  return [
    { roleKey: netRoleKey, drCr: "DR", amount: amt, description: "Net payroll payable" },
    { roleKey: bankRoleKey, drCr: "CR", amount: amt, description: "Salary payment" },
  ];
}

// ── Orchestration ────────────────────────────────────────────────────

async function loadBatch(batchId: string) {
  const { data, error } = await supabase
    .from("accounting_payroll_batches")
    .select("*, accounting_payroll_components(*)")
    .eq("id", batchId)
    .single();
  if (error) throw error;
  return data as any;
}

/** Post the payroll accrual journal for a batch and mark it ACCRUED. */
export async function postPayrollAccrual(batchId: string): Promise<Journal> {
  const batch = await loadBatch(batchId);
  if (batch.status !== "DRAFT") {
    throw new Error(`Payroll batch is ${batch.status}; only DRAFT batches can be accrued.`);
  }
  const components: PayrollComponent[] = (batch.accounting_payroll_components ?? []).map((c: any) => ({
    roleKey: c.role_key,
    drCr: c.dr_cr,
    amount: Number(c.amount) || 0,
    label: c.label ?? undefined,
  }));
  if (!components.length) throw new Error("Payroll batch has no posting components.");

  const { data: u } = await supabase.auth.getUser();
  const journal = postJournal({
    entityId: batch.entity_id,
    branchId: batch.branch_id,
    currency: batch.currency,
    sourceModule: "PAYROLL",
    sourceRecordId: batchId,
    postingDate: batch.posting_date,
    narration: `Payroll accrual — ${batch.period_label}`,
    legs: payrollAccrualLegs(components),
    attachmentPath: batch.attachment_path ?? undefined,
  });

  await supabase
    .from("accounting_payroll_batches")
    .update({ status: "ACCRUED", accrual_journal_id: journal.id, posted_by: u?.user?.id ?? null } as any)
    .eq("id", batchId);

  return journal;
}

/** Post the net salary payment journal for an accrued batch and mark it PAID. */
export async function postPayrollPayment(batchId: string): Promise<Journal> {
  const batch = await loadBatch(batchId);
  if (batch.status !== "ACCRUED") {
    throw new Error(`Payroll batch is ${batch.status}; only ACCRUED batches can be paid.`);
  }
  const net = round2(Number(batch.net_total) || 0);
  if (net <= 0) throw new Error("Payroll batch has no net amount to pay.");

  const { data: u } = await supabase.auth.getUser();
  const journal = postJournal({
    entityId: batch.entity_id,
    branchId: batch.branch_id,
    currency: batch.currency,
    sourceModule: "PAYROLL",
    sourceRecordId: batchId,
    postingDate: batch.posting_date,
    narration: `Payroll payment — ${batch.period_label}`,
    legs: payrollPaymentLegs(net, batch.bank_role_key || "BANK_OPERATING"),
    attachmentPath: batch.attachment_path ?? undefined,
  });

  await supabase
    .from("accounting_payroll_batches")
    .update({ status: "PAID", payment_journal_id: journal.id, posted_by: u?.user?.id ?? null } as any)
    .eq("id", batchId);

  return journal;
}
