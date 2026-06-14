import { describe, expect, it } from "vitest";
import { isPersonalWalletBudgetKind } from "@/incentives/lib/walletKpiFilter";

/** PH-R-001 — wallet KPI must use month_to_month, not legacy personal-only filter */
describe("PH-R-001 wallet KPI budget_kind filter", () => {
  it("includes month_to_month wallets", () => {
    expect(isPersonalWalletBudgetKind("month_to_month")).toBe(true);
  });

  it("includes legacy personal alias", () => {
    expect(isPersonalWalletBudgetKind("personal")).toBe(true);
  });

  it("excludes scoped strategic wallets", () => {
    expect(isPersonalWalletBudgetKind("scoped")).toBe(false);
  });

  it("excludes festive wallets", () => {
    expect(isPersonalWalletBudgetKind("festive")).toBe(false);
  });
});
