import { describe, expect, it } from "vitest";
import {
  filterHolidays,
  holidayMatchesCountry,
  uniqueHolidayDatesInMonth,
} from "@/hr-payroll/lib/holidayFilters";
import type { BranchRow, HolidayRow } from "@/hr-payroll/lib/types";

const branchesById: Record<string, BranchRow> = {
  bIn: { id: "bIn", name: "Genda Circle", country: "IN" },
  bCa: { id: "bCa", name: "Toronto", country: "CA" },
};

const holidays: HolidayRow[] = [
  {
    id: "1",
    org_id: "o",
    holiday_date: "2026-01-26",
    name: "Republic Day",
    type: "National",
    branch_id: "bIn",
    applicable_tags: ["india_staff", "6-Day"],
    branches: { name: "Genda Circle", country: "IN" },
  },
  {
    id: "2",
    org_id: "o",
    holiday_date: "2026-07-01",
    name: "Canada Day",
    type: "National",
    branch_id: "bCa",
    applicable_tags: ["canada_staff"],
    branches: { name: "Toronto", country: "CA" },
  },
];

describe("holidayFilters", () => {
  it("filters by country, branch, and type", () => {
    const india = filterHolidays(holidays, "IN", "All", "All", branchesById);
    expect(india.map((h) => h.name)).toEqual(["Republic Day"]);
    const branch = filterHolidays(holidays, "All", "bCa", "All", branchesById);
    expect(branch.map((h) => h.name)).toEqual(["Canada Day"]);
  });

  it("matches country via tags and branch", () => {
    expect(holidayMatchesCountry(holidays[0], "IN", branchesById)).toBe(true);
    expect(holidayMatchesCountry(holidays[0], "CA", branchesById)).toBe(false);
    expect(holidayMatchesCountry(holidays[1], "CA", branchesById)).toBe(true);
  });

  it("collects unique dates in month", () => {
    expect(uniqueHolidayDatesInMonth(holidays, "2026-01")).toEqual(["2026-01-26"]);
    expect(uniqueHolidayDatesInMonth(holidays, "2026-07")).toEqual(["2026-07-01"]);
  });
});
