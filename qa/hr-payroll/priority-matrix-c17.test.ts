/**
 * Phase C priority matrix tests — spec: docs/HR_PAYROLL_PHASE_C_LOCKED_SPEC.md
 */
import { describe, expect, it } from "vitest";
import {
  PHASE_C_DAILY_CREDIT_CAP,
  applyPriorityMatrixC17,
  computeEarnedPayable,
  payrollDaysEffective,
} from "@/hr-payroll/lib/earnedDaysResolver";
import { computePayroll } from "@/hr-payroll/lib/payrollEngineLogic";

describe("Phase C priority matrix C17", () => {
  it("C1: worked WO + comp-off = additive up to 2.0", () => {
    const r = applyPriorityMatrixC17({
      eligible: true,
      status: "Present",
      isWeeklyOff: true,
      halfLeaveApproved: false,
      compOffApproved: true,
      isMispunch: false,
      isLate: false,
    });
    expect(r.dayCredit).toBe(2.0);
    expect(r.baseCredit + r.compOffBonus).toBeLessThanOrEqual(PHASE_C_DAILY_CREDIT_CAP);
  });

  it("C1: cap prevents credit above 2.0", () => {
    const r = applyPriorityMatrixC17({
      eligible: true,
      status: "Present",
      isWeeklyOff: true,
      halfLeaveApproved: false,
      compOffApproved: true,
      isMispunch: false,
      isLate: false,
    });
    expect(r.dayCredit).toBeLessThanOrEqual(2.0);
  });

  it("C2: half leave + half present = 1.0", () => {
    const r = applyPriorityMatrixC17({
      eligible: true,
      status: "Half Day",
      isWeeklyOff: false,
      halfLeaveApproved: true,
      compOffApproved: false,
      isMispunch: false,
      isLate: false,
    });
    expect(r.dayCredit).toBe(1.0);
  });

  it("C3: holiday earns 1.0", () => {
    const r = applyPriorityMatrixC17({
      eligible: true,
      status: "Holiday",
      isWeeklyOff: false,
      halfLeaveApproved: false,
      compOffApproved: false,
      isMispunch: false,
      isLate: false,
    });
    expect(r.dayCredit).toBe(1.0);
    expect(r.ulDay).toBe(false);
  });

  it("C5: no late eligibility on half day", () => {
    const r = applyPriorityMatrixC17({
      eligible: true,
      status: "Half Day",
      isWeeklyOff: false,
      halfLeaveApproved: false,
      compOffApproved: false,
      isMispunch: false,
      isLate: true,
    });
    expect(r.lateEligible).toBe(false);
  });

  it("C4: mispunch eligible only when is_mispunch", () => {
    const r = applyPriorityMatrixC17({
      eligible: true,
      status: "Absent",
      isWeeklyOff: false,
      halfLeaveApproved: false,
      compOffApproved: false,
      isMispunch: true,
      isLate: false,
    });
    expect(r.mispunchEligible).toBe(true);
  });

  it("P0: ineligible date = 0 credit", () => {
    const r = applyPriorityMatrixC17({
      eligible: false,
      status: "Present",
      isWeeklyOff: false,
      halfLeaveApproved: false,
      compOffApproved: false,
      isMispunch: false,
      isLate: false,
    });
    expect(r.dayCredit).toBe(0);
  });
});

describe("Phase C C7 payroll_days_effective", () => {
  it("full cycle uses configured payroll days", () => {
    expect(
      payrollDaysEffective("2026-06-01", "2026-06-30", 30, "2026-05-01", null),
    ).toBe(30);
  });

  it("joiner mid-cycle uses eligible calendar days", () => {
    expect(
      payrollDaysEffective("2026-06-01", "2026-06-30", 30, "2026-06-16", null),
    ).toBe(15);
  });

  it("exiter mid-cycle uses eligible calendar days", () => {
    expect(
      payrollDaysEffective("2026-06-01", "2026-06-30", 30, null, "2026-06-15"),
    ).toBe(15);
  });
});

describe("Phase C earned payable (no comp_off cycle add)", () => {
  it("earned payable uses attendance_earned minus deductions", () => {
    const r = computeEarnedPayable({
      payrollDays: 30,
      payrollDaysEffective: 30,
      monthly: 30000,
      attendanceEarned: 28,
      mispunch: 3,
    });
    expect(r.payableDays).toBe(27.5);
    expect(r.dailyRate).toBe(1000);
    expect(r.grossEarned).toBe(27500);
  });
});

describe("Phase C legacy parity anchor IM-06", () => {
  it("legacy TV02 payable unchanged at 29.5 with mispunch 3", () => {
    const r = computePayroll({
      payrollDays: 30,
      monthly: 42000,
      basic: 21000,
      mispunch: 3,
      ptApplicable: false,
      formulaMode: "legacy",
    });
    expect(r.payableDays).toBe(29.5);
    expect(r.netSalary).toBe(39500);
  });
});
