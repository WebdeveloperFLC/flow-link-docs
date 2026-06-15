/** Shift-window vs off-shift hour split — salary uses shift timing only. */

export type ShiftWindow = {
  login: string;
  logout: string;
  breakDur: number;
};

function toMin(t: string | null | undefined): number | null {
  if (!t) return null;
  const parts = t.slice(0, 5).split(":").map(Number);
  return parts[0] * 60 + parts[1];
}

/** Extend check-out past midnight when it is earlier on the clock than check-in. */
function spanMinutes(ci: number, co: number): { ci: number; co: number; gross: number } {
  const end = co <= ci ? co + 24 * 60 : co;
  return { ci, co: end, gross: end - ci };
}

export function isCheckInOffShift(checkIn: string | null | undefined, login: string, logout: string): boolean {
  const ci = toMin(checkIn);
  const lg = toMin(login) ?? 600;
  const lo = toMin(logout) ?? 1140;
  if (ci == null) return false;
  return ci < lg || ci > lo;
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
  const ci = toMin(checkIn);
  const co = toMin(checkOut);
  const lg = toMin(shift.login) ?? 600;
  const lo = toMin(shift.logout) ?? 1140;
  const brk = Math.max(0, breakMin ?? 0);

  if (ci == null || co == null) {
    return { grossMin: 0, shiftWorkMin: 0, offShiftMin: 0, otMin: 0 };
  }

  const { ci: ciAdj, co: coAdj, gross } = spanMinutes(ci, co);
  if (gross <= 0) {
    return { grossMin: 0, shiftWorkMin: 0, offShiftMin: 0, otMin: 0 };
  }

  const offBefore = Math.max(0, lg - ciAdj);

  let otMin = 0;
  let offShift = 0;
  if (ciAdj >= lo) {
    offShift = gross;
  } else if (coAdj > lo) {
    offShift = offBefore;
    otMin = Math.max(0, Math.round(coAdj - lo));
  } else {
    offShift = offBefore;
  }

  const shiftStart = Math.max(ciAdj, lg);
  const shiftEnd = Math.min(coAdj, lo);
  const shiftGross = Math.max(0, shiftEnd - shiftStart);
  const shiftBreak =
    gross > 0 && shiftGross > 0 ? Math.round(brk * (shiftGross / gross)) : 0;
  const shiftWorkMin = Math.max(0, shiftGross - shiftBreak);

  return { grossMin: gross, shiftWorkMin, offShiftMin: offShift, otMin };
}

export function sumOffShiftMinutes(
  rows: { check_in: string | null; check_out: string | null; break_min?: number | null }[],
  shift: ShiftWindow,
): number {
  return rows.reduce((sum, r) => sum + splitShiftHours(r.check_in, r.check_out, r.break_min, shift).offShiftMin, 0);
}
