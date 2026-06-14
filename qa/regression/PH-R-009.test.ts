import { describe, expect, it } from "vitest";
import { isPerformanceHubPath } from "@/lib/performanceHubTokens";

/** PH-R-009 — incentives admin pages render inside hub theme shell */
describe("PH-R-009 performance hub path detection", () => {
  it("matches /performance routes", () => {
    expect(isPerformanceHubPath("/performance")).toBe(true);
    expect(isPerformanceHubPath("/performance/give-discount")).toBe(true);
  });

  it("matches /incentives routes for hub shell", () => {
    expect(isPerformanceHubPath("/incentives/admin")).toBe(true);
    expect(isPerformanceHubPath("/incentives/plans")).toBe(true);
    expect(isPerformanceHubPath("/incentives/payouts")).toBe(true);
  });

  it("does not match unrelated CRM routes", () => {
    expect(isPerformanceHubPath("/clients")).toBe(false);
    expect(isPerformanceHubPath("/settings")).toBe(false);
  });
});
