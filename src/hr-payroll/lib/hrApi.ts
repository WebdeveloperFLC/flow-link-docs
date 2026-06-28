import { supabase } from "@/integrations/supabase/client";
import { EMPLOYEE_DEACTIVATE_STATUS, HR_ORG_ID } from "./constants";
import type { AttendanceRow } from "./types";

export type HrActorInfo = { id: string | null; label: string };

export async function getHrActorInfo(): Promise<HrActorInfo> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { id: null, label: "HR User" };

  const { data: profile } = await supabase
    .from("profiles" as never)
    .select("full_name, email")
    .eq("id", user.id)
    .maybeSingle();

  const row = profile as { full_name?: string | null; email?: string | null } | null;
  const label = row?.full_name?.trim() || row?.email || user.email || "HR User";
  return { id: user.id, label };
}

export async function hrAudit(
  action: string,
  target: string,
  prev?: string,
  next?: string,
  actor?: HrActorInfo,
) {
  const resolved = actor ?? (await getHrActorInfo());
  await supabase.from("audit_log" as never).insert({
    org_id: HR_ORG_ID,
    actor_id: resolved.id,
    actor_label: resolved.label,
    action,
    target,
    prev_value: prev ?? "—",
    new_value: next ?? "—",
  } as never);
}

export async function deactivateEmployee(
  employeeId: string,
  fullName: string,
  currentStatus: string,
) {
  const today = new Date().toISOString().slice(0, 10);
  const { data: row, error: fetchErr } = await supabase
    .from("employees" as never)
    .select("exit_date, exit_reason")
    .eq("id", employeeId)
    .single();
  if (fetchErr) throw fetchErr;

  const existing = row as { exit_date?: string | null; exit_reason?: string | null };
  const { error } = await supabase
    .from("employees" as never)
    .update({
      status: EMPLOYEE_DEACTIVATE_STATUS,
      exit_date: existing.exit_date ?? today,
      exit_reason: existing.exit_reason?.trim() || "Deactivated from Employee Master",
    } as never)
    .eq("id", employeeId);
  if (error) throw error;
  await hrAudit(
    "Employee Deactivated",
    fullName,
    currentStatus,
    EMPLOYEE_DEACTIVATE_STATUS,
  );
}

export async function rebuildPayrollCycle(cycleId: string) {
  const { data, error } = await supabase.rpc("fn_rebuild_cycle_lines" as never, {
    p_cycle: cycleId,
  } as never);
  if (error) throw error;
  return data as number;
}

export async function rebuildPayrollLine(employeeId: string, cycleId: string) {
  const { error } = await supabase.rpc("fn_build_payroll_line" as never, {
    p_employee: employeeId,
    p_cycle: cycleId,
  } as never);
  if (error) throw error;
}

export async function rebuildAllPayrollLines(cycleId: string, employeeIds: string[]) {
  for (const id of employeeIds) {
    await rebuildPayrollLine(id, cycleId);
  }
}

export async function processLeaveDecision(requestId: string, decision: string) {
  const { data, error } = await supabase.rpc("fn_process_leave_decision" as never, {
    p_request: requestId,
    p_decision: decision,
  } as never);
  if (error) throw error;
  return data;
}

export async function resetHrRolePermissions(orgId: string) {
  const { data, error } = await supabase.rpc("fn_reset_hr_role_permissions" as never, {
    p_org: orgId,
  } as never);
  if (error) throw error;
  return data as number;
}

export async function accrueLeaveBalances(orgId: string, year?: number) {
  const { data, error } = await supabase.rpc("fn_accrue_leave_balances" as never, {
    p_org: orgId,
    p_year: year ?? new Date().getFullYear(),
  } as never);
  if (error) throw error;
  return data as number;
}

export async function setEssUnavailable(attendanceId: string, unavailable: boolean) {
  const { data, error } = await supabase.rpc("fn_set_ess_unavailable" as never, {
    p_attendance: attendanceId,
    p_unavailable: unavailable,
  } as never);
  if (error) throw error;
  return data as AttendanceRow;
}

export async function applyHolidaysForDate(orgId: string, date: string) {
  const { data, error } = await supabase.rpc("fn_apply_holidays_for_date" as never, {
    p_org: orgId,
    p_date: date,
  } as never);
  if (error) throw error;
  return data as number;
}

