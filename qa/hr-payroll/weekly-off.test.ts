import { describe, expect, it } from "vitest";
import {
  DEFAULT_WEEKLY_OFF_POLICY,
  employeeEligibleForAttendance,
  isWeeklyOffDay,
  shouldStampWeeklyOff,
  weeklyOffDowForWorkWeek,
  workWeekFromShiftDays,
} from "@/hr-payroll/lib/weeklyOff";

describe("workWeekFromShiftDays", () => {
  it("6+ working days → 6-Day", () => {
    expect(workWeekFromShiftDays(6)).toBe("6-Day");
    expect(workWeekFromShiftDays(7)).toBe("6-Day");
  });

  it("5 or fewer working days → 5-Day", () => {
    expect(workWeekFromShiftDays(5)).toBe("5-Day");
    expect(workWeekFromShiftDays(4)).toBe("5-Day");
  });
});

describe("weekly off weekdays (Phase B)", () => {
  it("5-Day work week → Saturday and Sunday", () => {
    expect(weeklyOffDowForWorkWeek("5-Day")).toEqual([6, 0]);
    expect(isWeeklyOffDay("2026-06-06", "5-Day")).toBe(true); // Saturday
    expect(isWeeklyOffDay("2026-06-07", "5-Day")).toBe(true); // Sunday
    expect(isWeeklyOffDay("2026-06-08", "5-Day")).toBe(false); // Monday
  });

  it("6-Day work week → Sunday only", () => {
    expect(weeklyOffDowForWorkWeek("6-Day")).toEqual([0]);
    expect(isWeeklyOffDay("2026-06-06", "6-Day")).toBe(false); // Saturday works
    expect(isWeeklyOffDay("2026-06-07", "6-Day")).toBe(true); // Sunday
  });

  it("supports custom policy for future work weeks", () => {
    const custom = { five_day_off_dow: [5, 6, 0], six_day_off_dow: [0, 6] };
    expect(isWeeklyOffDay("2026-06-05", "5-Day", custom)).toBe(true); // Friday
  });
});

describe("employee eligibility", () => {
  it("respects joining and exit dates", () => {
    expect(
      employeeEligibleForAttendance({
        status: "Confirmed",
        dateOfJoining: "2026-06-10",
        workDate: "2026-06-07",
      }),
    ).toBe(false);
    expect(
      employeeEligibleForAttendance({
        status: "Confirmed",
        exitDate: "2026-06-15",
        workDate: "2026-06-20",
      }),
    ).toBe(false);
    expect(
      employeeEligibleForAttendance({
        status: "Terminated",
        workDate: "2026-06-07",
      }),
    ).toBe(false);
  });
});

describe("shouldStampWeeklyOff", () => {
  const base = {
    workDate: "2026-06-07",
    workWeek: "6-Day" as const,
    employeeStatus: "Confirmed",
  };

  it("stamps Sunday for 6-Day employee", () => {
    expect(shouldStampWeeklyOff(base)).toBe(true);
  });

  it("does not stamp Holiday", () => {
    expect(shouldStampWeeklyOff({ ...base, existingStatus: "Holiday" })).toBe(false);
  });

  it("does not stamp Present (worked on weekly off)", () => {
    expect(shouldStampWeeklyOff({ ...base, existingStatus: "Present" })).toBe(false);
  });

  it("stamps Absent on weekly off day", () => {
    expect(shouldStampWeeklyOff({ ...base, existingStatus: "Absent" })).toBe(true);
  });

  it("stamps existing Week Off (refresh system row)", () => {
    expect(shouldStampWeeklyOff({ ...base, existingStatus: "Week Off" })).toBe(true);
  });

  it("uses default policy constants", () => {
    expect(DEFAULT_WEEKLY_OFF_POLICY.five_day_off_dow).toEqual([6, 0]);
    expect(DEFAULT_WEEKLY_OFF_POLICY.six_day_off_dow).toEqual([0]);
  });
});
