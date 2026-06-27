import { describe, expect, it } from "vitest";
import {
  filterHolidays,
  filterHolidaysForEmployee,
  holidayMatchesCountry,
  uniqueHolidayDatesInMonth,
} from "@/hr-payroll/lib/holidayFilters";
import type { BranchRow, EmployeeRow, HolidayRow } from "@/hr-payroll/lib/types";

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

  it("includes org-wide holidays when filtering by branch", () => {
    const globalHoliday: HolidayRow = {
      id: "3",
      org_id: "o",
      holiday_date: "2026-08-15",
      name: "Independence Day",
      type: "National",
      branch_id: null,
      applicable_tags: ["india_staff"],
    };
    const all = [...holidays, globalHoliday];
    const mumbaiOnly = filterHolidays(all, "All", "bIn", "All", branchesById);
    expect(mumbaiOnly.map((h) => h.name)).toContain("Independence Day");
    expect(mumbaiOnly.map((h) => h.name)).toContain("Republic Day");
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

  it("filters holidays per employee country (IN vs CA)", () => {
    const indiaEmp: EmployeeRow = {
      id: "e1",
      org_id: "o",
      emp_code: "IN001",
      full_name: "India Staff",
      branch_id: "bIn",
      payroll_country: "IN",
      work_week: "6-Day",
      status: "active",
    };
    const canadaEmp: EmployeeRow = {
      id: "e2",
      org_id: "o",
      emp_code: "CA001",
      full_name: "Canada Staff",
      branch_id: "bCa",
      payroll_country: "CA",
      work_week: "5-Day",
      status: "active",
    };

    const indiaView = filterHolidaysForEmployee(holidays, indiaEmp, branchesById);
    expect(indiaView.map((h) => h.name)).toEqual(["Republic Day"]);

    const canadaView = filterHolidaysForEmployee(holidays, canadaEmp, branchesById);
    expect(canadaView.map((h) => h.name)).toEqual(["Canada Day"]);
  });
});
