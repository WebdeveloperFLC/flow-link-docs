import { describe, it, expect } from "vitest";
import {
  directPaidTolerance,
  isWithinDirectPaidTolerance,
  isFeeLineExempt,
  isFeeLineWaived,
  areExemptAndWaivedDistinct,
  defaultBillableAndTracked,
  deriveAccountingTreatment,
  isPassThroughLine,
} from "./helpers";

describe("feeMaster helpers", () => {
  it("directPaidTolerance uses lesser of 5% or CAD 10 equivalent", () => {
    // CAD 235 master, fx 1 — 5% = 11.75, cap = 10 → tolerance 10
    expect(directPaidTolerance(235, 1)).toBe(10);
    // Small amount — 5% wins
    expect(directPaidTolerance(100, 1)).toBe(5);
  });

  it("isWithinDirectPaidTolerance for CAD 235 master recorded 240", () => {
    expect(isWithinDirectPaidTolerance(235, 240, 1)).toBe(true);
    expect(isWithinDirectPaidTolerance(235, 250, 1)).toBe(false);
  });

  it("isFeeLineExempt and isFeeLineWaived are distinct", () => {
    expect(isFeeLineExempt({ payment_status: "EXEMPT" })).toBe(true);
    expect(isFeeLineWaived({ payment_status: "WAIVED" })).toBe(true);
    expect(isFeeLineExempt({ payment_status: "WAIVED" })).toBe(false);
    expect(areExemptAndWaivedDistinct("EXEMPT", "WAIVED")).toBe(true);
  });

  it("defaultBillableAndTracked falls back to total then amount", () => {
    expect(defaultBillableAndTracked({ total: 200 })).toEqual({
      billable_amount: 200,
      tracked_amount: 200,
    });
    expect(defaultBillableAndTracked({ amount: 150 })).toEqual({
      billable_amount: 150,
      tracked_amount: 150,
    });
  });

  it("deriveAccountingTreatment maps subgroups", () => {
    expect(deriveAccountingTreatment("GOVERNMENT")).toBe("THIRD_PARTY");
    expect(deriveAccountingTreatment("INSTITUTION")).toBe("INSTITUTION_RELATED");
    expect(deriveAccountingTreatment(undefined)).toBe("REVENUE");
  });

  it("isPassThroughLine identifies non-revenue lines", () => {
    expect(isPassThroughLine({ accounting_treatment: "THIRD_PARTY" })).toBe(true);
    expect(isPassThroughLine({ accounting_treatment: "REVENUE" })).toBe(false);
    expect(isPassThroughLine({})).toBe(false);
  });
});
