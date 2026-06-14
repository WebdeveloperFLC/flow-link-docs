import { describe, expect, it } from "vitest";
import { audienceLabel, buildEligibilityRuleRow, offerConflictSummary } from "./offerEligibilityLogic";

describe("offerEligibilityLogic", () => {
  it("labels audiences", () => {
    expect(audienceLabel("existing")).toBe("Existing client");
    expect(audienceLabel("custom_status")).toBe("custom status");
  });

  it("builds rule rows", () => {
    const row = buildEligibilityRuleRow({
      id: "r1",
      offer_id: null,
      audience: "existing",
      block_if_active_service: true,
      scope_service_code: "uuid::ielts",
      scope_country_tag: null,
      scope_master_key: "coaching_services",
      evaluate_against: ["enrollments"],
      is_active: true,
      notes: null,
    });
    expect(row.offerTitle).toBe("Global policy");
    expect(row.blockIfActiveService).toBe(true);
  });

  it("summarizes conflict config", () => {
    const summary = offerConflictSummary({
      offers: [{ stackable: true, priority: 5 }, { stackable: false, priority: 0 }],
      rules: [
        buildEligibilityRuleRow({
          id: "1",
          offer_id: null,
          audience: "existing",
          block_if_active_service: true,
          scope_service_code: "x",
          scope_country_tag: null,
          scope_master_key: null,
          evaluate_against: null,
          is_active: true,
          notes: null,
        }),
      ],
    });
    expect(summary.stackableOffers).toBe(1);
    expect(summary.globalRules).toBe(1);
  });
});
