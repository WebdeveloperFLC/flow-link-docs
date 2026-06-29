/**
 * Commercial Agreement lifecycle — reuses EWE + Business Events.
 * Never edit active agreement terms directly; create new versions instead.
 */
import { supabase } from "@/integrations/supabase/client";
import { createBusinessEvent, persistWorkflowInstance } from "../foe/businessEventService";
import { enqueueWorkItem } from "../workQueue/workQueueEngine";
import type { AgreementLifecycleStatus, CommercialAgreement } from "./types";
import type { WorkflowInstance, WorkflowStepState } from "../types/workflow";

const AGREEMENT_WORKFLOW_DEFINITION_ID = "commercial_agreement_lifecycle";

const VALID_TRANSITIONS: Record<AgreementLifecycleStatus, AgreementLifecycleStatus[]> = {
  draft: ["submitted", "archived"],
  submitted: ["approved", "draft", "archived"],
  approved: ["active", "archived"],
  active: ["suspended", "expired", "superseded", "archived"],
  suspended: ["active", "archived"],
  expired: ["archived"],
  superseded: ["archived"],
  archived: [],
};

export function canTransitionAgreement(
  from: AgreementLifecycleStatus,
  to: AgreementLifecycleStatus,
): boolean {
  return VALID_TRANSITIONS[from]?.includes(to) ?? false;
}

export async function transitionAgreementStatus(input: {
  agreementId: string;
  toStatus: AgreementLifecycleStatus;
  actorUserId: string;
  reason?: string;
}): Promise<{ ok: boolean; error?: string }> {
  try {
    const { data: row, error: fetchErr } = await supabase
      .from("commercial_agreements" as never)
      .select("id, status")
      .eq("id", input.agreementId as never)
      .maybeSingle();
    if (fetchErr || !row) return { ok: false, error: "Agreement not found" };

    const from = (row as { status: AgreementLifecycleStatus }).status;
    if (!canTransitionAgreement(from, input.toStatus)) {
      return { ok: false, error: `Invalid transition: ${from} → ${input.toStatus}` };
    }

    const event = await createBusinessEvent({
      domain: "generic",
      eventType: `cae_agreement_${input.toStatus}`,
      sourceModule: "CAE",
      sourceRecordId: input.agreementId,
      createdBy: input.actorUserId,
      metadata: { from_status: from, to_status: input.toStatus, reason: input.reason ?? null },
    });

    const { error } = await supabase
      .from("commercial_agreements" as never)
      .update({
        status: input.toStatus,
        business_event_id: event.id,
        updated_at: new Date().toISOString(),
      } as never)
      .eq("id", input.agreementId as never);

    if (error) return { ok: false, error: error.message };

    if (input.toStatus === "submitted") {
      await startAgreementApprovalWorkflow(input.agreementId, event.id, input.actorUserId);
    }

    return { ok: true };
  } catch (e) {
    return { ok: false, error: (e as Error).message };
  }
}

async function startAgreementApprovalWorkflow(
  agreementId: string,
  businessEventId: string,
  requestedByUserId: string,
): Promise<void> {
  const stepStates: WorkflowStepState[] = [
    { stepId: "review", status: "pending" },
    { stepId: "approve", status: "pending" },
    { stepId: "activate", status: "pending" },
  ];

  const instance: WorkflowInstance = {
    id: crypto.randomUUID(),
    definitionId: AGREEMENT_WORKFLOW_DEFINITION_ID,
    businessEventId,
    domain: "generic",
    status: "active",
    currentStepIndex: 0,
    context: { agreementId, requestedByUserId },
    createdAt: new Date().toISOString(),
  };

  await persistWorkflowInstance(instance, stepStates);

  await supabase
    .from("commercial_agreements" as never)
    .update({ workflow_instance_id: instance.id } as never)
    .eq("id", agreementId as never);

  await enqueueWorkItem({
    queueDomain: "finance",
    kind: "generic",
    title: "Commercial agreement pending approval",
    subtitle: `Agreement ${agreementId.slice(0, 8)}…`,
    businessEventId,
    sourceModule: "CAE",
    sourceRecordId: agreementId,
    link: "/accounting/finance-queue?section=commercial_agreements",
    metadata: { agreement_id: agreementId },
  });
}

/** Activate a draft version — supersedes prior active version on same agreement */
export async function activateAgreementVersion(input: {
  agreementId: string;
  versionId: string;
  actorUserId: string;
}): Promise<{ ok: boolean; error?: string }> {
  try {
    const { data: version, error: vErr } = await supabase
      .from("commercial_agreement_versions" as never)
      .select("id, agreement_id, status, version_number")
      .eq("id", input.versionId as never)
      .eq("agreement_id", input.agreementId as never)
      .maybeSingle();
    if (vErr || !version) return { ok: false, error: "Version not found" };

    const event = await createBusinessEvent({
      domain: "generic",
      eventType: "cae_agreement_version_activated",
      sourceModule: "CAE",
      sourceRecordId: input.versionId,
      createdBy: input.actorUserId,
      metadata: {
        agreement_id: input.agreementId,
        version_number: (version as { version_number: number }).version_number,
      },
    });

    await supabase
      .from("commercial_agreement_versions" as never)
      .update({ status: "superseded" } as never)
      .eq("agreement_id", input.agreementId as never)
      .eq("status", "active" as never)
      .neq("id", input.versionId as never);

    await supabase
      .from("commercial_agreement_versions" as never)
      .update({
        status: "active",
        approved_by: input.actorUserId,
        approved_at: new Date().toISOString(),
        business_event_id: event.id,
      } as never)
      .eq("id", input.versionId as never);

    await supabase
      .from("commercial_agreements" as never)
      .update({
        current_version_id: input.versionId,
        status: "active",
        updated_at: new Date().toISOString(),
      } as never)
      .eq("id", input.agreementId as never);

    return { ok: true };
  } catch (e) {
    return { ok: false, error: (e as Error).message };
  }
}

export { VALID_TRANSITIONS };
