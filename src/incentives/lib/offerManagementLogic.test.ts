import { describe, expect, it } from "vitest";
import {
  filterOffersByLifecycleStep,
  lifecycleCounts,
  mapStatusToLifecycleStep,
  offerValueLabel,
  redemptionUtilPct,
} from "./offerManagementLogic";

describe("offerManagementLogic", () => {
  it("maps statuses to lifecycle steps", () => {
    expect(mapStatusToLifecycleStep("draft")).toBe("draft");
    expect(mapStatusToLifecycleStep("pending_review")).toBe("approval");
    expect(mapStatusToLifecycleStep("approved")).toBe("configure");
    expect(mapStatusToLifecycleStep("active")).toBe("live");
    expect(mapStatusToLifecycleStep("expired")).toBe("expire");
  });

  it("filters and counts lifecycle buckets", () => {
    const offers = [
      { status: "draft" as const },
      { status: "active" as const },
      { status: "pending_review" as const },
    ];
    expect(lifecycleCounts(offers).live).toBe(1);
    expect(filterOffersByLifecycleStep(offers as never[], "approval")).toHaveLength(1);
  });

  it("formats value and redemption meter", () => {
    expect(offerValueLabel({ discount_type: "percentage", discount_value: 15 })).toBe("15%");
    expect(redemptionUtilPct(70, 100)).toBe(70);
  });
});
