import { describe, expect, it } from "vitest";
import { distributeLumpSumAcrossLines } from "@/lib/invoicePaymentAllocation";

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
