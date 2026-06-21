import { supabase } from "@/integrations/supabase/client";
import { HR_ORG_ID } from "./constants";
import type { HrRole } from "./constants";
import { getHrActorInfo, hrAudit } from "./hrApi";
import type { ApprovalRow, TrainingRecordRow } from "./types";

function isSchemaOrRpcError(error: { message?: string; code?: string }): boolean {
  const msg = (error.message ?? "").toLowerCase();
  return (
    isPostgrestSchemaError(error) ||
    (msg.includes("function") && msg.includes("does not exist")) ||
    msg.includes("invalid input value for enum") ||
    error.code === "42883"
  );
}

/** Use app-layer workflow when RPC is missing or permission checks block HR users. */
function shouldUseTrainingAppFallback(error: { message?: string; code?: string }): boolean {
  const msg = (error.message ?? "").toLowerCase();
  return isSchemaOrRpcError(error) || msg.includes("not authorized") || msg.includes("authorized");
}

function isPostgrestSchemaError(error: { message?: string; code?: string }): boolean {
  const msg = (error.message ?? "").toLowerCase();
  return (
    error.code === "PGRST204" ||
    error.code === "42703" ||
    error.code === "42P01" ||
    msg.includes("column") ||
    msg.includes("does not exist") ||
    msg.includes("could not find")
  );
}

export function canBypassTrainingApproval(role: HrRole | null): boolean {
  return role === "Admin" || role === "Super Admin";
}

export type TrainingWorkflowStep =
  | "active"
  | "awaiting_manager"
  | "awaiting_hr"
  | "completed"
  | "rejected"
  | "cancelled";

export function trainingWorkflowStep(status: string): TrainingWorkflowStep {
  switch (status) {
    case "Pending Manager Approval":
      return "awaiting_manager";
    case "Pending HR Approval":
      return "awaiting_hr";
    case "Completed":
      return "completed";
    case "Rejected":
      return "rejected";
    case "Cancelled":
      return "cancelled";
    default:
      return "active";
  }
}

export function trainingWorkflowLabel(step: TrainingWorkflowStep): string {
  switch (step) {
    case "active":
      return "Training in progress";
    case "awaiting_manager":
      return "Waiting for reporting manager approval";
    case "awaiting_hr":
      return "Waiting for HR approval";
    case "completed":
      return "Completed";
    case "rejected":
      return "Rejected";
    case "cancelled":
      return "Cancelled";
  }
}

async function ensureTrainingApprovals(trainingId: string, employeeId: string) {
  const { data: existing } = await supabase
    .from("approvals" as never)
    .select("id, stage, decision")
    .eq("entity_type", "training")
    .eq("entity_id", trainingId);

  if ((existing ?? []).length > 0) return existing as ApprovalRow[];

  const { data: emp } = await supabase
    .from("employees" as never)
    .select("reporting_mgr_id")
    .eq("id", employeeId)
    .maybeSingle();
  const empRow = emp as { reporting_mgr_id?: string | null } | null;
  const skipManager = !empRow?.reporting_mgr_id;

  const rows: Array<Record<string, unknown>> = [];
  if (!skipManager) {
    rows.push({
      org_id: HR_ORG_ID,
      entity_type: "training",
      entity_id: trainingId,
      stage: "Manager",
      decision: "Pending",
    });
  }
  rows.push({
    org_id: HR_ORG_ID,
    entity_type: "training",
    entity_id: trainingId,
    stage: "HR",
    decision: "Pending",
  });

  const { error } = await supabase.from("approvals" as never).insert(rows as never);
  if (error) throw new Error(error.message);

  const { data } = await supabase
    .from("approvals" as never)
    .select("*")
    .eq("entity_type", "training")
    .eq("entity_id", trainingId);
  return (data ?? []) as ApprovalRow[];
}

