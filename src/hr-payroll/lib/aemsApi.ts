import { supabase } from "@/integrations/supabase/client";
import { HR_ORG_ID } from "./constants";
import { getHrActorInfo } from "./hrApi";
import type {
  AemsEvidenceRow,
  AemsHistoryRow,
  AttendanceExceptionRow,
  WorkforceIncidentRow,
} from "./aemsTypes";

export function aemsEvidenceStoragePath(
  employeeId: string,
  exceptionId: string,
  fileName: string,
): string {
  const safe = fileName.replace(/[^a-zA-Z0-9._-]/g, "_");
  return `${HR_ORG_ID}/${employeeId}/exception-evidence/${exceptionId}/${Date.now()}-${safe}`;
}

export async function fetchAemsExceptions(params?: {
  employeeId?: string;
  status?: string;
  branchId?: string;
  workDateFrom?: string;
  workDateTo?: string;
}): Promise<AttendanceExceptionRow[]> {
  let q = supabase
    .from("attendance_exceptions" as never)
    .select("*, employees(full_name, emp_code, branch_id)")
    .eq("org_id", HR_ORG_ID)
    .order("created_at", { ascending: false });
  if (params?.employeeId) q = q.eq("employee_id", params.employeeId);
  if (params?.status) q = q.eq("status", params.status);
  if (params?.branchId) q = q.eq("branch_id", params.branchId);
  if (params?.workDateFrom) q = q.gte("work_date", params.workDateFrom);
  if (params?.workDateTo) q = q.lte("work_date", params.workDateTo);
  const { data, error } = await q;
  if (error) throw error;
  return (data ?? []) as AttendanceExceptionRow[];
}

export async function fetchAemsException(id: string): Promise<AttendanceExceptionRow | null> {
  const { data, error } = await supabase
    .from("attendance_exceptions" as never)
    .select("*, employees(full_name, emp_code, branch_id)")
    .eq("id", id)
    .maybeSingle();
  if (error) throw error;
  return (data as AttendanceExceptionRow | null) ?? null;
}

export async function fetchAemsEvidence(exceptionId: string): Promise<AemsEvidenceRow[]> {
  const { data, error } = await supabase
    .from("aems_exception_evidence" as never)
    .select("*")
    .eq("exception_id", exceptionId)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data ?? []) as AemsEvidenceRow[];
}

export async function fetchAemsHistory(exceptionId: string): Promise<AemsHistoryRow[]> {
  const { data, error } = await supabase
    .from("aems_exception_history" as never)
    .select("*")
    .eq("exception_id", exceptionId)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data ?? []) as AemsHistoryRow[];
}

export async function fetchWorkforceIncidents(): Promise<WorkforceIncidentRow[]> {
  const { data, error } = await supabase
    .from("workforce_incidents" as never)
    .select("*")
    .eq("org_id", HR_ORG_ID)
    .order("start_at", { ascending: false });
  if (error) throw error;
  return (data ?? []) as WorkforceIncidentRow[];
}

export async function fetchMatchingIncidents(branchId: string | null, at?: string) {
  const { data, error } = await supabase.rpc("fn_aems_find_matching_incidents" as never, {
    p_org: HR_ORG_ID,
    p_branch_id: branchId,
    p_at: at ?? new Date().toISOString(),
  } as never);
  if (error) throw error;
  return (data ?? []) as WorkforceIncidentRow[];
}

export async function submitAemsException(params: {
  employeeId: string;
  workDate: string;
  exceptionTypeCode: string;
  description: string;
  requestedClockIn?: string | null;
  requestedClockOut?: string | null;
  incidentId?: string | null;
  submit?: boolean;
}) {
  const actor = await getHrActorInfo();
  const { data, error } = await supabase.rpc("fn_aems_submit_exception" as never, {
    p_employee: params.employeeId,
    p_work_date: params.workDate,
    p_exception_type_code: params.exceptionTypeCode,
    p_description: params.description,
    p_requested_clock_in: params.requestedClockIn ?? null,
    p_requested_clock_out: params.requestedClockOut ?? null,
    p_incident_id: params.incidentId ?? null,
    p_submit: params.submit ?? true,
    p_actor_id: actor.id,
    p_actor_label: actor.label,
  } as never);
  if (error) throw error;
  return data as AttendanceExceptionRow;
}

