/**
 * Bank reconciliation bridge — maps bank_reconciled payment flag to accounting status.
 * Reusable for treasury / banking workflows.
 */
import { supabase } from "@/integrations/supabase/client";
import type { AccountingStatus } from "../types/statuses";
import { updatePaymentPlatformStatuses } from "./moneyInOrchestrator";

export async function markPaymentBankReconciled(input: {
  paymentId: string;
  actorUserId: string;
}): Promise<{ ok: boolean; error?: string }> {
  const { data: pay, error } = await supabase
    .from("client_invoice_payments")
    .select("id, payment_status, accounting_status, bank_reconciled")
    .eq("id", input.paymentId)
    .maybeSingle();

  if (error || !pay) return { ok: false, error: error?.message ?? "Payment not found" };
  if ((pay as { payment_status?: string }).payment_status !== "verified") {
    return { ok: false, error: "Payment must be verified before bank reconciliation" };
  }

  const acctStatus = (pay as { accounting_status?: string }).accounting_status;
  if (acctStatus && acctStatus !== "posted" && acctStatus !== "reconciled") {
    return { ok: false, error: "Journal must be posted before bank reconciliation" };
  }

  const { error: updErr } = await supabase
    .from("client_invoice_payments")
    .update({
      bank_reconciled: true,
      bank_reconciled_at: new Date().toISOString(),
      bank_reconciled_by: input.actorUserId,
    } as never)
    .eq("id", input.paymentId);

  if (updErr) return { ok: false, error: updErr.message };

  await updatePaymentPlatformStatuses(input.paymentId, {
    accounting_status: "reconciled",
    lock_state: "reconciled",
  });

  return { ok: true };
}

export function accountingStatusWithBankReconcile(
  base: AccountingStatus,
  bankReconciled: boolean | null | undefined,
): AccountingStatus {
  if (bankReconciled && (base === "posted" || base === "reconciled")) return "reconciled";
  return base;
}

export async function isPaymentBankReconciled(paymentId: string): Promise<boolean> {
  const { data } = await supabase
    .from("client_invoice_payments")
    .select("bank_reconciled")
    .eq("id", paymentId)
    .maybeSingle();
  return !!(data as { bank_reconciled?: boolean } | null)?.bank_reconciled;
}

/** Sync platform lock state when payment already reconciled in legacy column. */
export async function syncReconciledStatusIfNeeded(paymentId: string): Promise<void> {
  const reconciled = await isPaymentBankReconciled(paymentId);
  if (!reconciled) return;
  await updatePaymentPlatformStatuses(paymentId, {
    accounting_status: "reconciled",
    lock_state: "reconciled",
  });
}