async function updateTraining(
  trainingId: string,
  patch: Record<string, unknown>,
): Promise<void> {
  const { error } = await supabase
    .from("training_records" as never)
    .update(patch as never)
    .eq("id", trainingId);
  if (!error) return;

  if (!isPostgrestSchemaError(error)) {
    throw new Error(error.message);
  }

  const minimal: Record<string, unknown> = {};
  if ("status" in patch) minimal.status = patch.status;
  if ("duration" in patch) minimal.duration = patch.duration;

  if (Object.keys(minimal).length === 0) {
    throw new Error(
      "Training workflow columns missing — publish Lovable migration 20260724120000_hr_training_completion_workflow.sql",
    );
  }

  const { error: e2 } = await supabase
    .from("training_records" as never)
    .update(minimal as never)
    .eq("id", trainingId);
  if (e2) throw new Error(e2.message);
}

/** Extend training with mandatory reason (RPC or direct update). */
export async function extendTrainingRecord(
  row: TrainingRecordRow,
  extendedUntil: string,
  reason: string,
) {
  const trimmed = reason.trim();
  if (!trimmed) throw new Error("Extension reason is required");
  if (!extendedUntil) throw new Error("Extended until date is required");

  try {
    const { error } = await supabase.rpc("fn_extend_training" as never, {
      p_training_id: row.id,
      p_extended_until: extendedUntil,
      p_reason: trimmed,
    } as never);
    if (!error) {
      await hrAudit("Training Extended", row.employees?.full_name ?? row.id, extendedUntil, trimmed);
      return;
    }
    if (!shouldUseTrainingAppFallback(error)) throw new Error(error.message);
  } catch (e) {
    if (e instanceof Error && !shouldUseTrainingAppFallback({ message: e.message })) throw e;
  }

  const actor = await getHrActorInfo();
  const prevEnd = row.extended_end_date ?? row.end_date;

  await updateTraining(row.id, {
    status: "Extended",
    original_end_date: row.original_end_date ?? row.end_date ?? null,
    extended_end_date: extendedUntil,
    extension_reason: trimmed,
    extended_by_id: actor.id,
    extended_by_label: actor.label,
    extended_at: new Date().toISOString(),
  });

  try {
    await supabase.from("training_extension_history" as never).insert({
      org_id: HR_ORG_ID,
      training_id: row.id,
      original_end_date: row.original_end_date ?? row.end_date ?? null,
      extended_end_date: extendedUntil,
      extension_reason: trimmed,
      extended_by_id: actor.id,
      extended_by_label: actor.label,
    } as never);
  } catch {
    /* history table optional */
  }

  await hrAudit("Training Extended", row.employees?.full_name ?? row.id, extendedUntil, trimmed);
}

/** Mark training completed immediately (Admin / Super Admin only). */
export async function completeTrainingDirect(
  row: TrainingRecordRow,
  completionDate: string,
  reason: string,
) {
  const trimmed = reason.trim();
  if (!trimmed) throw new Error("Completion reason is required");
  if (!completionDate) throw new Error("Completion date is required");

  try {
    const { error } = await supabase.rpc("fn_complete_training_direct" as never, {
      p_training_id: row.id,
      p_completion_date: completionDate,
      p_reason: trimmed,
    } as never);
    if (!error) {
      await hrAudit(
        "Training Completed (Admin)",
        row.employees?.full_name ?? row.id,
        completionDate,
        trimmed,
      );
      return;
    }
    if (!shouldUseTrainingAppFallback(error)) throw new Error(error.message);
  } catch (e) {
    if (e instanceof Error && !shouldUseTrainingAppFallback({ message: e.message })) throw e;
  }

  const actor = await getHrActorInfo();

  await supabase
    .from("approvals" as never)
    .update({
      decision: "Approved",
      acted_at: new Date().toISOString(),
      comment: "Admin direct completion",
    } as never)
    .eq("entity_type", "training")
    .eq("entity_id", row.id)
    .eq("decision", "Pending");

  await updateTraining(row.id, {
    status: "Completed",
    completion_reason: trimmed,
    completion_date: completionDate,
    completion_requested_by_id: actor.id,
    completion_requested_by_label: actor.label,
    completion_requested_at: new Date().toISOString(),
    hr_approved_by_label: actor.label,
    hr_approved_at: new Date().toISOString(),
  });

  await hrAudit(
    "Training Completed (Admin)",
    row.employees?.full_name ?? row.id,
    completionDate,
    trimmed,
  );
}

