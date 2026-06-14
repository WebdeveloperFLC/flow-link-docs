import { describe, expect, it } from "vitest";
import { mapProfitabilityRow, marginHeatClass, profitabilityTotals } from "./commercialProfitabilityLogic";

describe("commercialProfitabilityLogic", () => {
  it("maps RPC rows", () => {
    const row = mapProfitabilityRow({
      dimension: "counselor",
      group_key: "a",
      group_label: "Ankita",
      revenue_inr: 100000,
      discount_inr: 10000,
      incentive_inr: 5000,
      commission_inr: 2000,
      net_inr: 83000,
      net_margin_pct: 83,
    });
    expect(row.netInr).toBe(83000);
  });

  it("aggregates totals", () => {
    const totals = profitabilityTotals([
      mapProfitabilityRow({
        dimension: "branch",
        group_key: "b1",
        group_label: "X",
        revenue_inr: 100,
        discount_inr: 10,
        incentive_inr: 5,
        commission_inr: 2,
        net_inr: 83,
        net_margin_pct: 83,
      }),
      mapProfitabilityRow({
        dimension: "branch",
        group_key: "b2",
        group_label: "Y",
        revenue_inr: 200,
        discount_inr: 20,
        incentive_inr: 10,
        commission_inr: 4,
        net_inr: 166,
        net_margin_pct: 83,
      }),
    ]);
    expect(totals.revenueInr).toBe(300);
    expect(totals.netInr).toBe(249);
  });

  it("heat classes by margin", () => {
    expect(marginHeatClass(46)).toContain("emerald");
    expect(marginHeatClass(20)).toContain("red");
  });
});
