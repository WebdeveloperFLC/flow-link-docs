import { describe, expect, it } from "vitest";
import { teamAverageAchievement, teamWalletUtilization } from "./branchDashboardLogic";

describe("branchDashboardLogic", () => {
  it("computes team wallet utilization", () => {
    expect(
      teamWalletUtilization([
        { walletSpent: 7000, walletSpendable: 3000 },
        { walletSpent: 5000, walletSpendable: 5000 },
      ]),
    ).toBe(60);
  });

  it("computes average achievement", () => {
    expect(
      teamAverageAchievement([{ targetPct: 60 }, { targetPct: 80 }, { targetPct: null }]),
    ).toBe(70);
  });
});
