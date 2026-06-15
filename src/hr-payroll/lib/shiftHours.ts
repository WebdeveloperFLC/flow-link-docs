/** Shift-window vs off-shift hour split — salary uses shift timing only. */

import {
  isCheckInDuringShift,
  punchOnTimeline,
  shiftLogoutEffective,
  toMinutes,
} from "./shiftWindow";

export type ShiftWindow = {
  login: string;
  logout: string;
  breakDur: number;
};

/** Extend check-out past midnight when it is earlier on the clock than check-in. */
function spanMinutes(ci: number, co: number): { ci: number; co: number; gross: number } {
  const end = co <= ci ? co + 24 * 60 : co;
  return { ci, co: end, gross: end - ci };
}

export function isCheckInOffShift(
  checkIn: string | null | undefined,
  login: string,
  logout: string,
): boolean {
  const ci = toMinutes(checkIn);
  if (ci == null) return false;
  return !isCheckInDuringShift(checkIn, login, logout);
}

export type ShiftHourSplit = {
  grossMin: number;
  shiftWorkMin: number;
  offShiftMin: number;
  /** OT eligible for salary — extension past logout when check-in was during shift. */
  otMin: number;
};

export function splitShiftHours(
  checkIn: string | null,
  checkOut: string | null,
  breakMin: number | null | undefined,
  shift: ShiftWindow,
): ShiftHourSplit {
  const ci = toMinutes(checkIn);
  const co = toMinutes(checkOut);
  const lg = toMinutes(shift.login) ?? 600;
  const lo = toMinutes(shift.logout) ?? 1140;
  const loEff = shiftLogoutEffective(lg, lo);
  const brk = Math.max(0, breakMin ?? 0);

  if (ci == null || co == null) {
    return { grossMin: 0, shiftWorkMin: 0, offShiftMin: 0, otMin: 0 };
  }

  const { ci: ciAdj, co: coAdj, gross } = spanMinutes(punchOnTimeline(ci, lg, lo), co);
  if (gross <= 0) {
    return { grossMin: 0, shiftWorkMin: 0, offShiftMin: 0, otMin: 0 };
  }

  const shiftStart = Math.max(ciAdj, lg);
  const shiftEnd = Math.min(coAdj, loEff);
  const shiftGross = Math.max(0, shiftEnd - shiftStart);

  if (shiftGross <= 0) {
    return { grossMin: gross, shiftWorkMin: 0, offShiftMin: gross, otMin: 0 };
  }

  const offBefore = Math.max(0, lg - ciAdj);
  const otMin = coAdj > loEff ? Math.max(0, Math.round(coAdj - loEff)) : 0;
  const shiftBreak = gross > 0 ? Math.round(brk * (shiftGross / gross)) : 0;
  const shiftWorkMin = Math.max(0, shiftGross - shiftBreak);

  return { grossMin: gross, shiftWorkMin, offShiftMin: offBefore, otMin };
}

export function sumOffShiftMinutes(
  rows: { check_in: string | null; check_out: string | null; break_min?: number | null }[],
  shift: ShiftWindow,
): number {
  return rows.reduce((sum, r) => sum + splitShiftHours(r.check_in, r.check_out, r.break_min, shift).offShiftMin, 0);
}
