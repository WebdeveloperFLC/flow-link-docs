import { describe, expect, it } from "vitest";
import {
  PAYROLL_STRUCTURE_TEST_VECTORS,
  PAYROLL_TEST_VECTORS,
  computePayroll,
  resolveEmployeeSalaryStructure,
  runVectorSuite,
} from "@/hr-payroll/lib/payrollEngineLogic";

describe("salary structure engine (Phase 1)", () => {
  it("legacy golden vectors unchanged when structure OFF", () => {
    const { failures, passed, total } = runVectorSuite(PAYROLL_TEST_VECTORS);
    expect(failures).toEqual([]);
    expect(passed).toBe(total);
  });

  it("passes TV-STRUCT-01 through TV-STRUCT-05", () => {
    const { failures, passed, total } = runVectorSuite(PAYROLL_STRUCTURE_TEST_VECTORS);
    if (failures.length) console.error(failures);
    expect(passed).toBe(total);
    expect(failures).toEqual([]);
  });

  it("resolveEmployeeSalaryStructure matches CTC example", () => {
    const s = resolveEmployeeSalaryStructure({
      salaryPackage: 55062,
      basic: 27500,
      hra: 11000,
      bonusPercentage: 8.33,
      pfApplicable: true,
      employerPfApplicable: true,
    });
    expect(s.bonusAmount).toBe(2291);
    expect(s.totalEarningsA).toBe(40791);
    expect(s.employerPf).toBe(1800);
    expect(s.structureDifference).toBe(12471);
  });

  it("structure mode ignores legacy bonus on net", () => {
    const structure = resolveEmployeeSalaryStructure({
      basic: 27500,
      hra: 11000,
      bonusPercentage: 8.33,
      pfApplicable: true,
    });
    const r = computePayroll({
      payrollDays: 30,
      monthly: structure.totalEarningsA,
      basic: 27500,
      bonus: 9999,
      structureEnabled: true,
      pfApplicable: true,
      structure,
    });
    expect(r.bonus).toBe(0);
    expect(r.grossEarned).toBe(structure.totalEarningsA);
  });

  it("ESIC eligibility uses Total Earnings (A)", () => {
    const s = resolveEmployeeSalaryStructure({
      basic: 9000,
      hra: 8250,
      bonusPercentage: 8.33,
      esicApplicable: true,
    });
    expect(s.totalEarningsA).toBe(18000);
    const r = computePayroll({
      payrollDays: 30,
      monthly: s.totalEarningsA,
      basic: 9000,
      structureEnabled: true,
      esicApplicable: true,
      pfApplicable: true,
      structure: s,
    });
    expect(r.esicEmployee).toBe(135);
  });
});