/** Applies attendance Holiday status for each distinct holiday date in YYYY-MM. */
export async function applyHolidaysForMonth(orgId: string, dates: string[]) {
  let total = 0;
  for (const date of dates) {
    total += await applyHolidaysForDate(orgId, date);
  }
  return total;
}

/** Sync system Week Off rows for a date range (idempotent). */
export async function syncWeeklyOffsForRange(
  orgId: string,
  from: string,
  to: string,
  employeeId?: string,
) {
  const { data, error } = await supabase.rpc("fn_apply_weekly_offs_for_range" as never, {
    p_org: orgId,
    p_from: from,
    p_to: to,
    p_employee: employeeId ?? null,
    p_internal: false,
  } as never);
  if (error) throw error;
  return data as number;
}

export async function applyWeeklyOffsForDate(orgId: string, date: string) {
  const { data, error } = await supabase.rpc("fn_apply_weekly_offs_for_date" as never, {
    p_org: orgId,
    p_date: date,
    p_internal: false,
  } as never);
  if (error) throw error;
  return data as number;
}

export async function processApprovalDecision(
  entityType: string,
  entityId: string,
  decision: string,
  comment?: string,
) {
  const { data, error } = await supabase.rpc("fn_process_approval_decision" as never, {
    p_entity_type: entityType,
    p_entity_id: entityId,
    p_decision: decision,
    p_comment: comment ?? null,
  } as never);
  if (error) throw error;
  return data;
}

export async function extendTraining(
  trainingId: string,
  extendedUntil: string,
  reason: string,
) {
  const { data, error } = await supabase.rpc("fn_extend_training" as never, {
    p_training_id: trainingId,
    p_extended_until: extendedUntil,
    p_reason: reason,
  } as never);
  if (error) throw error;
  return data;
}

