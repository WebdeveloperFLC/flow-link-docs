import { describe, expect, it } from "vitest";
import {
  buildMonthlySalaryStructure,
  buildPayrollSalaryStructure,
  DEFAULT_BONUS_PCT,
} from "../../src/hr-payroll/lib/salaryStructure";
import type { EmployeeRow, PayrollLineRow } from "../../src/hr-payroll/lib/types";

const baseEmp = {
  monthly_gross: 42000,
  basic: 21000,
  hra: 8400,
  conveyance: 1600,
  bonus_percentage: DEFAULT_BONUS_PCT,
  other_allowances: 2000,
  pf_applicable: true,
  esic_applicable: true,
  employer_pf_applicable: true,
  employer_esic_applicable: true,
  employee_pf_pct: 12,
  employer_pf_pct: 12,
  employee_esic_pct: 0.75,
  employer_esic_pct: 3.25,
  pt_applicable: true,
  salary_currency: "INR",
} as EmployeeRow;

describe("buildMonthlySalaryStructure", () => {
  it("computes bonus from basic and total earnings A", () => {
    const s = buildMonthlySalaryStructure({
      salaryPackage: 50000,
      monthlyGross: 42000,
      basic: 21000,
      hra: 8400,
      conveyance: 1600,
      bonusPercentage: 8.33,
      otherAllowances: 2000,
      pfApplicable: true,
      esicApplicable: true,
      employerPfApplicable: true,
      employerEsicApplicable: true,
      ptApplicable: true,
    });
    expect(s.bonusAmount).toBe(Math.round(21000 * 8.33 / 100));
    expect(s.totalEarningsA).toBe(
      21000 + 8400 + 1600 + s.bonusAmount + 2000,
    );
    expect(s.employerPf).toBe(Math.round(Math.min(21000, 15000) * 0.12));
    expect(s.difference).toBe(
      Math.round(50000 - (s.totalEarningsA + s.totalEmployerCostB)),
    );
  });

  it("falls back to monthly_gross when salary_package is null", () => {
    const s = buildMonthlySalaryStructure({
      monthlyGross: 42000,
      basic: 21000,
      hra: 8400,
      conveyance: 1600,
      bonusPercentage: DEFAULT_BONUS_PCT,
      otherAllowances: 0,
    });
    expect(s.salaryPackage).toBe(42000);
  });
});

describe("buildPayrollSalaryStructure", () => {
  it("pro-rates earnings and keeps engine net salary", () => {
    const line = {
      payroll_days: 30,
      payroll_days_effective: 30,
      payable_days: 15,
      monthly_gross: 42000,
      basic: 21000,
      gross_earned: 21000,
      pf_employee: 1260,
      esic_employee: 158,
      pt_employee: 200,
      net_salary: 19382,
      incentive: 0,
      bonus: 0,
    } as PayrollLineRow;
    const s = buildPayrollSalaryStructure(line, baseEmp);
    expect(s.basic).toBe(10500);
    expect(s.netSalary).toBe(19382);
    expect(s.employeePf).toBe(1260);
  });
});
