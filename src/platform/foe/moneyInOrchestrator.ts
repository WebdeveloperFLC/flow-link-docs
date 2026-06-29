/**
 * Financial Operations Engine — Money Coming In orchestrator.
 * Chains workflow completion → receipt → draft journal → queue → notifications.
 */
import { supabase } from "@/integrations/supabase/client";
import { appendTimeline } from "@/lib/timeline";
import { createPaymentDraftJournal, getPaymentJournalForSource } from "@/accounting/lib/crmBridge";
import { getPaymentMethodConfig } from "../config/platformConfigService";
import {
  workflowStatusAfterDraftJournal,
  workflowStatusAfterReceipt,
  workflowStatusAfterVerification,
} from "../ewe/workflowEngine";
import { getBusinessEventBySource, linkBusinessEventRecord } from "./businessEventService";
import { generateReceiptForPayment, receiptExistsForPayment } from "./receiptService";
import type { AccountingStatus, BusinessStatus, WorkflowStatus } from "../types/statuses";
import {
  completeWorkItem,
  enqueueFinanceJournalApproval,
  listWorkQueueItems,
} from "../workQueue/workQueueEngine";
import { canUserApproveJournal } from "../ewe/sodEngine";
import { dispatchPlatformNotification } from "../notifications/notificationRouter";
import {
  lockStateAfterJournalApproval,
  lockStateAfterVerification,
} from "../ewe/transactionLockEngine";
import { advanceMoneyInWorkflowStep } from "../ewe/workflowStepEngine";
import { markPipelineJobComplete } from "./pipelineJobService";
import { syncReconciledStatusIfNeeded } from "./bankReconciliationBridge";

export interface FoeOrchestrationResult {
  businessEventId: string | null;
  receiptNumber?: string | null;
  journalId?: string | null;
  businessStatus: BusinessStatus;
  workflowStatus: WorkflowStatus;
  accountingStatus: AccountingStatus;
}

export async function updatePaymentPlatformStatuses(
  paymentId: string,
  patch: {
    business_status?: BusinessStatus;
    workflow_status?: WorkflowStatus;
    accounting_status?: AccountingStatus;
    business_event_id?: string | null;
    lock_state?: string;
    cash_register_id?: string | null;
  },
): Promise<void> {
  const payload: Record<string, unknown> = { ...patch };
  try {
    const { error } = await supabase
      .from("client_invoice_payments")
      .update(payload as never)
      .eq("id", paymentId);
    if (!error) return;
  } catch {
    /* columns may not exist pre-migration */
  }
  // Legacy-only: no-op when columns absent; statuses derived from payment_status + journal lookup
}

export async function onPaymentRecorded(input: {
  paymentId: string;
  clientId: string;
  method: string;
  amount: number;
  currency: string;
  entityId?: string | null;
  branchId?: string | null;
  businessEventId: string;
  recordedByUserId?: string | null;
  clientName?: string | null;
}): Promise<void> {
  const cfg = getPaymentMethodConfig(input.method);
  await updatePaymentPlatformStatuses(input.paymentId, {
    business_event_id: input.businessEventId,
    business_status: cfg.initialBusinessStatus,
    workflow_status: cfg.initialWorkflowStatus,
    accounting_status: "none",
    lock_state: "submitted",
  });

  for (const eventKey of cfg.notifyOnRecord ?? []) {
    await dispatchPlatformNotification({
      eventKey,
      businessEventId: input.businessEventId,
      entityId: input.entityId,
      branchId: input.branchId,
      dedupeKey: `${eventKey}:${input.paymentId}`,
      context: {
        paymentId: input.paymentId,
        clientId: input.clientId,
        clientName: input.clientName,
        amount: input.amount,
        currency: input.currency,
        method: input.method,
      },
    });
  }

  try {
    await appendTimeline({
      clientId: input.clientId,
      eventType: "foe_payment_recorded",
      summary: `Payment recorded — ${input.currency} ${input.amount.toFixed(2)} (${input.method.replace(/_/g, " ")})`,
      metadata: {
        payment_id: input.paymentId,
        business_event_id: input.businessEventId,
        method: input.method,
      },
    });
  } catch {
    /* best-effort */
  }
}

/**
 * Run FOE pipeline after payment verification (or instant-verify methods).
 */
