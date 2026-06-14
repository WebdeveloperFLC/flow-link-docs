import { describe, expect, it } from "vitest";
import { evaluatePayoutThreshold, filterPayoutCandidates } from "./incentivePayoutThresholdLogic";

describe("incentivePayoutThresholdLogic", () => {
  it("allows payout when no threshold configured", () => {
    expect(evaluatePayoutThreshold({ grossAmount: 1000, minThreshold: null, carryBelowThreshold: true }).eligible).toBe(true);
  });

  it("blocks below threshold when carry enabled", () => {
    const d = evaluatePayoutThreshold({ grossAmount: 40000, minThreshold: 50000, carryBelowThreshold: true });
    expect(d.eligible).toBe(false);
    expect(d.reason).toContain("carries forward");
  });

  it("allows below threshold when carry disabled", () => {
    expect(
      evaluatePayoutThreshold({ grossAmount: 40000, minThreshold: 50000, carryBelowThreshold: false }).eligible,
    ).toBe(true);
  });

  it("filters payout candidates", () => {
    const { eligible, skipped } = filterPayoutCandidates(
      [
        { counselor_id: "a", gross_amount: 60000 },
        { counselor_id: "b", gross_amount: 30000 },
      ],
      50000,
      true,
    );
    expect(eligible).toHaveLength(1);
    expect(skipped).toHaveLength(1);
    expect(skipped[0].counselor_id).toBe("b");
  });
});
