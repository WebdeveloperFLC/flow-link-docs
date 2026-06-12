import { describe, expect, it } from "vitest";
import { payoutsToCsv, priorPeriodKey, suggestTargetFromPrior } from "./incentiveFinanceExport";

describe("suggestTargetFromPrior", () => {
  it("applies growth pct", () => {
    expect(suggestTargetFromPrior(100000, 10)).toBe(110000);
  });
});

describe("priorPeriodKey", () => {
  it("returns previous month", () => {
    expect(priorPeriodKey("2026-06")).toBe("2026-05");
    expect(priorPeriodKey("2026-01")).toBe("2025-12");
  });
});

describe("payoutsToCsv", () => {
  it("includes header and row", () => {
    const csv = payoutsToCsv([
      {
        payout_id: "p1",
        period_key: "2026-06",
        counselor_name: "Alice",
        counselor_id: "c1",
        gross_amount: 1000,
        tds_amount: 100,
        net_amount: 900,
        settlement_currency: "INR",
        status: "approved",
      },
    ]);
    expect(csv).toContain("Alice");
    expect(csv.split("\n").length).toBe(2);
  });
});
