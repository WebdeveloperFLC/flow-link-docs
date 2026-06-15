import type { AttendanceRow } from "./types";

export type PunchSession = {
  /** Row used for punch buttons (today or open carry-over). */
  punchRow: AttendanceRow | null;
  /** Calendar date shown in the station header. */
  displayDate: string;
  /** Open session started on a prior work_date (overnight / 24h). */
  carryOverFrom: string | null;
};

/** Prefer an open check-in session; otherwise today's row. */
export function resolvePunchSession(att: AttendanceRow[], today: string): PunchSession {
  const open = att
    .filter((a) => a.check_in && !a.check_out)
    .sort((a, b) => b.work_date.localeCompare(a.work_date))[0];

  if (open) {
    return {
      punchRow: open,
      displayDate: open.work_date,
      carryOverFrom: open.work_date !== today ? open.work_date : null,
    };
  }

  const todayRow = att.find((a) => a.work_date === today) ?? null;
  return {
    punchRow: todayRow,
    displayDate: today,
    carryOverFrom: null,
  };
}
