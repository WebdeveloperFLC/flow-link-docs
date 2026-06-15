import { supabase } from "@/integrations/supabase/client";
import { HR_ORG_ID } from "./constants";
import type { AttendanceRow } from "./types";

export async function hrAudit(
  action: string,
  target: string,
  prev?: string,
  next?: string,
) {
  await supabase.from("audit_log" as never).insert({
    org_id: HR_ORG_ID,
    actor_label: "You (HR)",
    action,
    target,
    prev_value: prev ?? "—",
    new_value: next ?? "—",
  } as never);
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

export async function recordPunch(attendanceId: string, field: string) {
  const { data, error } = await supabase.rpc("fn_record_punch" as never, {
    p_attendance: attendanceId,
    p_field: field,
  } as never);
  if (error) throw new Error(error.message || "Punch failed");
  return data as import("./types").AttendanceRow;
}

export async function startAttendanceDay(employeeId: string, workDate: string) {
  const { data, error } = await supabase.rpc("fn_start_attendance_day" as never, {
    p_employee: employeeId,
    p_work_date: workDate,
  } as never);
  if (error) throw error;
  return data as import("./types").AttendanceRow;
}

export async function ensureMyEmployeeProfile() {
  const { data, error } = await supabase.rpc("fn_ensure_my_employee_profile" as never, {
    p_org: HR_ORG_ID,
  } as never);
  if (error) throw error;
  return data as import("./types").EmployeeRow;
}
