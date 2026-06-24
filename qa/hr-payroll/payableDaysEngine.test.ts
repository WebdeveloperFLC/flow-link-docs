import { describe, expect, it } from "vitest";
import {
  computePayroll,
  computeSalaryPayableDays,
  PAYROLL_TEST_VECTORS,
  runVectorSuite,
} from "@/hr-payroll/lib/payrollEngineLogic";

describe("salary payable days engine", () => {
  it("computes legacy payable days with late and mispunch deductions", () => {
    const p = computeSalaryPayableDays({
      payrollDays: 30,
      late: 3,
      mispunch: 3,
    });
    expect(p.payableDays).toBe(28.5);
    expect(p.lateDeduction).toBe(1);
    expect(p.mispunchDeduction).toBe(0.5);
  });

  it("computes mispunch-only payable days", () => {
    const p = computeSalaryPayableDays({
      payrollDays: 30,
      mispunch: 3,
    });
    expect(p.payableDays).toBe(29.5);
    expect(p.mispunchDeduction).toBe(0.5);
  });

  it("gross always from monthly_gross not structure total A", () => {
    const r = computePayroll({
      payrollDays: 30,
      monthly: 42000,
      basic: 27500,
      structureEnabled: true,
      pfApplicable: true,
      structure: {
        salaryPackage: 55062,
        basic: 27500,
        hra: 11000,
        conveyance: 0,
        bonusPercentage: 8.33,
        bonusAmount: 2291,
        otherAllowances: 0,
        totalEarningsA: 40791,
        employeePfPct: 12,
        employerPfPct: 12,
        employeeEsicPct: 0.75,
        employerEsicPct: 3.25,
        employerPfApplicable: true,
        employerEsicApplicable: false,
        ptAmount: 0,
        employerPf: 1800,
        employerEsic: 0,
        totalEmployerCostB: 1800,
        structureDifference: 12471,
      },
    });
    expect(r.grossEarned).toBe(42000);
    expect(r.dailyRate).toBe(1400);
    expect(r.totalEarningsA).toBe(42000);
  });

  it("golden vectors unchanged", () => {
    const { failures, passed, total } = runVectorSuite(PAYROLL_TEST_VECTORS);
    expect(failures).toEqual([]);
    expect(passed).toBe(total);
  });
});
