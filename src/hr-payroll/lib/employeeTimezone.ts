/** Employee-local time for punches — Supabase stores UTC; we send local wall time. */

export const TZ_INDIA = "Asia/Kolkata";
export const TZ_CANADA_EST = "America/Toronto";

export function timezoneForEmployee(
  emp?: { payroll_country?: string | null } | null,
  shift?: { timezone?: string | null } | null,
): string {
  if (shift?.timezone?.trim()) return shift.timezone.trim();
  const c = (emp?.payroll_country ?? "IN").toUpperCase();
  if (c === "CA" || c === "CAN" || c === "CANADA") return TZ_CANADA_EST;
  return TZ_INDIA;
}

export function timezoneAbbrev(tz: string): string {
  if (tz === TZ_INDIA) return "IST";
  if (tz === TZ_CANADA_EST) return "EST";
  try {
    const parts = new Intl.DateTimeFormat("en-US", { timeZone: tz, timeZoneName: "short" }).formatToParts(
      new Date(),
    );
    return parts.find((p) => p.type === "timeZoneName")?.value ?? tz;
  } catch {
    return tz;
  }
}

/** YYYY-MM-DD in employee timezone (for work_date). */
export function todayIsoInTz(tz: string, at: Date = new Date()): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: tz,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(at);
}

/** HH:MM or HH:MM:SS in employee timezone (for p_time / p_check_in). */
export function nowTimeInTz(tz: string, at: Date = new Date(), withSeconds = true): string {
  const t = at.toLocaleTimeString("en-GB", {
    timeZone: tz,
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  });
  return withSeconds ? t : t.slice(0, 5);
}

export function formatClockInTz(tz: string, at: Date = new Date()): string {
  return at.toLocaleTimeString("en-IN", { timeZone: tz, hour12: false });
}

export function formatDateLongInTz(tz: string, at: Date = new Date()): string {
  return at.toLocaleDateString("en-IN", {
    timeZone: tz,
    weekday: "long",
    day: "numeric",
    month: "long",
  });
}
