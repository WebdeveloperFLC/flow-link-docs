import {
  companiesForPayrollRegion,
  type PayrollEntityRegion,
} from "./payrollCompanies";
import type { BranchRow, CompanyRow, PayrollCycleRow, PayrollLineRow } from "./types";

export const PAYROLL_VERIFY_COUNTRIES = [
  { value: "All", label: "All Countries" },
  { value: "IN", label: "India" },
  { value: "CA", label: "Canada" },
] as const;

export const PAYROLL_VERIFY_STATUSES = [
  { value: "All", label: "All Statuses" },
  { value: "Draft", label: "Draft" },
  { value: "Processed", label: "Processed" },
  { value: "Approved", label: "Approved" },
  { value: "Locked", label: "Locked" },
  { value: "Paid", label: "Paid" },
] as const;

export type PayrollCountryFilter = "All" | PayrollEntityRegion;
export type PayrollStatusFilter = "All" | "Draft" | "Processed" | "Approved" | "Locked" | "Paid";

export function todayIsoDate(): string {
  return new Date().toISOString().slice(0, 10);
}

export function cycleOverlapsDateRange(
  cycle: Pick<PayrollCycleRow, "start_date" | "end_date">,
  fromDate: string,
  toDate: string,
): boolean {
  if (!fromDate || !toDate) return true;
  return cycle.start_date <= toDate && cycle.end_date >= fromDate;
}

/** Cycles whose period overlaps the selected date range (for cycle dropdown). */
export function cyclesInDateRange(
  cycles: PayrollCycleRow[],
  fromDate: string,
  toDate: string,
): PayrollCycleRow[] {
  return cycles.filter((c) => cycleOverlapsDateRange(c, fromDate, toDate));
}

/** Cycles matching date range + optional cycle id + optional status. */
export function cyclesMatchingVerifyFilters(
  cycles: PayrollCycleRow[],
  fromDate: string,
  toDate: string,
  cycleId: string,
  statusFilter: PayrollStatusFilter,
): PayrollCycleRow[] {
  return cycles.filter((c) => {
    if (!cycleOverlapsDateRange(c, fromDate, toDate)) return false;
    if (cycleId !== "All" && c.id !== cycleId) return false;
    if (statusFilter !== "All" && c.status !== statusFilter) return false;
    return true;
  });
}

export function verifyDateRangeLabel(fromDate: string, toDate: string): string {
  return `${fromDate} to ${toDate}`;
}

export function verifyExportFileStem(fromDate: string, toDate: string): string {
  return `salary_register_${fromDate}_to_${toDate}`;
}

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
  fromDate?: string,
  toDate?: string,
  cycleId?: string,
  statusFilter?: PayrollStatusFilter,
  defaultFrom?: string,
  defaultTo?: string,
): boolean {
  return Boolean(
    country !== "All" ||
      branchId !== "All" ||
      companyId !== "All" ||
      (fromDate && defaultFrom && fromDate !== defaultFrom) ||
      (toDate && defaultTo && toDate !== defaultTo) ||
      (cycleId != null && cycleId !== "All") ||
      (statusFilter != null && statusFilter !== "All"),
  );
}
