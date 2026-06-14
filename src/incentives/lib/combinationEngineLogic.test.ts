import { describe, expect, it } from "vitest";
import { buildCombinationRow, combinationKpis, splitLibraryId } from "./combinationEngineLogic";

describe("combinationEngineLogic", () => {
  it("builds logical combination row", () => {
    const row = buildCombinationRow({
      id: "c1",
      name: "Coaching + Visa",
      combination_type: "logical",
      service_codes: ["abc::canada", "def::visa"],
      branch_id: null,
      branchName: "All",
      package_price: null,
      package_currency: "INR",
      max_discount_pct: 12,
      wallet_eligible: true,
      linked_offer_id: "o1",
      linked_incentive_scheme_id: null,
      is_active: true,
      labelMap: new Map([
        ["abc", "Coaching"],
        ["def", "Visa"],
      ]),
      resolvedPrice: 45000,
      resolvedLabels: ["Coaching", "Visa"],
    });
    expect(row.price).toBe(45000);
    expect(row.hasOfferRule).toBe(true);
    expect(row.hasDiscountRule).toBe(true);
  });

  it("aggregates KPIs", () => {
    const kpis = combinationKpis([
      { combinationType: "logical" } as ReturnType<typeof buildCombinationRow>,
      { combinationType: "package", hasOfferRule: true } as ReturnType<typeof buildCombinationRow>,
    ]);
    expect(kpis.total).toBe(2);
    expect(kpis.logical).toBe(1);
    expect(kpis.package).toBe(1);
  });

  it("splits library id from composite code", () => {
    expect(splitLibraryId("uuid-here::canada")).toBe("uuid-here");
  });
});
