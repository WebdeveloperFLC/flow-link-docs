import { describe, expect, it } from "vitest";
import {
  buildCurrencyConfigRows,
  buildCurrencyMix,
  buildFxHistoryBars,
  multiCurrencyCmsKpis,
} from "./multiCurrencyCmsLogic";

describe("multiCurrencyCmsLogic", () => {
  it("builds currency rows with INR base", () => {
    const rows = buildCurrencyConfigRows(
      [{ currency: "CAD", period_key: "2026-06", base_rate_to_inr: 61, rate_to_inr: 63, source: "manual" }],
      new Map([
        ["INR", 1000000],
        ["CAD", 10000],
      ]),
      "2026-06",
    );
    const inr = rows.find((r) => r.code === "INR");
    const cad = rows.find((r) => r.code === "CAD");
    expect(inr?.status).toBe("Base");
    expect(cad?.status).toBe("Live");
    expect(cad?.manualOverride).toBe(true);
  });

  it("builds revenue mix", () => {
    const rows = buildCurrencyConfigRows([], new Map([["INR", 860000], ["CAD", 14000]]), "2026-06");
    const mix = buildCurrencyMix(rows);
    expect(mix.reduce((s, m) => s + m.sharePct, 0)).toBeGreaterThan(0);
  });

  it("builds FX history bars", () => {
    const bars = buildFxHistoryBars([
      { currency: "CAD", period_key: "2026-04", rate_to_inr: 60, source: "auto" },
      { currency: "CAD", period_key: "2026-05", rate_to_inr: 61, source: "manual" },
    ]);
    expect(bars).toHaveLength(2);
    expect(bars[1].manualOverride).toBe(true);
  });

  it("aggregates KPIs", () => {
    const rows = buildCurrencyConfigRows([], new Map([["INR", 100]]), "2026-06");
    expect(multiCurrencyCmsKpis(rows).totalRevenueInr).toBe(100);
  });
});
