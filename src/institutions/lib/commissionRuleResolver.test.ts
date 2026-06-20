import { describe, expect, it } from "vitest";
import {
  resolveCommissionRule,
  pickCommission,
  type CommissionRecord,
  type CommissionRuleScope,
} from "./commissionRuleResolver";

const commission: CommissionRecord = {
  id: "c1",
  name: "Standard 2026",
  base_rate_percent: 10,
  currency: "CAD",
  is_active: true,
};

const rules: CommissionRuleScope[] = [
  { id: "r-default", commission_id: "c1", rule_type: "base" },
  { id: "r-country", commission_id: "c1", scope_country: "India" },
  { id: "r-intake", commission_id: "c1", scope_intake: "Fall 2026" },
  { id: "r-promo", commission_id: "c1", scope_promotion_id: "promo-1" },
];

describe("commissionRuleResolver", () => {
  it("prefers promotion over intake", () => {
    const resolved = resolveCommissionRule(commission, rules, {
      institutionId: "inst-1",
      country: "India",
      intake: "Fall 2026",
      promotionId: "promo-1",
    });
    expect(resolved?.matchLevel).toBe("promotion");
    expect(resolved?.matchedRuleId).toBe("r-promo");
  });

  it("prefers intake over country", () => {
    const resolved = resolveCommissionRule(commission, rules, {
      institutionId: "inst-1",
      country: "India",
      intake: "Fall 2026",
    });
    expect(resolved?.matchLevel).toBe("intake");
  });

  it("falls back to default rule", () => {
    const resolved = resolveCommissionRule(commission, rules, {
      institutionId: "inst-1",
      country: "Nepal",
    });
    expect(resolved?.matchLevel).toBe("default");
  });

  it("uses route default commission when set", () => {
    const commissions: CommissionRecord[] = [
      { id: "c1", name: "Old", is_active: true },
      { id: "c2", name: "Route default", is_active: true },
    ];
    const picked = pickCommission(commissions, "c2", "inst-1", new Date());
    expect(picked?.id).toBe("c2");
  });
});
