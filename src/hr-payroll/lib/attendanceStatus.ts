import type { AttendanceRow } from "./types";

/** ESS dashboard status per add up.docx */
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
  if (row.break_start && !row.break_end) {
    return { label: "On break", tone: "warn" };
  }
  return { label: "Available", tone: "good" };
}
