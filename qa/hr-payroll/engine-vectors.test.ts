import { describe, expect, it } from "vitest";
import {
  PAYROLL_TEST_VECTORS,
  calendarDaysInMonth,
  computePayroll,
  lateDeductionDays,
  mispunchDeductionDays,
  runVectorSuite,
} from "@/hr-payroll/lib/payrollEngineLogic";

describe("HR Payroll engine — golden vectors", () => {
  it("passes full TV01–TV33 suite", () => {
    const { failures, passed, total } = runVectorSuite();
    if (failures.length) {
      console.error("Vector failures:", failures);
    }
    expect(passed).toBe(total);
    expect(failures).toEqual([]);
  });

  it.each(PAYROLL_TEST_VECTORS)("$id anchor", (v) => {
    const r = computePayroll(v.input);
    for (const [key, exp] of Object.entries(v.expected)) {
      expect(r[key as keyof typeof r]).toBe(exp);
    }
  });
});

describe("HR Payroll engine — slab boundaries", () => {
  it("TV02 Isha anchor: 29.5 payable, ₹39,500 net (Excel baseline, PT off)", () => {
    const r = computePayroll({
      payrollDays: 30,
      monthly: 42000,
      basic: 21000,
      mispunch: 3,
      ptApplicable: false,
    });
    expect(r.payableDays).toBe(29.5);
    expect(r.netSalary).toBe(39500);
  });

  it("TV02A India default: ₹200 PT → ₹39,300 net", () => {
    const r = computePayroll({
      payrollDays: 30,
      monthly: 42000,
      basic: 21000,
      mispunch: 3,
      ptApplicable: true,
      professionalTax: 200,
    });
    expect(r.payableDays).toBe(29.5);
    expect(r.ptEmployee).toBe(200);
    expect(r.netSalary).toBe(39300);
  });

  it("late slab caps at 5 days for 28+", () => {
    expect(lateDeductionDays(28)).toBe(5);
    expect(lateDeductionDays(99)).toBe(5);
  });

  it("mispunch 2 free per month", () => {
    expect(mispunchDeductionDays(2)).toBe(0);
    expect(mispunchDeductionDays(3)).toBe(0.5);
  });
});

describe("HR Payroll engine — Canada", () => {
  it("TV31 CAD employee: CPP + EI on gross", () => {
    const r = computePayroll({
      payrollDays: 30,
      monthly: 4500,
      basic: 2250,
      payrollCountry: "CA",
    });
    expect(r.pfEmployee).toBe(268);
    expect(r.esicEmployee).toBe(75);
    expect(r.netSalary).toBe(4157);
  });
});

describe("HR Payroll — calendar month divisor", () => {
  it("Feb 2026 has 28 days", () => {
    expect(calendarDaysInMonth(2026, 2)).toBe(28);
  });
  it("Jun 2026 has 30 days", () => {
    expect(calendarDaysInMonth(2026, 6)).toBe(30);
  });
});