export async function aemsHrAction(params: {
  exceptionId: string;
  action: "approve" | "approve_modified" | "reject" | "clarify" | "review";
  comment: string;
  modifiedClockIn?: string | null;
  modifiedClockOut?: string | null;
}) {
  const actor = await getHrActorInfo();
  const { data, error } = await supabase.rpc("fn_aems_hr_action" as never, {
    p_exception_id: params.exceptionId,
    p_action: params.action,
    p_comment: params.comment,
    p_modified_clock_in: params.modifiedClockIn ?? null,
    p_modified_clock_out: params.modifiedClockOut ?? null,
    p_actor_id: actor.id,
    p_actor_label: actor.label,
  } as never);
  if (error) throw error;
  return data as AttendanceExceptionRow;
}

export async function aemsManualAttendance(params: {
  employeeId: string;
  workDate: string;
  clockIn: string;
  clockOut: string;
  reason: string;
  comment: string;
}) {
  const actor = await getHrActorInfo();
  const { data, error } = await supabase.rpc("fn_aems_manual_attendance" as never, {
    p_employee: params.employeeId,
    p_work_date: params.workDate,
    p_clock_in: params.clockIn,
    p_clock_out: params.clockOut,
    p_reason: params.reason,
    p_comment: params.comment,
    p_actor_id: actor.id,
    p_actor_label: actor.label,
  } as never);
  if (error) throw error;
  return data as AttendanceExceptionRow;
}

export async function aemsBulkProcess(
  exceptionIds: string[],
  action: "approve" | "reject",
  comment: string,
) {
  const actor = await getHrActorInfo();
  const { data, error } = await supabase.rpc("fn_aems_bulk_process" as never, {
    p_exception_ids: exceptionIds,
    p_action: action,
    p_comment: comment,
    p_actor_id: actor.id,
    p_actor_label: actor.label,
  } as never);
  if (error) throw error;
  return data as { count: number; action: string };
}

export async function uploadAemsEvidence(
  exceptionId: string,
  employeeId: string,
  file: File,
  notes?: string,
) {
  const actor = await getHrActorInfo();
  const storagePath = aemsEvidenceStoragePath(employeeId, exceptionId, file.name);
  const { error: upErr } = await supabase.storage.from("hr-docs").upload(storagePath, file, {
    upsert: false,
    contentType: file.type || undefined,
  });
  if (upErr) throw upErr;

  const { data, error } = await supabase.rpc("fn_aems_register_evidence" as never, {
    p_exception_id: exceptionId,
    p_file_name: file.name,
    p_storage_path: storagePath,
    p_mime: file.type || null,
    p_file_size: file.size,
    p_notes: notes ?? null,
    p_actor_id: actor.id,
    p_actor_label: actor.label,
  } as never);
  if (error) {
    await supabase.storage.from("hr-docs").remove([storagePath]);
    throw error;
  }
  return data as AemsEvidenceRow;
}

export async function saveWorkforceIncident(
  input: Partial<WorkforceIncidentRow> & {
    incident_type_code: string;
    description: string;
    start_at: string;
  },
  id?: string,
) {
  const actor = await getHrActorInfo();
  const payload = {
    org_id: HR_ORG_ID,
    incident_code: input.incident_code ?? `INC-${Date.now().toString(36).toUpperCase()}`,
    branch_id: input.branch_id ?? null,
    start_at: input.start_at,
    end_at: input.end_at ?? null,
    incident_type_code: input.incident_type_code,
    description: input.description,
    status: input.status ?? "Open",
    created_by: actor.id,
    created_by_label: actor.label,
  };

  if (id) {
    const { error } = await supabase
      .from("workforce_incidents" as never)
      .update({
        branch_id: payload.branch_id,
        start_at: payload.start_at,
        end_at: payload.end_at,
        incident_type_code: payload.incident_type_code,
        description: payload.description,
        status: payload.status,
      } as never)
      .eq("id", id);
    if (error) throw error;
    return;
  }

  const { error } = await supabase.from("workforce_incidents" as never).insert(payload as never);
  if (error) throw error;
}

export async function closeWorkforceIncident(id: string) {
  const actor = await getHrActorInfo();
  const { error } = await supabase
    .from("workforce_incidents" as never)
    .update({
      status: "Closed",
      closed_at: new Date().toISOString(),
      closed_by: actor.id,
      closed_by_label: actor.label,
    } as never)
    .eq("id", id);
  if (error) throw error;
}
