import { describe, expect, it } from "vitest";
import { pickWalletBySpendOrder, walletScopeMatches } from "./walletScopeLogic";

describe("walletScopeMatches", () => {
  it("allows universal wallet for any target", () => {
    expect(walletScopeMatches({}, { country: "Germany" })).toBe(true);
  });

  it("requires country match for scoped wallet", () => {
    expect(
      walletScopeMatches({ scope_country_tag: "Germany" }, { country: "Canada", countries: [] }),
    ).toBe(false);
    expect(
      walletScopeMatches({ scope_country_tag: "Germany" }, { country: "Germany", countries: [] }),
    ).toBe(true);
  });

  it("requires service master for scoped wallet", () => {
    expect(
      walletScopeMatches({ scope_master_key: "coaching_services" }, { hasCoaching: true, services: [] }),
    ).toBe(true);
    expect(
      walletScopeMatches({ scope_master_key: "coaching_services" }, { hasVisa: true, services: [] }),
    ).toBe(false);
  });
});

describe("pickWalletBySpendOrder", () => {
  const wallets = [
    { id: "p", budget_kind: "month_to_month" },
    { id: "s", budget_kind: "scoped" },
  ];

  it("prefers strategic first", () => {
    expect(pickWalletBySpendOrder(wallets, "strategic_first")?.id).toBe("s");
  });

  it("prefers personal first", () => {
    expect(pickWalletBySpendOrder(wallets, "personal_first")?.id).toBe("p");
  });
});
