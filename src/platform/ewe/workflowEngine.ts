/**
 * Enterprise Workflow Engine — configuration-driven, domain-agnostic.
 */
import { DEFAULT_WORKFLOW_DEFINITIONS, type PaymentMethodWorkflowConfig } from "../config/defaultWorkflowConfig";
import { getPaymentMethodConfig, getWorkflowDefinition } from "../config/platformConfigService";
import type {
  WorkflowContext,
  WorkflowDefinition,
  WorkflowInstance,
  WorkflowStepState,
} from "../types/workflow";
import type { BusinessStatus, WorkflowStatus } from "../types/statuses";
import { createBusinessEvent, persistWorkflowInstance } from "../foe/businessEventService";

export interface ResolvedPaymentWorkflow {
  methodConfig: PaymentMethodWorkflowConfig;
  definition: WorkflowDefinition;
  initialBusinessStatus: BusinessStatus;
  initialWorkflowStatus: WorkflowStatus;
  initialLegacyPaymentStatus: "awaiting_verification" | "verified";
}

export function resolvePaymentMethodWorkflow(
  methodCode: string,
  _context?: Partial<WorkflowContext>,
): ResolvedPaymentWorkflow {
  const methodConfig = getPaymentMethodConfig(methodCode);
  const definition =
    getWorkflowDefinition(methodConfig.workflowDefinitionId) ?? DEFAULT_WORKFLOW_DEFINITIONS[0]!;

  return {
    methodConfig,
    definition,
    initialBusinessStatus: methodConfig.initialBusinessStatus,
    initialWorkflowStatus: methodConfig.initialWorkflowStatus,
    initialLegacyPaymentStatus: methodConfig.initialLegacyPaymentStatus,
  };
}

export function isProofRequiredForMethod(methodCode: string): boolean {
  return getPaymentMethodConfig(methodCode).proofRequired;
}

export function initialLegacyPaymentStatusForMethod(
  methodCode: string,
  opts?: { forceAwaiting?: boolean; canApprove?: boolean; adminOverride?: boolean },
): "awaiting_verification" | "verified" {
  const cfg = getPaymentMethodConfig(methodCode);
  if (opts?.forceAwaiting) return "awaiting_verification";
  if (cfg.methodCode === "cash") return "awaiting_verification";
  if (!opts?.canApprove) return "awaiting_verification";
  if (opts?.adminOverride) return cfg.initialLegacyPaymentStatus;
  return cfg.initialLegacyPaymentStatus;
}

export async function startWorkflowForPayment(input: {
  paymentId: string;
  clientId: string;
  method: string;
  amount: number;
  currency: string;
  entityId?: string | null;
  branchId?: string | null;
  recordedByUserId?: string | null;
}): Promise<{ businessEventId: string; instance: WorkflowInstance; stepStates: WorkflowStepState[] }> {
  const resolved = resolvePaymentMethodWorkflow(input.method, {
    paymentMethod: input.method,
    amount: input.amount,
    currency: input.currency,
    entityId: input.entityId,
    branchId: input.branchId,
    recordedByUserId: input.recordedByUserId,
  });

  const event = await createBusinessEvent({
    domain: "money_in",
    eventType: "payment_received",
    sourceModule: "CRM_AR",
    sourceRecordId: input.paymentId,
    entityId: input.entityId,
    branchId: input.branchId,
    createdBy: input.recordedByUserId,
    metadata: {
      client_id: input.clientId,
      method: input.method,
      amount: input.amount,
      currency: input.currency,
      workflow_definition_id: resolved.definition.id,
    },
  });

  const stepStates: WorkflowStepState[] = resolved.definition.steps.map((s, i) => ({
    stepId: s.id,
    status: i === 0 && resolved.definition.approvalMode !== "none" ? "pending" : "skipped",
  }));

  const instance: WorkflowInstance = {
    id: crypto.randomUUID(),
    definitionId: resolved.definition.id,
    businessEventId: event.id,
    domain: "money_in",
    status: "active",
    currentStepIndex: resolved.definition.approvalMode === "none" ? 0 : 0,
    context: {
      paymentMethod: input.method,
      amount: input.amount,
      currency: input.currency,
      entityId: input.entityId,
      branchId: input.branchId,
      recordedByUserId: input.recordedByUserId,
    },
    createdAt: new Date().toISOString(),
  };

  await persistWorkflowInstance(instance, stepStates);

  return { businessEventId: event.id, instance, stepStates };
}

export function workflowStatusAfterVerification(methodCode: string): WorkflowStatus {
  const cfg = getPaymentMethodConfig(methodCode);
  if (cfg.receiptAfterVerification) return "pending_receipt";
  if (cfg.draftJournalAfterReceipt) return "pending_journal_approval";
  return "completed";
}

export function workflowStatusAfterReceipt(): WorkflowStatus {
  return "pending_journal_approval";
}

export function workflowStatusAfterDraftJournal(): WorkflowStatus {
  return "pending_journal_approval";
}

export function workflowStatusAfterJournalPosted(): WorkflowStatus {
  return "completed";
}
