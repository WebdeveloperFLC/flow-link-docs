import type { AttendanceRow } from "./types";

export type PunchSession = {
  /** Row used for punch buttons (today or open carry-over). */
  punchRow: AttendanceRow | null;
  /** Calendar date shown in the station header. */
  displayDate: string;
  /** Open session started on a prior work_date (overnight / 24h). */
  carryOverFrom: string | null;
};

/** Prefer today's open session; else today; else any open carry-over. */
export function resolvePunchSession(att: AttendanceRow[], today: string): PunchSession {
  const todayRow = att.find((a) => a.work_date === today) ?? null;

  if (todayRow?.check_in && !todayRow.check_out) {
    return { punchRow: todayRow, displayDate: today, carryOverFrom: null };
  }

  const openOther = att
    .filter((a) => a.work_date !== today && a.check_in && !a.check_out)
    .sort((a, b) => b.work_date.localeCompare(a.work_date))[0];

  if (openOther) {
    return {
      punchRow: openOther,
      displayDate: openOther.work_date,
      carryOverFrom: openOther.work_date,
    };
  }

  return {
    punchRow: todayRow,
    displayDate: today,
    carryOverFrom: null,
  };
}
