import { describe, expect, it } from "vitest";
import { computeCampaignBonus, distributeContestPool } from "./incentiveContestLogic";

describe("distributeContestPool", () => {
  const standings = [
    {
      branch_id: "b1",
      total: 100000,
      counselors: [
        { counselor_id: "c1", total: 60000 },
        { counselor_id: "c2", total: 40000 },
      ],
    },
    {
      branch_id: "b2",
      total: 80000,
      counselors: [{ counselor_id: "c3", total: 80000 }],
    },
  ];

  it("top branch splits by contribution", () => {
    const out = distributeContestPool(
      {
        pool_amount: 50000,
        min_branch_total: 0,
        winner_mode: "top_branch",
        split_mode: "by_contribution",
      },
      standings,
    );
    expect(out.c1).toBe(30000);
    expect(out.c2).toBe(20000);
    expect(out.c3).toBeUndefined();
  });

  it("respects min branch threshold", () => {
    const out = distributeContestPool(
      {
        pool_amount: 50000,
        min_branch_total: 150000,
        winner_mode: "top_branch",
        split_mode: "by_contribution",
      },
      standings,
    );
    expect(Object.keys(out).length).toBe(0);
  });

  it("proportional_all splits across branches", () => {
    const out = distributeContestPool(
      {
        pool_amount: 100000,
        min_branch_total: 0,
        winner_mode: "proportional_all",
        split_mode: "by_contribution",
      },
      standings,
    );
    expect(out.c1! + out.c2! + out.c3!).toBeCloseTo(100000, 0);
  });
});

describe("computeCampaignBonus", () => {
  it("flat per event", () => {
    expect(
      computeCampaignBonus(
        { bonus_type: "flat_per_event", bonus_value: 1500 },
        [{ amount: 100 }, { amount: 200 }],
      ),
    ).toBe(3000);
  });

  it("percent revenue", () => {
    expect(
      computeCampaignBonus(
        { bonus_type: "percent_revenue", bonus_value: 10 },
        [{ amount: 1000 }, { amount: 500 }],
      ),
    ).toBe(150);
  });
});