export async function runMoneyInOrchestrator(input: {
  paymentId: string;
  invoiceId: string;
  clientId: string;
  method: string;
  amount: number;
  currency: string;
  entityId?: string | null;
  branchId?: string | null;
  firmEntityId?: string | null;
  verifiedByUserId?: string | null;
}): Promise<FoeOrchestrationResult> {
  const cfg = getPaymentMethodConfig(input.method);
  const event =
    (await getBusinessEventBySource("CRM_AR", input.paymentId)) ??
    null;
  const businessEventId = event?.id ?? null;

  let businessStatus: BusinessStatus = "verified";
  let workflowStatus: WorkflowStatus = workflowStatusAfterVerification(input.method);
  let accountingStatus: AccountingStatus = "none";
  let receiptNumber: string | null = null;
  let journalId: string | null = null;

  if (cfg.receiptAfterVerification) {
    const receipt = await generateReceiptForPayment({
      paymentId: input.paymentId,
      invoiceId: input.invoiceId,
      firmEntityId: input.firmEntityId,
      businessEventId,
    });
    if (receipt.ok) {
      receiptNumber = receipt.receiptNumber;
      businessStatus = "receipt_issued";
      workflowStatus = workflowStatusAfterReceipt();
      if (businessEventId) {
        await linkBusinessEventRecord({
          businessEventId,
          linkType: "receipt",
          recordId: receipt.receiptId,
        });
        await advanceMoneyInWorkflowStep({
          businessEventId,
          milestone: "receipt",
          actorUserId: input.verifiedByUserId,
        });
      }
    }
  }

  if (cfg.draftJournalAfterReceipt) {
    const draft = await createPaymentDraftJournal(input.paymentId, { businessEventId });
    if (draft) {
      journalId = draft.id;
      accountingStatus = cfg.journalApprovalRequired ? "pending_journal_approval" : "draft_journal";
      workflowStatus = workflowStatusAfterDraftJournal();
      if (businessEventId) {
        await linkBusinessEventRecord({ businessEventId, linkType: "journal", recordId: draft.id });
        await advanceMoneyInWorkflowStep({
          businessEventId,
          milestone: "journal_draft",
          actorUserId: input.verifiedByUserId,
        });
      }
      if (cfg.journalApprovalRequired) {
        await enqueueFinanceJournalApproval({
          journalId: draft.id,
          paymentId: input.paymentId,
          businessEventId,
          entityId: input.entityId,
          branchId: input.branchId,
        });
        await dispatchPlatformNotification({
          eventKey: "foe.journal.pending_approval",
          businessEventId,
          dedupeKey: `journal-approval:${input.paymentId}`,
          context: { paymentId: input.paymentId, journalId: draft.id },
        });
      }
    }
  }

  await updatePaymentPlatformStatuses(input.paymentId, {
    business_status: businessStatus,
    workflow_status: workflowStatus,
    accounting_status: accountingStatus,
    lock_state: lockStateAfterVerification(),
    business_event_id: businessEventId,
  });

  if (businessEventId) {
    await advanceMoneyInWorkflowStep({
      businessEventId,
      milestone: "verified",
      actorUserId: input.verifiedByUserId,
    });
  }

  await markPipelineJobComplete(input.paymentId);
  await syncReconciledStatusIfNeeded(input.paymentId);

  // Complete open verification queue items
  const openItems = await listWorkQueueItems({
    queueDomain: "finance",
    status: "open",
  });
  for (const item of openItems.filter((x) => x.sourceRecordId === input.paymentId)) {
    await completeWorkItem(item.id);
  }

  try {
    await appendTimeline({
      clientId: input.clientId,
      eventType: "foe_accounting_pipeline",
      summary: `FOE: receipt ${receiptNumber ?? "—"} · journal ${journalId ? "draft created" : "pending"}`,
      metadata: {
        payment_id: input.paymentId,
        business_event_id: businessEventId,
        receipt_number: receiptNumber,
        journal_id: journalId,
        accounting_status: accountingStatus,
      },
    });
  } catch {
    /* best-effort */
  }

  return {
    businessEventId,
    receiptNumber,
    journalId,
    businessStatus,
    workflowStatus,
    accountingStatus,
  };
}

export async function resolveAccountingStatusForPayment(paymentId: string): Promise<AccountingStatus> {
  const journal = await getPaymentJournalForSource(paymentId);
  if (!journal) return "none";
  if (journal.status === "DRAFT") return "pending_journal_approval";
  if (journal.status === "POSTED") return "posted";
  return "draft_journal";
}

export async function onJournalApprovedForPayment(paymentId: string): Promise<void> {
  await updatePaymentPlatformStatuses(paymentId, {
    accounting_status: "posted",
    workflow_status: "completed",
    business_status: "closed",
    lock_state: lockStateAfterJournalApproval(),
  });
}

export async function approveMoneyInJournal(
  paymentId: string,
  actorUserId?: string | null,
): Promise<{ ok: boolean; error?: string }> {
  const { data: u } = await supabase.auth.getUser();
  const uid = actorUserId ?? u?.user?.id ?? null;
  if (!uid) return { ok: false, error: "Not authenticated" };

  const { data: pay } = await supabase
    .from("client_invoice_payments")
    .select("posted_by, verified_by")
    .eq("id", paymentId)
    .maybeSingle();

  const sod = canUserApproveJournal({
    actorUserId: uid,
    verifiedByUserId: (pay as { verified_by?: string } | null)?.verified_by,
    postedByUserId: (pay as { posted_by?: string } | null)?.posted_by,
  });
  if (!sod.allowed) {
    return { ok: false, error: sod.violation?.message ?? "Separation of duties violation" };
  }

  const { approveAndPostPaymentJournal } = await import("@/accounting/lib/crmBridge");
  const journal = await approveAndPostPaymentJournal(paymentId);
  if (!journal) return { ok: false, error: "Journal not found or already posted" };

  await onJournalApprovedForPayment(paymentId);

  const event = await getBusinessEventBySource("CRM_AR", paymentId);
  if (event?.id) {
    await advanceMoneyInWorkflowStep({
      businessEventId: event.id,
      milestone: "journal_posted",
      actorUserId: uid,
    });
  }

  const openItems = await listWorkQueueItems({ queueDomain: "finance", status: "open" });
  for (const item of openItems.filter(
    (x) => x.sourceRecordId === paymentId && x.kind === "pending_journal_approval",
  )) {
    await completeWorkItem(item.id);
  }

  try {
    const { data: payRow } = await supabase
      .from("client_invoice_payments")
      .select("client_id")
      .eq("id", paymentId)
      .maybeSingle();
    if (payRow?.client_id) {
      await appendTimeline({
        clientId: payRow.client_id as string,
        eventType: "foe_journal_posted",
        summary: `Journal posted for payment ${paymentId.slice(0, 8)}…`,
        metadata: { payment_id: paymentId, journal_id: journal.id },
      });
    }
  } catch {
    /* best-effort */
  }

  return { ok: true };
}

export { receiptExistsForPayment };
