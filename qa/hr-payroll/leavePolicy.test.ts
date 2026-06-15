import { describe, expect, it } from "vitest";
import {
  computeInclusiveLeaveDays,
  isFiveDayNightEst,
  isLeaveEligible,
  lateDeductionFromSlab,
  LEAVE_DURATION_HALF,
  LEAVE_ENTITLED,
  LEAVE_ENTITLED_5DAY_NIGHT,
  leaveDaysForDuration,
  leaveDurationLabel,
  leaveEntitlementsForEmployee,
  LEAVE_RULES_REJECT_MSG,
  monthlyPaidLeaveUsed,
  resolveLeaveApplication,
  UNPAID_LEAVE_TYPE,
  validateLeaveNotice,
} from "@/hr-payroll/lib/leavePolicy";

describe("leavePolicy", () => {
  const balances = [
    {
      id: "1",
      org_id: "o",
      employee_id: "e1",
      policy_year: 2026,
      type: "Casual Leave",
      entitled: LEAVE_ENTITLED.casual,
      accrued: 3,
      taken: 0,
    },
    {
      id: "2",
      org_id: "o",
      employee_id: "e1",
      policy_year: 2026,
      type: "Sick Leave",
      entitled: LEAVE_ENTITLED.sick,
      accrued: 2,
      taken: 0,
    },
  ];

  const eligibleEmp = {
    employment_type: "Full time - Permanent",
    status: "Active",
    work_hours: 9,
    probation_end_date: "2025-01-01",
    date_of_joining: "2024-01-01",
  };

  it("counts monthly paid leave for same employee and month", () => {
    const requests = [
      {
        id: "a",
        employee_id: "e1",
        type: "Casual Leave",
        days: 1,
        from_date: "2026-06-10",
        status: "Approved",
      },
      {
        id: "b",
        employee_id: "e1",
        type: "Sick Leave",
        days: 0.5,
        from_date: "2026-06-20",
        status: "Pending",
      },
    ];
    expect(monthlyPaidLeaveUsed(requests, "e1", "2026-06-15")).toBe(1.5);
  });

  it("rejects short notice for 1-3 day leave", () => {
    const applied = new Date("2026-06-10T10:00:00");
    const r = validateLeaveNotice(2, "2026-06-12", applied);
    expect(r.valid).toBe(false);
    expect(r.reason).toContain(LEAVE_RULES_REJECT_MSG);
  });

  it("allows notice when 7+ days ahead", () => {
    const applied = new Date("2026-06-10T10:00:00");
    const r = validateLeaveNotice(2, "2026-06-20", applied);
    expect(r.valid).toBe(true);
  });

  it("blocks ineligible employment type", () => {
    expect(
      isLeaveEligible({
        employment_type: "Interns",
        status: "Active",
        work_hours: 9,
        probation_end_date: null,
        date_of_joining: "2024-01-01",
      }),
    ).toBe(false);
  });

  it("forces unpaid when monthly cap exceeded", () => {
    const requests = [
      {
        id: "a",
        employee_id: "e1",
        type: "Casual Leave",
        days: 1.5,
        from_date: "2026-06-05",
        status: "Approved",
      },
    ];
    const r = resolveLeaveApplication({
      preferredType: "Sick Leave",
      days: 0.5,
      employeeId: "e1",
      fromDate: "2026-06-10",
      balances,
      requests,
      employee: eligibleEmp,
    });
    expect(r.effectiveType).toBe(UNPAID_LEAVE_TYPE);
    expect(r.forcedUnpaid).toBe(true);
  });

  it("allows paid leave when rules pass", () => {
    const r = resolveLeaveApplication({
      preferredType: "Casual Leave",
      days: 1,
      employeeId: "e1",
      fromDate: "2026-12-01",
      balances,
      requests: [],
      employee: eligibleEmp,
    });
    expect(r.effectiveType).toBe("Casual Leave");
    expect(r.forcedUnpaid).toBe(false);
  });

  it("late slab: 1-3 late = 1 day deduction", () => {
    expect(lateDeductionFromSlab(2)).toBe(1.0);
    expect(lateDeductionFromSlab(5)).toBe(1.5);
  });

  it("5-day night EST gets 7+3 = 10 annual entitlement", () => {
    expect(isFiveDayNightEst("5-Day", "Night")).toBe(true);
    expect(isFiveDayNightEst("5-Day", "Day")).toBe(false);
    expect(leaveEntitlementsForEmployee("5-Day", "Night")).toEqual(LEAVE_ENTITLED_5DAY_NIGHT);
    expect(LEAVE_ENTITLED_5DAY_NIGHT.casual + LEAVE_ENTITLED_5DAY_NIGHT.sick).toBe(10);
  });

  it("computes leave days from duration and date range", () => {
    expect(computeInclusiveLeaveDays("2026-06-10", "2026-06-12")).toBe(3);
    expect(leaveDaysForDuration(LEAVE_DURATION_HALF, "2026-06-10", "2026-06-10")).toBe(0.5);
    expect(leaveDurationLabel(0.5, LEAVE_DURATION_HALF, "First Half")).toBe("Half Day · First Half");
  });
});
