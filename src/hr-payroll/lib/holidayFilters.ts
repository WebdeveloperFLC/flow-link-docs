import type { BranchRow, HolidayRow } from "./types";

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