/** Submit completion for Manager → HR approval chain (or direct if bypassApproval). */
export async function submitTrainingCompletion(
  row: TrainingRecordRow,
  completionDate: string,
  reason: string,
  options?: { bypassApproval?: boolean },
) {
  if (options?.bypassApproval) {
    return completeTrainingDirect(row, completionDate, reason);
  }

  const trimmed = reason.trim();
  if (!trimmed) throw new Error("Completion reason is required");
  if (!completionDate) throw new Error("Completion date is required");

  try {
    const { error } = await supabase.rpc("fn_request_training_completion" as never, {
      p_training_id: row.id,
      p_completion_date: completionDate,
      p_reason: trimmed,
    } as never);
    if (!error) {
      await hrAudit("Training Completion Requested", row.employees?.full_name ?? row.id, completionDate, trimmed);
      return;
    }
    if (!shouldUseTrainingAppFallback(error)) throw new Error(error.message);
  } catch (e) {
    if (e instanceof Error && !shouldUseTrainingAppFallback({ message: e.message })) throw e;
  }

  const actor = await getHrActorInfo();
  const approvals = await ensureTrainingApprovals(row.id, row.employee_id);
  const needsManager = approvals.some((a) => a.stage === "Manager");

  await updateTraining(row.id, {
    status: needsManager ? "Pending Manager Approval" : "Pending HR Approval",
    completion_reason: trimmed,
    completion_date: completionDate,
    completion_requested_by_id: actor.id,
    completion_requested_by_label: actor.label,
    completion_requested_at: new Date().toISOString(),
  });

  await hrAudit("Training Completion Requested", row.employees?.full_name ?? row.id, completionDate, trimmed);
}

async function approveTrainingApp(
  row: TrainingRecordRow,
  decision: "Approved" | "Rejected",
  comment?: string,
) {
  const actor = await getHrActorInfo();
  const approvals = await ensureTrainingApprovals(row.id, row.employee_id);

  if (decision === "Rejected") {
    await supabase
      .from("approvals" as never)
      .update({
        decision: "Rejected",
        acted_at: new Date().toISOString(),
        comment: comment ?? null,
      } as never)
      .eq("entity_type", "training")
      .eq("entity_id", row.id)
      .eq("decision", "Pending");

    await updateTraining(row.id, { status: "Rejected" });
    await hrAudit("Training Completion Rejected", row.employees?.full_name ?? row.id);
    return;
  }

  const pendingManager = approvals.find((a) => a.stage === "Manager" && a.decision === "Pending");
  const pendingHr = approvals.find((a) => a.stage === "HR" && a.decision === "Pending");

  if (row.status === "Pending Manager Approval" && pendingManager) {
    await supabase
      .from("approvals" as never)
      .update({
        decision: "Approved",
        acted_at: new Date().toISOString(),
        comment: comment ?? null,
      } as never)
      .eq("id", pendingManager.id);

    await updateTraining(row.id, {
      status: "Pending HR Approval",
      manager_approved_by_label: actor.label,
      manager_approved_at: new Date().toISOString(),
    });
    await hrAudit("Training Manager Approved", row.employees?.full_name ?? row.id);
    return;
  }

  const hrStepActive =
    row.status === "Pending HR Approval" ||
    (row.status === "Pending Manager Approval" && !pendingManager && pendingHr);

  if (hrStepActive && pendingHr) {
    await supabase
      .from("approvals" as never)
      .update({
        decision: "Approved",
        acted_at: new Date().toISOString(),
        comment: comment ?? null,
      } as never)
      .eq("id", pendingHr.id);

    await updateTraining(row.id, {
      status: "Completed",
      hr_approved_by_label: actor.label,
      hr_approved_at: new Date().toISOString(),
    });
    await hrAudit("Training Completed", row.employees?.full_name ?? row.id);
    return;
  }

  // Stuck state — try to advance based on pending approval rows
  if (pendingManager) {
    await approveTrainingApp({ ...row, status: "Pending Manager Approval" }, "Approved", comment);
    return;
  }
  if (pendingHr) {
    await approveTrainingApp({ ...row, status: "Pending HR Approval" }, "Approved", comment);
    return;
  }

  throw new Error("No pending approval step found for this training record");
}

