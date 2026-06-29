/**
 * Resolves three independent statuses for a CRM payment (DB columns or derived fallback).
 */
import { supabase } from "@/integrations/supabase/client";
import { getPaymentJournalForSource } from "@/accounting/lib/crmBridge";
import { receiptExistsForPayment } from "./receiptService";
import type { AccountingStatus, BusinessStatus, WorkflowStatus } from "../types/statuses";
import { businessStatusFromLegacyPaymentStatus } from "../types/statuses";
import { accountingStatusWithBankReconcile } from "./bankReconciliationBridge";

export interface PaymentPlatformStatuses {
  businessStatus: BusinessStatus;
  workflowStatus: WorkflowStatus;
  accountingStatus: AccountingStatus;
  businessEventId: string | null;
  lockState: string | null;
}

export async function resolvePaymentPlatformStatuses(paymentId: string): Promise<PaymentPlatformStatuses> {
  const { data: pay } = await supabase
    .from("client_invoice_payments")
    .select(
      "payment_status, method, business_status, workflow_status, accounting_status, business_event_id, lock_state, bank_reconciled",
    )
    .eq("id", paymentId)
    .maybeSingle();

  const row = pay as Record<string, unknown> | null;
  if (row?.business_status && row?.workflow_status && row?.accounting_status) {
    const acct = accountingStatusWithBankReconcile(
      row.accounting_status as AccountingStatus,
      row.bank_reconciled as boolean | null | undefined,
    );
    return {
      businessStatus: row.business_status as BusinessStatus,
      workflowStatus: row.workflow_status as WorkflowStatus,
      accountingStatus: acct,
      businessEventId: (row.business_event_id as string) ?? null,
      lockState: (row.lock_state as string) ?? null,
    };
  }

  const legacyStatus = String(row?.payment_status ?? "awaiting_verification");
  const method = String(row?.method ?? "");
  let businessStatus = businessStatusFromLegacyPaymentStatus(legacyStatus, method);
  let workflowStatus: WorkflowStatus = "not_started";
  let accountingStatus: AccountingStatus = "none";

  if (legacyStatus === "awaiting_verification") {
    workflowStatus = method === "cash" ? "pending_cash_verification" : "pending_verification";
  } else if (legacyStatus === "verified") {
    workflowStatus = "pending_receipt";
    const hasReceipt = await receiptExistsForPayment(paymentId);
    if (hasReceipt) {
      businessStatus = "receipt_issued";
      workflowStatus = "pending_journal_approval";
    }
    const journal = await getPaymentJournalForSource(paymentId);
    if (journal?.status === "DRAFT") {
      accountingStatus = "pending_journal_approval";
    } else if (journal?.status === "POSTED") {
      accountingStatus = "posted";
      workflowStatus = "completed";
      businessStatus = "closed";
    } else if (hasReceipt) {
      accountingStatus = "draft_journal";
    }
  }

  accountingStatus = accountingStatusWithBankReconcile(
    accountingStatus,
    row?.bank_reconciled as boolean | null | undefined,
  );

  return {
    businessStatus,
    workflowStatus,
    accountingStatus,
    businessEventId: (row?.business_event_id as string) ?? null,
    lockState: (row?.lock_state as string) ?? null,
  };
}
