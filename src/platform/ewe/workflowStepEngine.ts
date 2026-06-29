/**
 * Workflow step persistence — sequential / parallel step advancement.
 * Domain-agnostic; consumed by EWE and future HR/Payroll workflows.
 */
import { supabase } from "@/integrations/supabase/client";
import type { WorkflowDefinition, WorkflowInstance, WorkflowStepState } from "../types/workflow";
import { getWorkflowDefinition } from "../config/platformConfigService";

const WF_LS = "platform:workflow_instances:v1";

type StoredInstance = { instance: WorkflowInstance; stepStates: WorkflowStepState[] };

function readLocal(): StoredInstance[] {
  if (typeof window === "undefined") return [];
  try {
    return JSON.parse(window.localStorage.getItem(WF_LS) ?? "[]") as StoredInstance[];
  } catch {
    return [];
  }
}

function writeLocal(rows: StoredInstance[]) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(WF_LS, JSON.stringify(rows.slice(0, 200)));
  } catch {
    /* ignore */
  }
}

function mapDbRow(row: Record<string, unknown>): StoredInstance {
  return {
    instance: {
      id: String(row.id),
      definitionId: String(row.definition_id),
      businessEventId: String(row.business_event_id),
      domain: String(row.domain),
      status: row.status as WorkflowInstance["status"],
      currentStepIndex: Number(row.current_step_index ?? 0),
      context: (row.context as WorkflowInstance["context"]) ?? {},
      createdAt: String(row.created_at ?? new Date().toISOString()),
    },
    stepStates: (row.step_states as WorkflowStepState[]) ?? [],
  };
}

export async function getWorkflowInstanceByBusinessEvent(
  businessEventId: string,
): Promise<StoredInstance | null> {
  try {
    const { data } = await supabase
      .from("platform_workflow_instances" as never)
      .select("*")
      .eq("business_event_id", businessEventId)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (data) return mapDbRow(data as Record<string, unknown>);
  } catch {
    /* fallback */
  }
  return readLocal().find((x) => x.instance.businessEventId === businessEventId) ?? null;
}

export async function getWorkflowInstanceById(instanceId: string): Promise<StoredInstance | null> {
  try {
    const { data } = await supabase
      .from("platform_workflow_instances" as never)
      .select("*")
      .eq("id", instanceId)
      .maybeSingle();
    if (data) return mapDbRow(data as Record<string, unknown>);
  } catch {
    /* fallback */
  }
  return readLocal().find((x) => x.instance.id === instanceId) ?? null;
}

async function persistInstanceUpdate(
  instance: WorkflowInstance,
  stepStates: WorkflowStepState[],
): Promise<void> {
  try {
    const { error } = await supabase
      .from("platform_workflow_instances" as never)
      .update({
        status: instance.status,
        current_step_index: instance.currentStepIndex,
        context: instance.context,
        step_states: stepStates,
        updated_at: new Date().toISOString(),
      } as never)
      .eq("id", instance.id);
    if (!error) return;
  } catch {
    /* fallback */
  }
  const local = readLocal();
  const idx = local.findIndex((x) => x.instance.id === instance.id);
  const row = { instance, stepStates };
  if (idx >= 0) local[idx] = row;
  else local.unshift(row);
  writeLocal(local);
}

function resolveDefinition(definitionId: string): WorkflowDefinition | undefined {
  return getWorkflowDefinition(definitionId);
}

function nextStepIndex(definition: WorkflowDefinition, stepStates: WorkflowStepState[]): number {
  if (definition.approvalMode === "parallel") {
    const pendingIdx = definition.steps.findIndex((s) => {
      const st = stepStates.find((x) => x.stepId === s.id);
      return st?.status === "pending" || st?.status === "in_progress";
    });
    return pendingIdx >= 0 ? pendingIdx : definition.steps.length;
  }
  const firstPending = stepStates.findIndex((s) => s.status === "pending" || s.status === "in_progress");
  return firstPending >= 0 ? firstPending : definition.steps.length;
}

/** Mark a step complete and advance workflow instance. */
export async function completeWorkflowStep(input: {
  businessEventId: string;
  stepId: string;
  actorUserId?: string | null;
  outcome?: "completed" | "skipped" | "rejected";
}): Promise<StoredInstance | null> {
  const stored = await getWorkflowInstanceByBusinessEvent(input.businessEventId);
  if (!stored) return null;

  const { instance, stepStates } = stored;
  const definition = resolveDefinition(instance.definitionId);
  if (!definition) return stored;

  const outcome = input.outcome ?? "completed";
  const updatedStates = stepStates.map((s) =>
    s.stepId === input.stepId
      ? {
          ...s,
          status: outcome,
          completedBy: input.actorUserId ?? null,
          completedAt: new Date().toISOString(),
        }
      : s,
  );

  const allDone = updatedStates.every(
    (s) => s.status === "completed" || s.status === "skipped" || s.status === "rejected",
  );
  const anyRejected = updatedStates.some((s) => s.status === "rejected");

  const nextInstance: WorkflowInstance = {
    ...instance,
    currentStepIndex: nextStepIndex(definition, updatedStates),
    status: anyRejected ? "rejected" : allDone ? "completed" : "active",
  };

  await persistInstanceUpdate(nextInstance, updatedStates);
  return { instance: nextInstance, stepStates: updatedStates };
}

/** Map FOE pipeline milestones to workflow step IDs. */
export async function advanceMoneyInWorkflowStep(input: {
  businessEventId: string;
  milestone: "verified" | "receipt" | "journal_draft" | "journal_posted";
  actorUserId?: string | null;
}): Promise<void> {
  const stepMap: Record<string, string> = {
    verified: "verify",
    receipt: "receipt",
    journal_draft: "journal_draft",
    journal_posted: "journal_approve",
  };
  const stored = await getWorkflowInstanceByBusinessEvent(input.businessEventId);
  if (!stored) return;

  const definition = resolveDefinition(stored.instance.definitionId);
  if (!definition) return;

  const targetStepId = stepMap[input.milestone];
  if (input.milestone === "verified") {
    const verifyStep = definition.steps.find((s) => s.kind === "verification");
    if (verifyStep) {
      await completeWorkflowStep({
        businessEventId: input.businessEventId,
        stepId: verifyStep.id,
        actorUserId: input.actorUserId,
      });
    }
    return;
  }

  if (targetStepId) {
    await completeWorkflowStep({
      businessEventId: input.businessEventId,
      stepId: targetStepId,
      actorUserId: input.actorUserId,
      outcome: "completed",
    });
  }
}

export function getPendingStepLabels(stored: StoredInstance): string[] {
  const definition = resolveDefinition(stored.instance.definitionId);
  if (!definition) return [];
  return stored.stepStates
    .filter((s) => s.status === "pending" || s.status === "in_progress")
    .map((s) => definition.steps.find((d) => d.id === s.stepId)?.label ?? s.stepId);
}