/** Approve or reject the current completion step (Manager or HR). */
export async function decideTrainingCompletion(
  row: TrainingRecordRow,
  decision: "Approved" | "Rejected",
  comment?: string,
) {
  try {
    const { error } = await supabase.rpc("fn_process_approval_decision" as never, {
      p_entity_type: "training",
      p_entity_id: row.id,
      p_decision: decision,
      p_comment: comment ?? null,
    } as never);
    if (!error) {
      await hrAudit(
        decision === "Approved" ? "Training Approval" : "Training Rejected",
        row.employees?.full_name ?? row.id,
        row.status,
        decision,
      );
      return;
    }
    if (!shouldUseTrainingAppFallback(error)) throw new Error(error.message);
  } catch (e) {
    if (e instanceof Error && !shouldUseTrainingAppFallback({ message: e.message })) throw e;
  }

  await approveTrainingApp(row, decision, comment);
}

export type TrainingTimelineEvent = {
  key: string;
  label: string;
  detail: string;
  when: string;
};

export function buildTrainingTimeline(
  row: TrainingRecordRow,
  approvals: ApprovalRow[],
): TrainingTimelineEvent[] {
  const events: TrainingTimelineEvent[] = [];

  if (row.created_by_label || row.created_at) {
    events.push({
      key: "created",
      label: "Assigned",
      detail: row.created_by_label ?? "HR",
      when: row.created_at,
    });
  }

  if (row.extended_at || row.extension_reason) {
    events.push({
      key: "extended",
      label: "Extended",
      detail: `${row.extension_reason ?? "—"} → ${row.extended_end_date ?? "—"} (${row.extended_by_label ?? "—"})`,
      when: row.extended_at ?? "",
    });
  }

  if (row.completion_requested_at || row.completion_reason) {
    events.push({
      key: "completion-request",
      label: "Completion requested",
      detail: `${row.completion_reason ?? "—"} · date ${row.completion_date ?? "—"} · by ${row.completion_requested_by_label ?? "—"}`,
      when: row.completion_requested_at ?? "",
    });
  }

  const rowApprovals = approvals.filter((a) => a.entity_id === row.id);
  for (const a of rowApprovals) {
    events.push({
      key: `approval-${a.id}`,
      label: `${a.stage} approval`,
      detail: a.decision + (a.comment ? ` — ${a.comment}` : ""),
      when: a.acted_at ?? a.created_at ?? "",
    });
  }

  if (row.manager_approved_at && !rowApprovals.some((a) => a.stage === "Manager" && a.acted_at)) {
    events.push({
      key: "mgr",
      label: "Manager approved",
      detail: row.manager_approved_by_label ?? "—",
      when: row.manager_approved_at,
    });
  }
  if (row.hr_approved_at && !rowApprovals.some((a) => a.stage === "HR" && a.acted_at)) {
    events.push({
      key: "hr",
      label: "HR approved",
      detail: row.hr_approved_by_label ?? "—",
      when: row.hr_approved_at,
    });
  }

  return events
    .filter((e) => e.when || e.detail !== "—")
    .sort((a, b) => (a.when || "").localeCompare(b.when || ""));
}
