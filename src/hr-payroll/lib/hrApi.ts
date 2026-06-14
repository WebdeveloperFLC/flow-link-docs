import { supabase } from "@/integrations/supabase/client";
import { HR_ORG_ID } from "./constants";

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
