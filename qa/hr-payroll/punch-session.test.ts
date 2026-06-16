import { describe, expect, it } from "vitest";
import { resolvePunchSession } from "@/hr-payroll/lib/punchSession";
import type { AttendanceRow } from "@/hr-payroll/lib/types";

function row(partial: Partial<AttendanceRow> & Pick<AttendanceRow, "work_date">): AttendanceRow {
  return {
    id: partial.id ?? "a1",
    org_id: "org",
    employee_id: "e1",
    check_in: partial.check_in ?? null,
    check_out: partial.check_out ?? null,
    break_start: null,
    break_end: null,
    break_min: null,
    status: "Present",
    is_mispunch: false,
    source: "self",
    note: null,
    ...partial,
  };
}

describe("resolvePunchSession", () => {
  it("uses today's row when no open session", () => {
    const att = [row({ work_date: "2026-06-16", check_in: "10:00", check_out: "19:00" })];
    const s = resolvePunchSession(att, "2026-06-16");
    expect(s.punchRow?.work_date).toBe("2026-06-16");
    expect(s.carryOverFrom).toBeNull();
  });

  it("keeps open session from yesterday for checkout after midnight", () => {
    const att = [
      row({ id: "y", work_date: "2026-06-15", check_in: "19:48", check_out: null }),
      row({ work_date: "2026-06-16", check_in: null, check_out: null, status: "Absent" }),
    ];
    const s = resolvePunchSession(att, "2026-06-16");
    expect(s.punchRow?.id).toBe("y");
    expect(s.carryOverFrom).toBe("2026-06-15");
  });

  it("prefers today open session over older carry-over", () => {
    const att = [
      row({ id: "y", work_date: "2026-06-15", check_in: "19:48", check_out: null }),
      row({ id: "t", work_date: "2026-06-16", check_in: "05:00", check_out: null }),
    ];
    const s = resolvePunchSession(att, "2026-06-16");
    expect(s.punchRow?.id).toBe("t");
    expect(s.carryOverFrom).toBeNull();
  });
});
