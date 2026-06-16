import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { HR_ORG_ID } from "../lib/constants";
import { hrAudit, rebuildPayrollLine, recordPunch, rpcErrorMessage, setEssUnavailable, startAttendanceDay } from "../lib/hrApi";
import { nowHhmm, todayIso } from "../lib/attendanceMetrics";
import type { AttendanceRow } from "../lib/types";

function mergeAttendanceCache(
  qc: ReturnType<typeof useQueryClient>,
  employeeId: string,
  cycleStart: string | undefined,
  cycleEnd: string | undefined,
  row: AttendanceRow,
) {
  const key = ["hr-attendance", HR_ORG_ID, employeeId, cycleStart, cycleEnd] as const;
  qc.setQueryData<AttendanceRow[]>(key, (prev = []) => {
    const idx = prev.findIndex((a) => a.work_date === row.work_date);
    if (idx >= 0) {
      const next = [...prev];
      next[idx] = { ...prev[idx], ...row };
      return next;
    }
    if (cycleStart && row.work_date < cycleStart) return prev;
    if (cycleEnd && row.work_date > cycleEnd) return prev;
    return [...prev, row].sort((a, b) => a.work_date.localeCompare(b.work_date));
  });
}

export function useAttendanceActions(
  cycleId: string | undefined,
  cycleStart: string | undefined,
  cycleEnd: string | undefined,
  fire: (msg: string) => void,
) {
  const qc = useQueryClient();

  const invalidate = async (employeeId: string, row?: AttendanceRow) => {
    if (row) {
      mergeAttendanceCache(qc, employeeId, cycleStart, cycleEnd, row);
    }
    await qc.invalidateQueries({ queryKey: ["hr-attendance"] });
    await qc.refetchQueries({ queryKey: ["hr-attendance", HR_ORG_ID, employeeId] });
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
    let row: AttendanceRow;
    try {
      row = await startAttendanceDay(employeeId, work_date);
    } catch (e) {
      fire(rpcErrorMessage(e, "Check-in failed"));
      return;
    }
    await hrAudit("Check In", `${empName} · ${work_date}`, "—", nowHhmm());
    fire("Checked in");
    await invalidate(employeeId, row);
  };

  const punch = async (
    row: { id: string; employee_id: string },
    field: "check_in" | "check_out" | "break_start" | "break_end",
    empName: string,
    workDate: string,
  ) => {
    let updated: AttendanceRow;
    try {
      updated = (await recordPunch(row.id, field)) as AttendanceRow;
    } catch (e) {
      fire(rpcErrorMessage(e, "Punch failed"));
      return;
    }
    await hrAudit("Punch", `${empName} · ${workDate}`, field, nowHhmm());
    fire(`${field.replace("_", " ")} recorded`);
    await invalidate(row.employee_id, updated);
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

  const toggleUnavailable = async (
    row: { id: string; employee_id: string },
    unavailable: boolean,
    empName: string,
  ) => {
    let updated: AttendanceRow;
    try {
      updated = await setEssUnavailable(row.id, unavailable);
    } catch (e) {
      fire(e instanceof Error ? e.message : "Status update failed — apply migration 35");
      return;
    }
    await hrAudit("ESS Status", empName, unavailable ? "Available" : "Unavailable", unavailable ? "Unavailable" : "Available");
    fire(unavailable ? "Marked unavailable" : "Marked available");
    await invalidate(row.employee_id, updated);
  };

  return { addToday, startAndCheckIn, punch, updateField, toggleUnavailable };
}
