import { describe, it, expect } from "vitest";
import {
  normalizeFeePaymentStatus,
  normalizeLegacyLineItem,
  normalizeLegacyLineItems,
  isLegacyExemptStatus,
  inferFeeSubgroupFromLegacy,
  mergeLegacyPricingFields,
} from "./legacyMapping";

describe("feeMaster legacyMapping", () => {
  it("maps NOT_REQUIRED to EXEMPT on read", () => {
    expect(normalizeFeePaymentStatus("NOT_REQUIRED")).toBe("EXEMPT");
    expect(normalizeFeePaymentStatus("WAIVED")).toBe("WAIVED");
  });

  it("normalizeLegacyLineItem generates line_item_key and preserves pricing", () => {
    const raw = {
      service_id: "abc",
      amount: 500,
      total: 590,
      discount: 10,
      payment_status: "NOT_REQUIRED",
    };
    const line = normalizeLegacyLineItem(raw);
    expect(line.line_item_key).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i,
    );
    expect(line.total).toBe(590);
    expect(line.discount).toBe(10);
    expect(line.payment_status).toBe("EXEMPT");
  });

  it("normalizeLegacyLineItems handles non-array input", () => {
    expect(normalizeLegacyLineItems(null)).toEqual([]);
    expect(normalizeLegacyLineItems([{ total: 100 }])).toHaveLength(1);
  });

  it("isLegacyExemptStatus covers EXEMPT and NOT_REQUIRED", () => {
    expect(isLegacyExemptStatus("EXEMPT")).toBe(true);
    expect(isLegacyExemptStatus("NOT_REQUIRED")).toBe(true);
    expect(isLegacyExemptStatus("PENDING")).toBe(false);
  });

  it("inferFeeSubgroupFromLegacy detects government keywords", () => {
    expect(
      inferFeeSubgroupFromLegacy({ description: "IRCC visa application fee" }),
    ).toBe("GOVERNMENT");
  });

  it("mergeLegacyPricingFields preserves all fields", () => {
    const line = normalizeLegacyLineItem({ total: 100, tax: 18 });
    expect(mergeLegacyPricingFields(line).tax).toBe(18);
  });
});
