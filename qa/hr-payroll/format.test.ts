import { describe, expect, it } from "vitest";
import {
  employeeCurrency,
  employeeStatusLabel,
  formatMoney,
  isEmployeeActive,
  isEmployeeInactive,
} from "@/hr-payroll/lib/format";

describe("HR Payroll currency formatting", () => {
  it("formats INR with rupee symbol", () => {
    expect(formatMoney(39500, "INR")).toBe("₹39,500");
  });

  it("formats CAD with CA$ prefix", () => {
    expect(formatMoney(4157, "CAD")).toBe("CA$4,157");
  });

  it("resolves employee currency from salary_currency", () => {
    expect(employeeCurrency({ salary_currency: "CAD", payroll_country: "CA" })).toBe("CAD");
  });

  it("falls back to payroll_country for Canada", () => {
    expect(employeeCurrency({ payroll_country: "CA" })).toBe("CAD");
  });
});

describe("HR Payroll employee status", () => {
  it("treats probation and confirmed as active", () => {
    expect(isEmployeeActive("On Probation")).toBe(true);
    expect(isEmployeeActive("Confirmed")).toBe(true);
    expect(isEmployeeActive("On Notice")).toBe(true);
  });

  it("treats resigned and terminated as inactive", () => {
    expect(isEmployeeInactive("Resigned")).toBe(true);
    expect(isEmployeeInactive("Terminated")).toBe(true);
    expect(isEmployeeActive("Terminated")).toBe(false);
  });

  it("labels inactive statuses for display", () => {
    expect(employeeStatusLabel("Terminated")).toBe("Inactive");
    expect(employeeStatusLabel("Resigned")).toBe("Inactive");
    expect(employeeStatusLabel("On Probation")).toBe("Probation");
  });
});
