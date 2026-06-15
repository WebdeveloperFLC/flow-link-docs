import { describe, expect, it } from "vitest";
import { companiesForPayrollRegion, PAYROLL_COMPANY_CATALOG } from "@/hr-payroll/lib/payrollCompanies";
import type { CompanyRow } from "@/hr-payroll/lib/types";

describe("payrollCompanies", () => {
  const companies: CompanyRow[] = PAYROLL_COMPANY_CATALOG.map((c, i) => ({
    id: `id-${i}`,
    name: c.legalName,
    legal_name: c.legalName,
    currency: c.currency,
    country: c.region,
    is_active: true,
  }));

  it("lists only Indian companies for IN region", () => {
    const indian = companiesForPayrollRegion(companies, "IN");
    expect(indian).toHaveLength(5);
    expect(indian.every((c) => c.country === "IN")).toBe(true);
    expect(indian.map((c) => c.legal_name)).not.toContain("Future Link Academic Services Private Limited");
  });

  it("lists only Canadian companies for CA region", () => {
    const ca = companiesForPayrollRegion(companies, "CA");
    expect(ca).toHaveLength(3);
    expect(ca.every((c) => c.currency === "CAD")).toBe(true);
  });
});
