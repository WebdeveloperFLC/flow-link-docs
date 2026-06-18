import { describe, expect, it } from "vitest";
import {
  allocationServiceUuidFromLineRef,
  distributeLumpSumAcrossLines,
  priorPaidForLine,
  serviceRefMatchKeys,
} from "@/lib/invoicePaymentAllocation";
import { CHECKOUT_DISCOUNT_META_ID } from "@/lib/invoiceLinePricing";

const LIB = "c35e6051-f40f-47bf-9cac-0a386c47a336";
const COMPOSITE = `${LIB}::Canada`;
const VARIANT = `${LIB}::Canada::fresh-outside`;

describe("allocationServiceUuidFromLineRef", () => {
  it("extracts library uuid from composite visa service codes", () => {
    expect(allocationServiceUuidFromLineRef(COMPOSITE)).toBe(LIB);
    expect(allocationServiceUuidFromLineRef(VARIANT)).toBe(LIB);
  });

  it("passes through plain library uuid", () => {
    expect(allocationServiceUuidFromLineRef(LIB)).toBe(LIB);
  });

  it("returns null for checkout discount meta and non-uuid legacy codes", () => {
    expect(allocationServiceUuidFromLineRef(CHECKOUT_DISCOUNT_META_ID)).toBeNull();
    expect(allocationServiceUuidFromLineRef("study_visa_canada")).toBeNull();
    expect(allocationServiceUuidFromLineRef(null)).toBeNull();
  });
});

describe("serviceRefMatchKeys / priorPaidForLine", () => {
  it("matches prior allocations keyed by library uuid when line stores composite code", () => {
    expect(serviceRefMatchKeys(COMPOSITE)).toEqual([COMPOSITE, LIB]);
    const paidByLineKey = new Map<string, number>();
    const paidByServiceFallback = new Map<string, number>([[LIB, 5000]]);
    expect(priorPaidForLine(`svc:${COMPOSITE}`, COMPOSITE, paidByLineKey, paidByServiceFallback)).toBe(5000);
  });
});

describe("distributeLumpSumAcrossLines", () => {
  it("splits proportionally and caps at outstanding", () => {
    const rows = [
      { key: "a", line_item_key: "svc:a", service_id: "a", total: 100, already_paid: 0 },
      { key: "b", line_item_key: "svc:b", service_id: "b", total: 200, already_paid: 50 },
    ];
    const out = distributeLumpSumAcrossLines(rows, 75);
    expect(out.get("a")).toBeCloseTo(30, 1);
    expect(out.get("b")).toBeCloseTo(45, 1);
  });

  it("returns empty when amount is zero", () => {
    const rows = [
      { key: "a", line_item_key: "svc:a", service_id: "a", total: 100, already_paid: 0 },
    ];
    expect(distributeLumpSumAcrossLines(rows, 0).size).toBe(0);
  });
});
