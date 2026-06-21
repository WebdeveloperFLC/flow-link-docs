import {
  companiesForPayrollRegion,
  type PayrollEntityRegion,
} from "./payrollCompanies";
import type { BranchRow, CompanyRow, PayrollLineRow } from "./types";

export const PAYROLL_VERIFY_COUNTRIES = [
  { value: "All", label: "All Countries" },
  { value: "IN", label: "India" },
  { value: "CA", label: "Canada" },
] as const;

export type PayrollCountryFilter = "All" | PayrollEntityRegion;

export function employeePayrollCountry(
  emp?: {
    payroll_country?: string | null;
    salary_currency?: string | null;
  } | null,
): PayrollEntityRegion {
  if (emp?.payroll_country === "CA") return "CA";
  if (emp?.salary_currency === "CAD") return "CA";
  return "IN";
}

export function branchMatchesCountry(
  branch: Pick<BranchRow, "country">,
  country: PayrollCountryFilter,
): boolean {
  if (country === "All") return true;
  const bc = (branch.country ?? "IN").toUpperCase();
  return bc === country;
}

export function branchesForPayrollCountry(
  branches: BranchRow[],
  country: PayrollCountryFilter,
): BranchRow[] {
  if (country === "All") return branches;
  return branches.filter((b) => branchMatchesCountry(b, country));
}

export function companiesForPayrollCountryFilter(
  companies: CompanyRow[],
  country: PayrollCountryFilter,
): CompanyRow[] {
  if (country === "All") {
    return [
      ...companiesForPayrollRegion(companies, "IN"),
      ...companiesForPayrollRegion(companies, "CA"),
    ];
  }
  return companiesForPayrollRegion(companies, country);
}

export function filterPayrollLines(
  lines: PayrollLineRow[],
  country: PayrollCountryFilter,
  branchId: string,
  companyId: string,
): PayrollLineRow[] {
  return lines.filter((l) => {
    const emp = l.employees;
    if (!emp) return false;
    if (country !== "All" && employeePayrollCountry(emp) !== country) return false;
    if (branchId !== "All" && emp.branch_id !== branchId) return false;
    if (companyId !== "All" && emp.company_id !== companyId) return false;
    return true;
  });
}

export function hasActivePayrollFilters(
  country: PayrollCountryFilter,
  branchId: string,
  companyId: string,
): boolean {
  return country !== "All" || branchId !== "All" || companyId !== "All";
}