export async function requestTrainingCompletion(
  trainingId: string,
  completionDate: string,
  reason: string,
) {
  const { data, error } = await supabase.rpc("fn_request_training_completion" as never, {
    p_training_id: trainingId,
    p_completion_date: completionDate,
    p_reason: reason,
  } as never);
  if (error) throw error;
  return data;
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

export type AssignTrainingInput = {
  employee_id: string;
  type: string;
  duration: string;
  unpaid_days: number;
  start_date: string | null;
  end_date: string | null;
  training_ref: string | null;
  remarks?: string | null;
  created_by_id: string | null;
  created_by_label: string;
};

/** Inserts training; falls back to legacy columns if workflow migration not yet published. */
export async function assignTrainingRecord(input: AssignTrainingInput) {
  if (!input.employee_id) {
    throw new Error("Employee is required");
  }

  const core = {
    org_id: HR_ORG_ID,
    employee_id: input.employee_id,
    type: input.type,
    duration: input.duration,
    unpaid_days: input.unpaid_days,
    start_date: input.start_date,
    status: "In Progress",
  };

  const withWorkflow = {
    ...core,
    end_date: input.end_date,
    training_ref: input.training_ref,
    remarks: input.remarks?.trim() || null,
    created_by_id: input.created_by_id,
    created_by_label: input.created_by_label,
  };

  let { data, error } = await supabase
    .from("training_records" as never)
    .insert(withWorkflow as never)
    .select("id")
    .single();

  if (error && isPostgrestSchemaError(error)) {
    const legacy = await supabase
      .from("training_records" as never)
      .insert(core as never)
      .select("id")
      .single();
    data = legacy.data;
    error = legacy.error;
  }

  if (error) {
    const msg = error.message ?? "Assign failed";
    if (msg.toLowerCase().includes("permission") || error.code === "42501") {
      throw new Error("Not authorized — Approve permission required to assign training");
    }
    throw new Error(msg);
  }

  return data as { id: string };
}

export async function syncHrRoleFromCrm(orgId: string, staffId: string) {
  const { data, error } = await supabase.rpc("fn_sync_hr_role_from_crm" as never, {
    p_org: orgId,
    p_staff_id: staffId,
  } as never);
  if (error) throw error;
  return data as string | null;
}

export async function syncAllCrmHrRoles(orgId: string) {
  const { data, error } = await supabase.rpc("fn_sync_all_crm_hr_roles" as never, {
    p_org: orgId,
  } as never);
  if (error) throw error;
  return data as number;
}

export async function lockPayrollCycle(cycleId: string) {
  const { data, error } = await supabase.rpc("fn_lock_payroll_cycle" as never, {
    p_cycle: cycleId,
  } as never);
  if (error) throw error;
  return data;
}

export async function processPayrollCycle(cycleId: string) {
  const { data, error } = await supabase.rpc("fn_process_payroll_cycle" as never, {
    p_cycle: cycleId,
  } as never);
  if (error) throw error;
  return data;
}

export async function approvePayrollCycle(cycleId: string) {
  const { data, error } = await supabase.rpc("fn_approve_payroll_cycle" as never, {
    p_cycle: cycleId,
  } as never);
  if (error) throw error;
  return data;
}

export async function markPayrollPaid(cycleId: string) {
  const { data, error } = await supabase.rpc("fn_mark_payroll_paid" as never, {
    p_cycle: cycleId,
  } as never);
  if (error) throw error;
  return data;
}

export async function reopenPayrollCycle(cycleId: string, reason?: string) {
  const { data, error } = await supabase.rpc("fn_reopen_payroll_cycle" as never, {
    p_cycle: cycleId,
    p_reason: reason ?? null,
  } as never);
  if (error) throw error;
  return data;
}

/** UAT-only: clears generated payroll artifacts and returns cycle to Draft. */
export async function resetPayrollCycleUat(cycleId: string) {
  const { data, error } = await supabase.rpc("fn_reset_payroll_cycle_uat" as never, {
    p_cycle: cycleId,
  } as never);
  if (error) throw error;
  return data;
}

export async function fetchPayrollRegisterExport(cycleId: string, branch?: string) {
  const { data, error } = await supabase.rpc("fn_export_payroll_register" as never, {
    p_cycle: cycleId,
    p_branch: branch && branch !== "All" ? branch : null,
  } as never);
  if (error) throw error;
  return (data ?? []) as import("./payrollExport").PayrollRegisterRow[];
}

export function rpcErrorMessage(e: unknown, fallback: string): string {
  if (e && typeof e === "object" && "message" in e) {
    const msg = (e as { message: unknown }).message;
    if (typeof msg === "string" && msg.trim()) return msg;
  }
  return fallback;
}

export async function recordPunch(attendanceId: string, field: string, punchTime: string) {
  const { data, error } = await supabase.rpc("fn_record_punch" as never, {
    p_attendance: attendanceId,
    p_field: field,
    p_time: punchTime,
  } as never);
  if (error) throw new Error(error.message || "Punch failed");
  return data as import("./types").AttendanceRow;
}

export async function startAttendanceDay(employeeId: string, workDate: string, checkInTime: string) {
  const { data, error } = await supabase.rpc("fn_start_attendance_day" as never, {
    p_employee: employeeId,
    p_work_date: workDate,
    p_check_in: checkInTime,
  } as never);
  if (error) throw new Error(error.message || "Check-in failed");
  return data as import("./types").AttendanceRow;
}

export async function ensureMyEmployeeProfile() {
  const { data, error } = await supabase.rpc("fn_ensure_my_employee_profile" as never, {
    p_org: HR_ORG_ID,
  } as never);
  if (error) throw error;
  return data as import("./types").EmployeeRow;
}

export type EssPersonalContactPayload = {
  email: string;
  mobile: string;
  alternateMobile?: string;
  emergencyName: string;
  emergencyRelation: string;
  emergencyPhone: string;
  emergencyEmail?: string;
};

export async function updateEssPersonalContact(payload: EssPersonalContactPayload) {
  const { data, error } = await supabase.rpc("fn_update_ess_personal_contact" as never, {
    p_org: HR_ORG_ID,
    p_email: payload.email,
    p_mobile: payload.mobile,
    p_alternate_mobile: payload.alternateMobile ?? null,
    p_emergency_name: payload.emergencyName,
    p_emergency_relation: payload.emergencyRelation,
    p_emergency_phone: payload.emergencyPhone,
    p_emergency_email: payload.emergencyEmail ?? null,
  } as never);
  if (error) throw error;
  return data as import("./types").EmployeeRow;
}
