/**
 * Attendance status helpers (Phase A.1 dynamic shift thresholds + ESS session labels).
 * SQL source of truth: fn_derive_status in 20260722120100_hr_payroll_attendance_dynamic_shift_thresholds.sql
 */

import type { AttendanceRow } from "./types";
import { shiftLogoutEffective } from "./shiftWindow";

/** ESS dashboard status per company policy (Available / Break / Unavailable). */
export function essAttendanceStatus(row: AttendanceRow | null): {
  label: string;
  tone: "good" | "warn" | "mut" | "sky";
} {
  if (!row?.check_in) {
    return { label: "Not checked in", tone: "mut" };
  }
  if (row.check_out) {
    return { label: "Checked out", tone: "mut" };
  }
  if (row.ess_unavailable) {
    return { label: "Unavailable", tone: "sky" };
  }
  if (row.break_start && !row.break_end) {
    return { label: "Break", tone: "warn" };
  }
  return { label: "Available", tone: "good" };
}

/** Shift master window used for scheduled working-minute thresholds. */
export type ShiftSchedule = {
  login: string;
  logout: string;
  shiftBreakMin: number;
};

export type AttendanceStatusInput = {
  checkIn: string | null;
  checkOut: string | null;
  status?: string;
  /** @deprecated use shift instead — ignored when shift is provided */
  workHours?: number;
  shift?: ShiftSchedule;
  breakMin?: number | null;
  breakStart?: string | null;
  breakEnd?: string | null;
};

export type AttendanceStatusResult = {
  status: string;
  isMispunch: boolean;
  netWorkMinutes: number | null;
  scheduledWorkMinutes: number | null;
};

const PROTECTED = new Set([
  "Leave",
  "Sick Leave",
  "Week Off",
  "Holiday",
  "Unauthorized Leave",
]);

export function toMinutesFromTime(t: string | null | undefined): number | null {
  if (!t) return null;
  const parts = t.slice(0, 8).split(":").map(Number);
  return parts[0] * 60 + parts[1];
}

/** (logout − login) − configured shift break — mirrors fn_shift_scheduled_work_minutes. */
export function scheduledWorkMinutes(shift: ShiftSchedule): number {
  const lg = toMinutesFromTime(shift.login) ?? 600;
  const lo = toMinutesFromTime(shift.logout) ?? 1140;
  const loEff = shiftLogoutEffective(lg, lo);
  return Math.max(0, loEff - lg - (shift.shiftBreakMin ?? 0));
}

export function breakMinutesFromPunches(
  breakMin: number | null | undefined,
  breakStart: string | null | undefined,
  breakEnd: string | null | undefined,
): number {
  if (breakMin != null && breakMin > 0) return breakMin;
  const bs = toMinutesFromTime(breakStart);
  const be = toMinutesFromTime(breakEnd);
  if (bs == null || be == null) return 0;
  let end = be;
  if (end <= bs) end += 24 * 60;
  return Math.max(0, Math.round(end - bs));
}

export function netWorkMinutes(input: AttendanceStatusInput): number | null {
  const ci = toMinutesFromTime(input.checkIn);
  const co = toMinutesFromTime(input.checkOut);
  if (ci == null || co == null) return null;
  let end = co;
  if (end <= ci) end += 24 * 60;
  const brk = breakMinutesFromPunches(input.breakMin, input.breakStart, input.breakEnd);
  return Math.max(0, end - ci - brk);
}

const DEFAULT_SHIFT: ShiftSchedule = { login: "10:00", logout: "19:00", shiftBreakMin: 45 };

/** Derive Present / Half Day / Absent from net worked vs shift-scheduled minutes. */
export function deriveAttendanceStatus(input: AttendanceStatusInput): AttendanceStatusResult {
  const current = input.status ?? "Absent";
  if (PROTECTED.has(current)) {
    return { status: current, isMispunch: false, netWorkMinutes: null, scheduledWorkMinutes: null };
  }

  const hasIn = !!input.checkIn;
  const hasOut = !!input.checkOut;

  if (!hasIn && !hasOut) {
    return { status: "Absent", isMispunch: false, netWorkMinutes: null, scheduledWorkMinutes: null };
  }
  if (hasIn && !hasOut) {
    return { status: "Present", isMispunch: false, netWorkMinutes: null, scheduledWorkMinutes: null };
  }
  if (!hasIn && hasOut) {
    return { status: "Present", isMispunch: true, netWorkMinutes: null, scheduledWorkMinutes: null };
  }

  const shift = input.shift ?? DEFAULT_SHIFT;
  const fullMin = scheduledWorkMinutes(shift);
  const halfMin = fullMin / 2;
  const net = netWorkMinutes(input);

  if (net == null) {
    return { status: "Absent", isMispunch: false, netWorkMinutes: null, scheduledWorkMinutes: fullMin };
  }
  if (fullMin <= 0) {
    return { status: "Present", isMispunch: false, netWorkMinutes: net, scheduledWorkMinutes: fullMin };
  }
  if (net >= fullMin) {
    return { status: "Present", isMispunch: false, netWorkMinutes: net, scheduledWorkMinutes: fullMin };
  }
  if (net >= halfMin) {
    return { status: "Half Day", isMispunch: false, netWorkMinutes: net, scheduledWorkMinutes: fullMin };
  }
  return { status: "Absent", isMispunch: false, netWorkMinutes: net, scheduledWorkMinutes: fullMin };
}
