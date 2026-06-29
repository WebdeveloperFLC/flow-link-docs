/**
 * Override workflow within Commercial Agreement Engine.
 * Configuration-driven authority — default Super Admin only; optional Finance Admin.
 */
import { supabase } from "@/integrations/supabase/client";
import { getCommercialAgreementConfig } from "./commercialAgreementEngine";
import type { OverrideRequestInput } from "./types";
import { createBusinessEvent, persistWorkflowInstance } from "../foe/businessEventService";
import type { WorkflowInstance, WorkflowStepState } from "../types/workflow";
import { enqueueWorkItem } from "../workQueue/workQueueEngine";

const OVERRIDE_WORKFLOW_DEFINITION_ID = "customer_ownership_override";

export async function userCanApproveOwnershipOverride(userId: string): Promise<boolean> {
  const config = getCommercialAgreementConfig().overrideAuthority;
  const rolesToCheck = [...config.roles];
  if (config.allowFinanceAdmin) {
    rolesToCheck.push("finance_admin", "accountant", "accounting_admin");
  }

  for (const role of rolesToCheck) {
    if (role === "super_admin") {
      const { data } = await supabase.rpc("has_role", { _uid: userId, _role: "admin" as never });
      if (data) return true;
    }
    const { data } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", userId)
      .eq("role", role as never)
      .maybeSingle();
    if (data) return true;
  }

  if (config.allowFinanceAdmin) {
    try {
      const { data } = await supabase.rpc("is_accounting_admin", { _uid: userId });
      if (data) return true;
    } catch {
      /* optional */
    }
  }

  return false;
}

export async function submitOwnershipOverrideRequest(
  input: OverrideRequestInput,
): Promise<{ ok: boolean; requestId?: string; error?: string }> {
  if (!input.businessReason?.trim()) {
    return { ok: false, error: "Business reason is required" };
  }

  const event = await createBusinessEvent({
    domain: "generic",
    eventType: "customer_ownership_override_requested",
    sourceModule: input.sourceModule,
    sourceRecordId: input.sourceRecordId,
    createdBy: input.requestedByUserId,
    metadata: {
      client_id: input.clientId,
      settlement_type: input.settlementType,
      business_reason: input.businessReason.trim(),
    },
  });

  const stepStates: WorkflowStepState[] = [
    { stepId: "review", status: "pending" },
    { stepId: "release", status: "pending" },
  ];

  const instance: WorkflowInstance = {
    id: crypto.randomUUID(),
    definitionId: OVERRIDE_WORKFLOW_DEFINITION_ID,
    businessEventId: event.id,
    domain: "generic",
    status: "active",
    currentStepIndex: 0,
    context: {
      clientId: input.clientId,
      settlementType: input.settlementType,
      requestedByUserId: input.requestedByUserId,
    },
    createdAt: new Date().toISOString(),
  };

  await persistWorkflowInstance(instance, stepStates);

  let requestId: string | null = null;
  try {
    const { data, error } = await supabase
      .from("cae_override_requests" as never)
      .insert({
        client_id: input.clientId,
        settlement_type: input.settlementType,
        source_module: input.sourceModule,
        source_record_id: input.sourceRecordId,
        status: "pending",
        business_reason: input.businessReason.trim(),
        requested_by: input.requestedByUserId,
        business_event_id: event.id,
        workflow_instance_id: instance.id,
        agreement_id: input.agreementId ?? null,
        ownership_snapshot: input.ownershipSnapshot ?? {},
        supporting_document_paths: input.supportingDocumentPaths ?? [],
      } as never)
      .select("id")
      .maybeSingle();
    if (error) throw error;
    requestId = (data as { id: string }).id;
  } catch (e) {
    return { ok: false, error: (e as Error).message };
  }

  await enqueueWorkItem({
    queueDomain: "finance",
    kind: "generic",
    title: "Customer ownership override pending",
    subtitle: `${input.settlementType} · client ${input.clientId.slice(0, 8)}…`,
    businessEventId: event.id,
    sourceModule: input.sourceModule,
    sourceRecordId: input.sourceRecordId,
    link: "/accounting/finance-queue?section=ownership_override",
    metadata: {
      override_request_id: requestId,
      client_id: input.clientId,
      settlement_type: input.settlementType,
    },
  });

  return { ok: true, requestId: requestId ?? undefined };
}

export async function approveOwnershipOverride(input: {
  requestId: string;
  approverUserId: string;
}): Promise<{ ok: boolean; error?: string }> {
  const allowed = await userCanApproveOwnershipOverride(input.approverUserId);
  if (!allowed) {
    return { ok: false, error: "Only authorized administrators may approve ownership overrides" };
  }

  const { error } = await supabase
    .from("cae_override_requests" as never)
    .update({
      status: "approved",
      approved_by: input.approverUserId,
      approved_at: new Date().toISOString(),
    } as never)
    .eq("id", input.requestId)
    .eq("status", "pending");

  if (error) return { ok: false, error: error.message };

  try {
    await createBusinessEvent({
      domain: "generic",
      eventType: "customer_ownership_override_approved",
      sourceModule: "CAE",
      sourceRecordId: input.requestId,
      createdBy: input.approverUserId,
    });
  } catch {
    /* best-effort */
  }

  return { ok: true };
}
