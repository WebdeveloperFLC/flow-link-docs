/**
 * Weekly off helpers (Phase B) — mirrors SQL fn_is_weekly_off_day / fn_employee_work_week_at.
 */

export type WorkWeek = "5-Day" | "6-Day";

export type WeeklyOffPolicy = {
  five_day_off_dow: number[];
  six_day_off_dow: number[];
};

export const DEFAULT_WEEKLY_OFF_POLICY: WeeklyOffPolicy = {
  five_day_off_dow: [6, 0],
  six_day_off_dow: [0],
};

/** Map shift working_days_per_week to work week (matches EmployeeFormModal). */
export function workWeekFromShiftDays(workingDaysPerWeek: number | null | undefined): WorkWeek {
  const days = workingDaysPerWeek ?? 6;
  return days >= 6 ? "6-Day" : "5-Day";
}

export function weeklyOffDowForWorkWeek(
  workWeek: WorkWeek | string,
  policy: WeeklyOffPolicy = DEFAULT_WEEKLY_OFF_POLICY,
): number[] {
  if (workWeek.toLowerCase() === "5-day") {
    return policy.five_day_off_dow;
  }
  return policy.six_day_off_dow;
}

/** JS Date.getDay(): 0=Sunday … 6=Saturday (same as PostgreSQL DOW). */
export function isWeeklyOffDay(
  workDateIso: string,
  workWeek: WorkWeek | string,
  policy: WeeklyOffPolicy = DEFAULT_WEEKLY_OFF_POLICY,
): boolean {
  const d = new Date(`${workDateIso}T12:00:00`);
  const dow = d.getDay();
  return weeklyOffDowForWorkWeek(workWeek, policy).includes(dow);
}

export function employeeEligibleForAttendance(input: {
  status: string;
  dateOfJoining?: string | null;
  exitDate?: string | null;
  workDate: string;
}): boolean {
  if (input.status === "Terminated" || input.status === "Resigned") return false;
  if (input.dateOfJoining && input.workDate < input.dateOfJoining) return false;
  if (input.exitDate && input.workDate > input.exitDate) return false;
  return true;
}

/** Statuses that block automatic Week Off stamping (matches SQL _fn_stamp_weekly_off). */
export const WEEKLY_OFF_PROTECTED_STATUSES = new Set([
  "Holiday",
  "Present",
  "Half Day",
  "Leave",
  "Sick Leave",
  "Unauthorized Leave",
]);

export function shouldStampWeeklyOff(input: {
  workDate: string;
  workWeek: WorkWeek | string;
  existingStatus?: string | null;
  employeeStatus: string;
  dateOfJoining?: string | null;
  exitDate?: string | null;
  policy?: WeeklyOffPolicy;
}): boolean {
  if (
    !employeeEligibleForAttendance({
      status: input.employeeStatus,
      dateOfJoining: input.dateOfJoining,
      exitDate: input.exitDate,
      workDate: input.workDate,
    })
  ) {
    return false;
  }
  if (!isWeeklyOffDay(input.workDate, input.workWeek, input.policy)) return false;
  if (input.existingStatus && WEEKLY_OFF_PROTECTED_STATUSES.has(input.existingStatus)) return false;
  return true;
}
