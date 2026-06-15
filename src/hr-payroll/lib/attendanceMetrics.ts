/** Display-only attendance metrics (not payroll maths). */

import { splitShiftHours } from "./shiftHours";

export function toMin(t: string | null | undefined): number | null {
  if (!t) return null;
  const parts = t.slice(0, 5).split(":").map(Number);
  return parts[0] * 60 + parts[1];
}

export function fmtDur(min: number | null | undefined): string {
  if (min == null || Number.isNaN(min)) return "—";
  const h = Math.floor(min / 60);
  const m = Math.round(min % 60);
  return `${h ? `${h}h ` : ""}${m}m`;
}

export type ShiftMetrics = {
  login: string;
  logout: string;
  grace: number;
  breakDur: number;
  halfDayAfter: number;
  workHrs: number;
};

export function dayMetrics(
  a: {
    check_in: string | null;
    check_out: string | null;
    break_start: string | null;
    break_end: string | null;
    break_min: number | null;
  },
  shift: ShiftMetrics,
) {
  const ci = toMin(a.check_in);
  const co = toMin(a.check_out);
  const bs = toMin(a.break_start);
  const be = toMin(a.break_end);
  let breakMin =
    a.break_min != null ? a.break_min : bs != null && be != null ? be - bs : 0;
  breakMin = Math.max(0, breakMin);
  const gross = ci != null && co != null ? co - ci : null;
  const net = gross != null ? gross - breakMin : null;
  const login = toMin(shift.login) ?? 600;
  const logout = toMin(shift.logout) ?? 1140;
  const split = splitShiftHours(a.check_in, a.check_out, breakMin, {
    login: shift.login,
    logout: shift.logout,
    breakDur: shift.breakDur || 0,
  });
  const target = logout - login - (shift.breakDur || 0);
  const otMin = split.otMin;
  const grace = shift.grace || 5;
  const lateMin =
    ci != null && ci >= login && ci <= logout ? Math.max(0, ci - login - grace) : 0;
  return {
    net,
    breakMin,
    otMin,
    lateMin,
    lateBeyondGrace: lateMin > 0,
    shiftWorkMin: split.shiftWorkMin,
    offShiftMin: split.offShiftMin,
  };
}

export function formatWorkDate(d: string): string {
  const dt = new Date(d + "T12:00:00");
  return dt.toLocaleDateString("en-IN", { day: "2-digit", month: "short" });
}

export function formatWorkDay(d: string): string {
  return new Date(d + "T12:00:00").toLocaleDateString("en-US", { weekday: "short" });
}

export function todayIso(): string {
  const n = new Date();
  return `${n.getFullYear()}-${String(n.getMonth() + 1).padStart(2, "0")}-${String(n.getDate()).padStart(2, "0")}`;
}

export function nowHhmm(): string {
  const n = new Date();
  return `${String(n.getHours()).padStart(2, "0")}:${String(n.getMinutes()).padStart(2, "0")}`;
}

export const ATTENDANCE_STATUSES = [
  "Present",
  "Half Day",
  "Absent",
  "Leave",
  "Sick Leave",
  "Holiday",
  "Week Off",
  "Unauthorized Leave",
] as const;
