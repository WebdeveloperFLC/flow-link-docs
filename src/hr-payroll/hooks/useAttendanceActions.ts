import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { HR_ORG_ID } from "../lib/constants";
import { hrAudit, rebuildPayrollLine } from "../lib/hrApi";
import { nowHhmm, todayIso } from "../lib/attendanceMetrics";

export function useAttendanceActions(cycleId: string | undefined, fire: (msg: string) => void) {
  const qc = useQueryClient();

  const invalidate = async (employeeId: string) => {
    await qc.invalidateQueries({ queryKey: ["hr-attendance"] });
    await qc.invalidateQueries({ queryKey: ["hr-payroll-lines"] });
    if (cycleId) {
      try {
        await rebuildPayrollLine(employeeId, cycleId);
      } catch {
        /* cycle may be locked */
      }
    }
  };

  const addToday = async (employeeId: string, empName: string) => {
    const work_date = todayIso();
    const { error } = await supabase.from("attendance" as never).insert({
      org_id: HR_ORG_ID,
      employee_id: employeeId,
      work_date,
      status: "Absent",
      is_mispunch: false,
      source: "self",
    } as never);
    if (error) {
      fire(error.message);
      return;
    }
    await hrAudit("Day Started", `${empName} · ${work_date}`);
    fire("Today's row added");
    await invalidate(employeeId);
  };

  const startAndCheckIn = async (employeeId: string, empName: string) => {
    const work_date = todayIso();
    const hhmm = nowHhmm();
    const { data: existing } = await supabase
      .from("attendance" as never)
      .select("id")
      .eq("employee_id", employeeId)
      .eq("work_date", work_date)
      .maybeSingle();

    if (existing) {
      const { error } = await supabase
        .from("attendance" as never)
        .update({ check_in: hhmm, source: "self" } as never)
        .eq("id", (existing as { id: string }).id);
      if (error) fire(error.message);
    } else {
      const { error } = await supabase.from("attendance" as never).insert({
        org_id: HR_ORG_ID,
        employee_id: employeeId,
        work_date,
        check_in: hhmm,
        status: "Present",
        is_mispunch: false,
        source: "self",
      } as never);
      if (error) fire(error.message);
    }
    await hrAudit("Check In", `${empName} · ${work_date}`, "—", hhmm);
    fire("Checked in");
    await invalidate(employeeId);
  };

  const punch = async (
    row: { id: string; employee_id: string },
    field: "check_in" | "check_out" | "break_start" | "break_end",
    empName: string,
    workDate: string,
  ) => {
    const hhmm = nowHhmm();
    const { error } = await supabase
      .from("attendance" as never)
      .update({ [field]: hhmm, source: "self" } as never)
      .eq("id", row.id);
    if (error) {
      fire(error.message);
      return;
    }
    await hrAudit("Punch", `${empName} · ${workDate}`, field, hhmm);
    fire(`${field.replace("_", " ")} recorded`);
    await invalidate(row.employee_id);
  };

  const updateField = async (
    row: { id: string; employee_id: string },
    patch: Record<string, unknown>,
    empName: string,
  ) => {
    const { error } = await supabase
      .from("attendance" as never)
      .update(patch as never)
      .eq("id", row.id);
    if (error) {
      fire(error.message);
      return;
    }
    await hrAudit("Attendance Updated", empName);
    await invalidate(row.employee_id);
  };

  return { addToday, startAndCheckIn, punch, updateField };
}
