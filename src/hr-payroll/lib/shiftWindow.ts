/** Shift timeline helpers — day shifts (10–19) and overnight shifts (19–04). */

export function toMinutes(t: string | null | undefined): number | null {
  if (!t) return null;
  const parts = t.slice(0, 5).split(":").map(Number);
  return parts[0] * 60 + parts[1];
}

/** Logout before login on the clock → shift crosses midnight. */
export function isOvernightShift(loginMin: number, logoutMin: number): boolean {
  return logoutMin < loginMin;
}

/** Map early-morning punches onto the shift timeline after midnight. */
export function punchOnTimeline(min: number, loginMin: number, logoutMin: number): number {
  if (isOvernightShift(loginMin, logoutMin) && min <= logoutMin) {
    return min + 24 * 60;
  }
  return min;
}

export function shiftLogoutEffective(loginMin: number, logoutMin: number): number {
  return isOvernightShift(loginMin, logoutMin) ? logoutMin + 24 * 60 : logoutMin;
}

export function isCheckInDuringShift(
  checkIn: string | null | undefined,
  login: string,
  logout: string,
): boolean {
  const ci = toMinutes(checkIn);
  if (ci == null) return false;
  const lg = toMinutes(login) ?? 600;
  const lo = toMinutes(logout) ?? 1140;
  const ciT = punchOnTimeline(ci, lg, lo);
  const loEff = shiftLogoutEffective(lg, lo);
  return ciT >= lg && ciT <= loEff;
}
