import { describe, expect, it } from "vitest";
import {
  buildOfferCodeRows,
  filterOfferCodeRows,
  inferPromoCodeType,
  offerCodeKpis,
} from "./offerCodesLogic";

describe("offerCodesLogic", () => {
  it("infers promo code types", () => {
    expect(inferPromoCodeType(500, 1)).toBe("bulk");
    expect(inferPromoCodeType(1, 1)).toBe("one_time");
    expect(inferPromoCodeType(50, 2)).toBe("multi");
  });

  it("builds unified promo and tracking rows", () => {
    const rows = buildOfferCodeRows({
      offers: [
        {
          id: "o1",
          title: "Early Bird",
          promo_code: "FLC-EBIRD",
          max_redemptions: 300,
          per_client_limit: 1,
          redemption_count: 10,
          status: "active",
          audience: "global",
          target_countries: [],
          applicable_services: null,
          valid_to: "2026-07-01",
          branch_id: null,
        } as never,
      ],
      tracking: [{ id: "t1", offer_id: "o1", counselor_id: "c1", code: "ANK-REF", created_at: "" }],
      counselorNames: new Map([["c1", "Ankita"]]),
      branchNames: new Map(),
      counselorBranch: new Map([["c1", "Genda Circle"]]),
      trackingUsage: new Map(),
    });
    expect(rows).toHaveLength(2);
    expect(filterOfferCodeRows(rows, "counselor")).toHaveLength(1);
    expect(offerCodeKpis(rows).totalRedemptions).toBe(10);
  });
});
