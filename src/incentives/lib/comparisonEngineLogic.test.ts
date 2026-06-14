import { describe, expect, it } from "vitest";
import { branchComparison, counselorComparison } from "./comparisonEngineLogic";

describe("comparisonEngineLogic", () => {
  it("compares counselors with winners", () => {
    const rows = counselorComparison(
      {
        counselorId: "a",
        name: "A",
        branchName: "X",
        roleLabel: "counselor",
        targetPct: 80,
        netRevenue: 100,
        walletSpendable: 10,
        walletSpent: 5,
        cashProjected: 20,
        cashLocked: null,
      },
      {
        counselorId: "b",
        name: "B",
        branchName: "X",
        roleLabel: "counselor",
        targetPct: 60,
        netRevenue: 50,
        walletSpendable: 10,
        walletSpent: 8,
        cashProjected: 15,
        cashLocked: null,
      },
    );
    expect(rows.find((r) => r.label === "Net revenue")?.winner).toBe("a");
  });

  it("aggregates branch comparison", () => {
    const metrics = branchComparison("X", "Y", [
      {
        counselorId: "1",
        name: "A",
        branchName: "X",
        roleLabel: "counselor",
        targetPct: 50,
        netRevenue: 100,
        walletSpendable: 0,
        walletSpent: 0,
        cashProjected: 10,
        cashLocked: null,
      },
      {
        counselorId: "2",
        name: "B",
        branchName: "Y",
        roleLabel: "counselor",
        targetPct: 40,
        netRevenue: 200,
        walletSpendable: 0,
        walletSpent: 0,
        cashProjected: 20,
        cashLocked: null,
      },
    ]);
    expect(metrics.find((m) => m.label === "Net revenue")?.winner).toBe("b");
  });
});
