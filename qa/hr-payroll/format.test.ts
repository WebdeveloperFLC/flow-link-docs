import { describe, expect, it } from "vitest";
import { employeeCurrency, formatMoney } from "@/hr-payroll/lib/format";

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
