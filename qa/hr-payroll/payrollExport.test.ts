import { describe, expect, it } from "vitest";
import { isPayrollSlipCycle } from "../../src/hr-payroll/lib/payrollSlipPolicy";
import { salarySlipHtml } from "../../src/hr-payroll/lib/salarySlip";
import {
  csvEscapeCell,
  mergeRegisterExportWithClientPt,
  registerPdfFooterHtml,
  registerTotalsByCurrency,
  REGISTER_GROSS_COL_INDEX,
} from "../../src/hr-payroll/lib/payrollExport";
import type { EmployeeRow, PayrollCycleRow, PayrollLineRow } from "../../src/hr-payroll/lib/types";

describe("isPayrollSlipCycle", () => {
  it("allows Locked and Paid only", () => {
    expect(isPayrollSlipCycle("Locked")).toBe(true);
    expect(isPayrollSlipCycle("Paid")).toBe(true);
    expect(isPayrollSlipCycle("Draft")).toBe(false);
    expect(isPayrollSlipCycle("Processed")).toBe(false);
    expect(isPayrollSlipCycle("Approved")).toBe(false);
  });
});

describe("salarySlipHtml Canada tax", () => {
  const emp = {
    full_name: "CA Test",
    emp_code: "FL-CA01",
    payroll_country: "CA",
    salary_currency: "CAD",
    department: "Ops",
    branches: { name: "Toronto" },
    tds_applicable: true,
  } as EmployeeRow;

  const line = {
    payroll_days: 30,
    payable_days: 28,
    daily_rate: 100,
    gross_earned: 2800,
    incentive: 0,
    bonus: 0,
    pf_employee: 150,
    esic_employee: 40,
    pt_employee: 320,
    net_salary: 2290,
  } as PayrollLineRow;

  const cycle = {
    label: "Jun 2026",
    payroll_days: 30,
    start_date: "2026-06-01",
    end_date: "2026-06-30",
    status: "Locked",
  } as PayrollCycleRow;

  it("includes income tax line for Canada when pt_employee > 0", () => {
    const html = salarySlipHtml(emp, line, cycle);
    expect(html).toContain("Income tax");
    expect(html).toMatch(/320|CA\$|CAD/);
  });
});

describe("payrollExport", () => {
  it("escapes commas and quotes in CSV cells", () => {
    expect(csvEscapeCell('Acme, Inc')).toBe('"Acme, Inc"');
    expect(csvEscapeCell('Say "hi"')).toBe('"Say ""hi"""');
    expect(csvEscapeCell(42)).toBe("42");
  });

  it("merges PT from client rows onto server export", () => {
    const server = [
      {
        emp_code: "E1",
        full_name: "Test",
        pt_employee: 0,
        gross_earned: 1000,
        net_salary: 900,
      },
    ];
    const client = [
      {
        emp_code: "E1",
        full_name: "Test",
        pt_employee: 200,
        currency: "INR",
        gross_earned: 1000,
        net_salary: 800,
      },
    ];
    const merged = mergeRegisterExportWithClientPt(
      server as import("../../src/hr-payroll/lib/payrollExport").PayrollRegisterRow[],
      client as import("../../src/hr-payroll/lib/payrollExport").PayrollRegisterRow[],
    );
    expect(merged[0].pt_employee).toBe(200);
    expect(merged[0].currency).toBe("INR");
  });

  it("totals by currency separately", () => {
    const totals = registerTotalsByCurrency([
      { currency: "INR", gross_earned: 1000, net_salary: 900 } as never,
      { currency: "CAD", gross_earned: 500, net_salary: 400 } as never,
      { currency: "INR", gross_earned: 2000, net_salary: 1800 } as never,
    ]);
    expect(totals.INR).toEqual({ gross: 3000, net: 2700 });
    expect(totals.CAD).toEqual({ gross: 500, net: 400 });
  });

  it("PDF footer aligns gross and net columns", () => {
    expect(REGISTER_GROSS_COL_INDEX).toBe(18);
    const footer = registerPdfFooterHtml([
      {
        currency: "INR",
        gross_earned: 50000,
        net_salary: 45000,
      } as never,
    ]);
    expect(footer).toContain('colspan="18"');
    expect(footer).toContain('colspan="5"');
    expect(footer).toContain("Totals (INR)");
  });
});
