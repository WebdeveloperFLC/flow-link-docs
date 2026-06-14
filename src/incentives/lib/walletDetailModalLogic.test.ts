import { describe, expect, it } from "vitest";
import { formatWalletRuleLine, walletDetailSummary } from "./walletDetailModalLogic";
import type { WalletListRow } from "./walletListLogic";

const row = {
  id: "w1",
  name: "Q2 Monthly",
  counselor_id: "c1",
  counselor_name: "Ankita",
  budget_kind: "month_to_month" as const,
  currency: "INR",
  potential_wallet: 100000,
  unlocked_amount: 80000,
  balance: 75000,
  spent: 25000,
  valid_from: null,
  valid_to: null,
  closed_at: null,
  max_percent_per_client: 25,
  max_amount_per_client: 50000,
  rollover_policy: "partial_30",
  scope_country_tag: "CA",
  scope_master_key: null,
  scope_service_code: null,
  scope_sub_category: null,
  shortId: "WL-0001",
  typeLabel: "Monthly",
  scopeLabel: "Canada",
  utilizationPct: 25,
  expiryLabel: null,
  expiresWithin14d: false,
  status: "active" as const,
};

describe("walletDetailModalLogic", () => {
  it("computes remaining balance", () => {
    const summary = walletDetailSummary(row);
    expect(summary.remaining).toBe(75000);
  });

  it("formats rule line", () => {
    expect(formatWalletRuleLine(row)).toContain("25%");
  });
});
