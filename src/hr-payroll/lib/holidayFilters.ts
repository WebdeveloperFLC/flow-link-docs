import type { BranchRow, EmployeeRow, HolidayRow } from "./types";

export const HOLIDAY_COUNTRY_OPTIONS = [
  { value: "All", label: "All Countries" },
  { value: "IN", label: "India" },
  { value: "CA", label: "Canada" },
] as const;

export type HolidayCountryFilter = "All" | "IN" | "CA";

export const HOLIDAY_TYPE_OPTIONS = ["National", "Festival", "Company", "Optional"] as const;

export function holidayBranchCountry(
  holiday: HolidayRow,
  branchesById: Record<string, BranchRow>,
): string | null {
  if (!holiday.branch_id) return null;
  return branchesById[holiday.branch_id]?.country ?? null;
}

export function holidayMatchesCountry(
  holiday: HolidayRow,
  country: HolidayCountryFilter,
  branchesById: Record<string, BranchRow>,
): boolean {
  if (country === "All") return true;
  const tags = holiday.applicable_tags ?? [];
  const branchCountry = holidayBranchCountry(holiday, branchesById);

  if (country === "CA") {
    if (tags.includes("canada_staff")) return true;
    if (tags.includes("india_staff") && !tags.includes("canada_staff")) return false;
    if (branchCountry === "CA") return true;
    if (branchCountry === "IN") return false;
    return tags.length === 0;
  }

  // India (default)
  if (tags.includes("india_staff")) return true;
  if (tags.includes("canada_staff") && !tags.includes("india_staff")) return false;
  if (branchCountry === "IN") return true;
  if (branchCountry === "CA") return false;
  return tags.length === 0 || tags.some((t) => t !== "canada_staff");
}

export function filterHolidays(
  holidays: HolidayRow[],
  country: HolidayCountryFilter,
  branchId: string,
  typeFilter: string,
  branchesById: Record<string, BranchRow>,
): HolidayRow[] {
  return holidays.filter((h) => {
    if (!holidayMatchesCountry(h, country, branchesById)) return false;
    if (branchId !== "All" && h.branch_id !== branchId) return false;
    if (typeFilter !== "All" && h.type !== typeFilter) return false;
    return true;
  });
}

export function uniqueHolidayDatesInMonth(holidays: HolidayRow[], yearMonth: string): string[] {
  const prefix = `${yearMonth}-`;
  return [...new Set(
    holidays
      .filter((h) => h.holiday_date.startsWith(prefix))
      .map((h) => h.holiday_date),
  )].sort();
}

/** Payroll country used for employee holiday visibility (IN vs CA). */
export function employeeHolidayCountry(emp: EmployeeRow): "IN" | "CA" {
  const pc = (emp.payroll_country ?? "IN").toUpperCase();
  return pc === "CA" ? "CA" : "IN";
}

/** Tags derived from employee profile for holiday applicability checks. */
export function employeeHolidayTags(emp: EmployeeRow): string[] {
  const tags: string[] = [];
  const country = employeeHolidayCountry(emp);
  tags.push(country === "CA" ? "canada_staff" : "india_staff");

  const ww = (emp.work_week ?? "").toLowerCase();
  const shiftDays = emp.shifts?.working_days_per_week;
  if (ww.includes("6") || shiftDays === 6) tags.push("6-Day");
  else if (ww.includes("5") || shiftDays === 5) tags.push("5-Day");
  else tags.push("Day");

  const catCode = emp.hr_employee_categories?.code;
  if (catCode) tags.push(catCode);

  return tags;
}

const STAFF_HOLIDAY_TAGS = new Set(["india_staff", "canada_staff"]);

/**
 * Whether a holiday applies to a specific employee (country, branch, category, shift tags).
 */
export function holidayMatchesEmployee(
  holiday: HolidayRow,
  emp: EmployeeRow,
  branchesById: Record<string, BranchRow>,
): boolean {
  const country = employeeHolidayCountry(emp);
  if (!holidayMatchesCountry(holiday, country, branchesById)) return false;

  if (holiday.branch_id && emp.branch_id && holiday.branch_id !== emp.branch_id) {
    return false;
  }

  const hTags = holiday.applicable_tags ?? [];
  if (hTags.length === 0) return true;

  const empTags = employeeHolidayTags(emp);
  const requiredTags = hTags.filter((t) => !STAFF_HOLIDAY_TAGS.has(t));
  if (requiredTags.length === 0) return true;

  return requiredTags.some((t) => empTags.includes(t));
}

/** Holidays visible to one employee (ESS / employee role calendar). */
export function filterHolidaysForEmployee(
  holidays: HolidayRow[],
  emp: EmployeeRow,
  branchesById: Record<string, BranchRow>,
): HolidayRow[] {
  return holidays.filter((h) => holidayMatchesEmployee(h, emp, branchesById));
}
