import { describe, expect, it } from "vitest";
import {
  budgetCurrencyOptions,
  buildBudgetEquivalents,
  computeEffectiveRate,
  currencyCodeForCountry,
  parseCurrencyMasterConfig,
  resolveRowBuffer,
} from "@/lib/currencyMaster";
import type { MasterItem } from "@/lib/masters";

const CURRENCIES: MasterItem[] = [
  { id: "1", list_key: "currencies", code: "INR", label: "Indian Rupee", metadata: { countries: ["India"] }, is_active: true, sort_order: 10 },
  { id: "2", list_key: "currencies", code: "CAD", label: "Canadian Dollar", metadata: { countries: ["Canada"] }, is_active: true, sort_order: 20 },
  { id: "3", list_key: "currencies", code: "USD", label: "US Dollar", metadata: { countries: ["United States"] }, is_active: true, sort_order: 30 },
  { id: "4", list_key: "currencies", code: "GBP", label: "British Pound", metadata: { countries: ["United Kingdom"] }, is_active: true, sort_order: 40 },
];

describe("currencyMaster", () => {
  it("maps country to currency code", () => {
    expect(currencyCodeForCountry("Canada", CURRENCIES)).toBe("CAD");
    expect(currencyCodeForCountry("United States", CURRENCIES)).toBe("USD");
  });

  it("always includes INR in budget currency options", () => {
    const opts = budgetCurrencyOptions(["Canada", "United States"], CURRENCIES);
    expect(opts.map((c) => c.code)).toEqual(["INR", "CAD", "USD"]);
  });

  it("builds budget equivalents for India and interested countries", () => {
    const snap = { INR: 1, CAD: 61, USD: 83, GBP: 105 };
    const rows = buildBudgetEquivalents(
      ["Canada", "United Kingdom"],
      CURRENCIES,
      "INR",
      1500000,
      2000000,
      snap,
    );
    expect(rows.some((r) => r.country === "India" && r.currency === "INR")).toBe(true);
    expect(rows.some((r) => r.currency === "CAD")).toBe(true);
    expect(rows.some((r) => r.currency === "GBP")).toBe(true);
  });

  it("parses buffer config from master_lists metadata", () => {
    expect(parseCurrencyMasterConfig({ default_buffer_fixed: 2, default_buffer_pct: 0 })).toEqual({
      default_buffer_fixed: 2,
      default_buffer_pct: 0,
    });
    expect(parseCurrencyMasterConfig(null)).toEqual({ default_buffer_fixed: 0, default_buffer_pct: 0 });
  });

  it("computes effective rate from base + buffer", () => {
    expect(computeEffectiveRate("CAD", 66, 2)).toBe(68);
    expect(computeEffectiveRate("INR", 1, 99)).toBe(1);
  });

  it("resolves row buffer from row or org config", () => {
    const config = { default_buffer_fixed: 2, default_buffer_pct: 0 };
    expect(resolveRowBuffer({ currency: "CAD", buffer_fixed: 3 }, config)).toBe(3);
    expect(resolveRowBuffer({ currency: "CAD" }, config)).toBe(2);
  });
});
