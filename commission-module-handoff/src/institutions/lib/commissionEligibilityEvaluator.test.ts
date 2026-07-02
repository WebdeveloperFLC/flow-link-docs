import { describe, expect, it } from "vitest";
import {
  evaluateEligibility,
  evaluateStudentEligibility,
  pickEligibilityConfig,
  type EligibilityConfigLike,
} from "./commissionEligibilityEvaluator";

describe("commissionEligibilityEvaluator", () => {
  const configs: EligibilityConfigLike[] = [
    {
      id: "cfg-inst",
      trigger_type: "deposit",
      status: "published",
      version_number: 1,
    },
    {
      id: "cfg-route",
      trigger_type: "visa",
      status: "published",
      partnership_route_id: "route-1",
      version_number: 2,
    },
  ];

  it("prefers route-specific config", () => {
    const cfg = pickEligibilityConfig(configs, "route-1");
    expect(cfg?.id).toBe("cfg-route");
  });

  it("evaluates deposit trigger", () => {
    const result = evaluateEligibility(
      { tuition_paid_date: "2026-01-15" },
      { trigger_type: "deposit" },
    );
    expect(result.eligible).toBe(true);
  });

  it("evaluates visa trigger on route config", () => {
    const result = evaluateStudentEligibility(
      { study_permit_approved_date: "2026-02-01" },
      configs,
      "route-1",
    );
    expect(result.eligible).toBe(true);
    expect(result.configId).toBe("cfg-route");
  });

  it("fallback when no config", () => {
    const result = evaluateStudentEligibility({}, [], null);
    expect(result.eligible).toBe(false);
    expect(result.reason).toBe("no_config");
  });
});
