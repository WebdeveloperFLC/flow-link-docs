import { describe, expect, it } from "vitest";
import {
  branchAttainmentPct,
  netMarginPct,
  toMixSlices,
  totalPendingApprovals,
  walletUtilizationPct,
} from "./executiveDashboardLogic";

describe("executiveDashboardLogic", () => {
  it("computes wallet utilization", () => {
    expect(walletUtilizationPct(71000, 100000)).toBe(71);
  });

  it("computes net margin pct", () => {
    expect(netMarginPct(384000, 1000000)).toBe(38.4);
  });

  it("builds branch attainment", () => {
    expect(branchAttainmentPct(80, 100)).toBe(80);
  });

  it("builds mix slices", () => {
    const slices = toMixSlices([
      { label: "Core", amount: 420 },
      { label: "Allied", amount: 580 },
    ]);
    expect(slices[0].pct).toBe(58);
  });

  it("sums pending approval queues", () => {
    expect(
      totalPendingApprovals({ pendingApprovals: 3, walletExceptions: 1, promotionRequests: 2 }),
    ).toBe(6);
  });
});
