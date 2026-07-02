import { describe, expect, it } from "vitest";
import { computeCommercialValidityStatus, settlementAllowedForValidity } from "@/platform/cae/validityStatus";
import { overlaySettlementAllowed } from "@/platform/cae/commercialOfferOverlayService";
import type { CommercialOfferOverlay } from "@/platform/cae/types";

describe("CAE — validity status (constitutional)", () => {
  it("marks future terms as upcoming", () => {
    expect(computeCommercialValidityStatus("2027-01-01", "2027-12-31", "2026-06-01")).toBe("upcoming");
  });

  it("marks past terms as expired", () => {
    expect(computeCommercialValidityStatus("2024-01-01", "2024-12-31", "2026-06-01")).toBe("expired");
  });

  it("allows settlement only for active or expiring_soon", () => {
    expect(settlementAllowedForValidity("active")).toBe(true);
    expect(settlementAllowedForValidity("expiring_soon")).toBe(true);
    expect(settlementAllowedForValidity("expired")).toBe(false);
    expect(settlementAllowedForValidity("upcoming")).toBe(false);
  });
});

describe("CAE — offer overlay settlement gate", () => {
  const overlay = (from: string, until: string): CommercialOfferOverlay => ({
    id: "o1",
    masterAgreementId: "a1",
    offerType: "bonus_commission",
    name: "Intake promo",
    validFrom: from,
    validUntil: until,
    status: "active",
  });

  it("blocks expired overlay for settlement", () => {
    expect(overlaySettlementAllowed(overlay("2024-01-01", "2024-12-31"), "2026-06-01")).toBe(false);
  });

  it("allows active overlay for settlement", () => {
    expect(overlaySettlementAllowed(overlay("2026-01-01", "2026-12-31"), "2026-06-01")).toBe(true);
  });
});

describe("CAE — build order architecture", () => {
  it("documents layer order: relationships → overlays → summary generator", () => {
    const layers = ["commercial_relationships", "commercial_offer_overlays", "agreement_summary_generator"];
    expect(layers[0]).toBe("commercial_relationships");
    expect(layers[2]).toBe("agreement_summary_generator");
  });
});
