import { describe, expect, it } from "vitest";
import { dayMetrics, fmtDur, toMin, todayIso } from "@/hr-payroll/lib/attendanceMetrics";

describe("HR attendance metrics", () => {
  it("computes late minutes beyond grace", () => {
    const m = dayMetrics(
      { check_in: "10:20:00", check_out: "19:00:00", break_start: null, break_end: null, break_min: 45 },
      { login: "10:00", logout: "19:00", grace: 5, breakDur: 45, halfDayAfter: 60, workHrs: 9 },
    );
    expect(m.lateMin).toBe(15);
    expect(m.lateBeyondGrace).toBe(true);
  });

  it("does not count late when punch is outside shift window", () => {
    const m = dayMetrics(
      { check_in: "19:48:00", check_out: "21:30:00", break_start: null, break_end: null, break_min: 0 },
      { login: "10:00", logout: "19:00", grace: 5, breakDur: 45, halfDayAfter: 60, workHrs: 9 },
    );
    expect(m.lateMin).toBe(0);
    expect(m.lateBeyondGrace).toBe(false);
    expect(m.offShiftMin).toBeGreaterThan(0);
    expect(m.otMin).toBe(0);
  });

  it("formats duration", () => {
    expect(fmtDur(90)).toBe("1h 30m");
    expect(fmtDur(null)).toBe("—");
  });

  it("parses time to minutes", () => {
    expect(toMin("10:30")).toBe(630);
  });

  it("todayIso returns YYYY-MM-DD", () => {
    expect(todayIso()).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });
});
