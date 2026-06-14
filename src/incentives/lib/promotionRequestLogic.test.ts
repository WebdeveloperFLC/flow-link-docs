import { describe, expect, it } from "vitest";
import {
  derivePromotionMetrics,
  mapPromotionRequest,
  promotionDisplayStatus,
  promotionShortId,
} from "./promotionRequestLogic";

describe("promotionRequestLogic", () => {
  it("builds short ids", () => {
    expect(promotionShortId("a00f0001-0001-4000-8000-000000000001")).toMatch(/^PR-/);
  });

  it("derives metrics with ROI pass threshold", () => {
    const metrics = derivePromotionMetrics({
      id: "a00f0002-0002-4000-8000-000000000002",
      proposed_discount_text: "15% joint funded",
      description: "MarCom review in progress",
      status: "in_review",
    });
    expect(metrics.budget).toBeGreaterThan(0);
    expect(metrics.roi).toBeGreaterThanOrEqual(8);
  });

  it("maps declined status to rejected display", () => {
    const card = mapPromotionRequest({
      id: "x",
      title: "Test",
      description: null,
      status: "declined",
      proposed_discount_text: "10%",
      target_audience: null,
      sla_at: new Date().toISOString(),
      created_at: new Date().toISOString(),
      review_note: null,
      requester: { full_name: "Ankita" },
    });
    expect(card.displayStatus).toBe("rejected");
    expect(promotionDisplayStatus("declined", card.metrics)).toBe("rejected");
  });
});
