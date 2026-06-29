/**
 * Idempotent retry for incomplete FOE pipelines (e.g. verify succeeded but receipt/journal failed).
 */
import { supabase } from "@/integrations/supabase/client";
import { getPaymentJournalForSource } from "@/accounting/lib/crmBridge";
import { receiptExistsForPayment } from "./receiptService";
import { runMoneyInOrchestrator } from "./moneyInOrchestrator";

export async function retryMoneyInPipeline(paymentId: string): Promise<boolean> {
  const { data: pay, error } = await supabase
    .from("client_invoice_payments")
    .select("id, client_id, invoice_id, method, amount, currency, payment_status, invoice:client_invoices(firm_entity_id, branch_id)")
    .eq("id", paymentId)
    .maybeSingle();
  if (error || !pay) return false;
  if ((pay as { payment_status?: string }).payment_status !== "verified") return false;

  const hasReceipt = await receiptExistsForPayment(paymentId);
  const journal = await getPaymentJournalForSource(paymentId);
  if (hasReceipt && journal) return true;

  const inv = (pay as { invoice?: { firm_entity_id?: string; branch_id?: string } }).invoice;
  await runMoneyInOrchestrator({
    paymentId,
    invoiceId: String((pay as { invoice_id: string }).invoice_id),
    clientId: String((pay as { client_id: string }).client_id),
    method: String((pay as { method?: string }).method ?? "bank_transfer"),
    amount: Number((pay as { amount: number }).amount),
    currency: String((pay as { currency: string }).currency),
    entityId: inv?.firm_entity_id ?? null,
    branchId: inv?.branch_id ?? null,
    firmEntityId: inv?.firm_entity_id ?? null,
  });
  return true;
}
