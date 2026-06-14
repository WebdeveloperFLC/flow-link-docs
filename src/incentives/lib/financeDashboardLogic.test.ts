import { describe, expect, it } from "vitest";
import { effectiveDiscountPct, payoutWorkflowHint } from "./financeDashboardLogic";

describe("financeDashboardLogic", () => {
  it("computes effective discount percent", () => {
    expect(effectiveDiscountPct(67000, 1000000)).toBe(6.7);
    expect(effectiveDiscountPct(0, 0)).toBeNull();
  });

  it("describes payout workflow state", () => {
    expect(payoutWorkflowHint(false, 0).urgency).toBe("warn");
    expect(payoutWorkflowHint(true, 0).urgency).toBe("action");
    expect(payoutWorkflowHint(true, 3).label).toContain("3");
  });
});
