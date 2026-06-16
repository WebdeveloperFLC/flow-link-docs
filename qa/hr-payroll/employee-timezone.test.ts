import { describe, expect, it } from "vitest";
import {
  timezoneForEmployee,
  TZ_CANADA_EST,
  TZ_INDIA,
  todayIsoInTz,
} from "@/hr-payroll/lib/employeeTimezone";

describe("employeeTimezone", () => {
  it("maps India payroll country to IST", () => {
    expect(timezoneForEmployee({ payroll_country: "IN" })).toBe(TZ_INDIA);
  });

  it("maps Canada payroll country to America/Toronto (EST)", () => {
    expect(timezoneForEmployee({ payroll_country: "CA" })).toBe(TZ_CANADA_EST);
  });

  it("prefers shift timezone when set", () => {
    expect(
      timezoneForEmployee({ payroll_country: "IN" }, { timezone: "America/Toronto" }),
    ).toBe("America/Toronto");
  });

  it("todayIsoInTz returns YYYY-MM-DD", () => {
    expect(todayIsoInTz(TZ_INDIA)).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });
});
