import { describe, expect, it } from "vitest";
import {
  branchesForPayrollCountry,
  companiesForPayrollCountryFilter,
  employeePayrollCountry,
  filterPayrollLines,
  hasActivePayrollFilters,
} from "@/hr-payroll/lib/payrollVerifyFilters";
import type { BranchRow, CompanyRow, PayrollLineRow } from "@/hr-payroll/lib/types";

const branches: BranchRow[] = [
  { id: "b-in", name: "Genda Circle", country: "IN" },
  { id: "b-ca", name: "Toronto", country: "CA" },
];

const companies: CompanyRow[] = [
  {
    id: "c-in",
    name: "Future Link Visa Consultants Pvt Ltd",
    legal_name: "Future Link Visa Consultants Pvt Ltd",
    country: "IN",
    currency: "INR",
    is_active: true,
  },
  {
    id: "c-ca",
    name: "Futureway Consultants Inc",
    legal_name: "Futureway Consultants Inc",
    country: "CA",
    currency: "CAD",
    is_active: true,
  },
];

function line(
  overrides: Partial<PayrollLineRow> & {
    employee_id?: string;
    payroll_country?: string;
    branch_id?: string;
    company_id?: string;
  },
): PayrollLineRow {
  const {
    payroll_country = "IN",
    branch_id = "b-in",
    company_id = "c-in",
    ...rest
  } = overrides;
  return {
    id: rest.id ?? "line-1",
    org_id: "org",
    cycle_id: "cycle",
    employee_id: overrides.employee_id ?? "e1",
    mispunch_count: 0,
    late_count: 0,
    leaves_taken: 0,
    paid_leaves: 0,
    comp_off: 0,
    ul_count: 0,
    sandwich_count: 0,
    unpaid_training: 0,
    late_deduction: 0,
    mispunch_deduction: 0,
    payable_days: 30,
    daily_rate: 1000,
    gross_earned: 30000,
    incentive: 0,
    bonus: 0,
    pf_employee: 0,
    esic_employee: 0,
    net_salary: 30000,
    is_overridden: false,
    payroll_days: 30,
    monthly_gross: 30000,
    basic: 15000,
    ot_minutes: 0,
    ot_pay: 0,
    override_json: null,
    ...rest,
    employees: {
      id: overrides.employee_id ?? "e1",
      org_id: "org",
      emp_code: "FL-1",
      full_name: "Test",
      monthly_gross: 30000,
      status: "Confirmed",
      employment_type: "Full-Time",
      work_week: "6-Day",
      payroll_country,
      branch_id,
      company_id,
      branches: branches.find((b) => b.id === branch_id) ?? null,
      companies: companies.find((c) => c.id === company_id) ?? null,
    },
  } as PayrollLineRow;
}

describe("payrollVerifyFilters", () => {
  it("resolves employee payroll country", () => {
    expect(employeePayrollCountry({ payroll_country: "CA" })).toBe("CA");
    expect(employeePayrollCountry({ payroll_country: "IN" })).toBe("IN");
    expect(employeePayrollCountry({ salary_currency: "CAD" })).toBe("CA");
  });

  it("filters branches and companies by country", () => {
    expect(branchesForPayrollCountry(branches, "IN").map((b) => b.name)).toEqual(["Genda Circle"]);
    expect(branchesForPayrollCountry(branches, "CA").map((b) => b.name)).toEqual(["Toronto"]);
    const inCompanies = companiesForPayrollCountryFilter(companies, "IN");
    expect(inCompanies.some((c) => c.id === "c-in")).toBe(true);
    expect(inCompanies.some((c) => c.id === "c-ca")).toBe(false);
  });

  it("filters payroll lines by country, branch, and company together", () => {
    const lines = [
      line({ id: "1", branch_id: "b-in", company_id: "c-in", payroll_country: "IN" }),
      line({ id: "2", employee_id: "e2", branch_id: "b-ca", company_id: "c-ca", payroll_country: "CA" }),
    ];
    const filtered = filterPayrollLines(lines, "IN", "b-in", "c-in");
    expect(filtered.map((l) => l.id)).toEqual(["1"]);
  });

  it("detects active filter state", () => {
    expect(hasActivePayrollFilters("All", "All", "All")).toBe(false);
    expect(hasActivePayrollFilters("IN", "All", "All")).toBe(true);
  });
});
