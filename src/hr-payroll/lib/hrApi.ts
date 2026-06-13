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
