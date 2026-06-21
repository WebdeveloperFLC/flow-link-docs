import { dayMetrics, type ShiftMetrics } from "./attendanceMetrics";
import { splitShiftHours } from "./shiftHours";
import type { AttendanceRow, ShiftRow } from "./types";

export function shiftMetricsFromShift(shift: ShiftRow): ShiftMetrics {
  return {
    login: shift.login_time.slice(0, 5),
    logout: shift.logout_time.slice(0, 5),
    grace: shift.grace_min ?? 5,
    breakDur: shift.break_min ?? 45,
    halfDayAfter: shift.half_day_after_min ?? 240,
    workHrs: shift.work_hours ?? 8,
  };
}

export type AttendanceRollup = {
  working: number;
  leaves: number;
  wOff: number;
  otMin: number;
  present: number;
  absent: number;
  lateMarks: number;
  halfDays: number;
  mispunches: number;
  workingMinutes: number;
};

export function rollupAttendance(att: AttendanceRow[], shift: ShiftRow): AttendanceRollup {
  const sw = shiftMetricsFromShift(shift);
  let working = 0;
  let leaves = 0;
  let wOff = 0;
  let otMin = 0;
  let present = 0;
  let absent = 0;
  let lateMarks = 0;
  let halfDays = 0;
  let mispunches = 0;
  let workingMinutes = 0;

  const splitWindow = {
    login: shift.login_time.slice(0, 5),
    logout: shift.logout_time.slice(0, 5),
    breakDur: shift.break_min ?? 45,
  };

  for (const a of att) {
    if (a.status === "Absent") absent++;
    if (a.status === "Late") lateMarks++;
    if (a.status === "Half Day") {
      halfDays++;
      present += 0.5;
    } else if (["Present", "Late"].includes(a.status)) present++;

    if (a.is_mispunch) mispunches++;

    if (a.status === "Week Off" || a.status === "Holiday") {
      wOff++;
      continue;
    }
    if (a.status === "Leave" || a.status === "Sick Leave") {
      leaves++;
      continue;
    }
    if (a.status === "Half Day") working += 0.5;
    else if (a.status === "Present") working++;

    const dm = dayMetrics(a, sw);
    if (dm.net != null && dm.net > 0) workingMinutes += dm.net;

    if (a.check_in && a.check_out) {
      const split = splitShiftHours(a.check_in, a.check_out, a.break_min, splitWindow);
      otMin += split.otMin;
    }
  }

  return {
    working: Math.round(working * 10) / 10,
    leaves,
    wOff,
    otMin,
    present: Math.round(present * 10) / 10,
    absent,
    lateMarks,
    halfDays,
    mispunches,
    workingMinutes,
  };
}
