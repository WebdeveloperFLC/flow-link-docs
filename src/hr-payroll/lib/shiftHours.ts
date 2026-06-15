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

  if (ci == null || co == null || co <= ci) {
    return { grossMin: 0, shiftWorkMin: 0, offShiftMin: 0, otMin: 0 };
  }

  const gross = co - ci;
  const offBefore = Math.max(0, lg - ci);

  let otMin = 0;
  let offShift = 0;
  if (ci >= lo) {
    // Entirely outside office hours (e.g. evening-only session) — performance tracking only.
    offShift = gross;
  } else if (co > lo) {
    offShift = offBefore;
    otMin = Math.max(0, Math.round(co - lo));
  } else {
    offShift = offBefore;
  }

  const shiftStart = Math.max(ci, lg);
  const shiftEnd = Math.min(co, lo);
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
