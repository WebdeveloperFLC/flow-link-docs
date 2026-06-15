import type { AttendanceRow } from "./types";

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
