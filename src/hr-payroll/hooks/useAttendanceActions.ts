import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { HR_ORG_ID } from "../lib/constants";
import { hrAudit, rebuildPayrollLine, recordPunch, startAttendanceDay } from "../lib/hrApi";
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
    try {
      await startAttendanceDay(employeeId);
    } catch (e) {
      fire(e instanceof Error ? e.message : "Check-in failed — apply migration 13");
      return;
    }
    await hrAudit("Check In", `${empName} · ${work_date}`, "—", nowHhmm());
    fire("Checked in");
    await invalidate(employeeId);
  };

  const punch = async (
    row: { id: string; employee_id: string },
    field: "check_in" | "check_out" | "break_start" | "break_end",
    empName: string,
    workDate: string,
  ) => {
    try {
      await recordPunch(row.id, field);
    } catch (e) {
      fire(e instanceof Error ? e.message : "Punch failed — apply migration 13");
      return;
    }
    await hrAudit("Punch", `${empName} · ${workDate}`, field, nowHhmm());
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
