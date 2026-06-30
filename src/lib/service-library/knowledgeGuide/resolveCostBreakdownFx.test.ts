import { describe, expect, it } from "vitest";
import {
  convertBaseToInr,
  needsFxResolution,
  resolveCostBreakdownFx,
} from "./resolveCostBreakdownFx";
import type { FlcCurrencyConfig, FlcFullCostBreakdown } from "./types";

const currencyConfig: FlcCurrencyConfig = {
  baseCurrency: "CAD",
  displayCurrency: "INR",
  fallbackRate: 62.5,
};

const sampleBreakdown: FlcFullCostBreakdown = {
  currency: "CAD",
  lastVerified: "1 Jan 2026",
  disclaimer: "Indicative only.",
  sections: [
    {
      id: "fees",
      label: "Government fees",
      items: [
        {
          label: "Study permit fee",
          cadAmount: 150,
          inr: "auto",
        },
        {
          label: "Medical exam",
          cadAmount: [200, 400],
          inr: "auto",
        },
      ],
    },
  ],
  totals: [
    {
      label: "Upfront total",
      value: "CAD $740–1,180",
      inr: "auto",
    },
  ],
};

describe("resolveCostBreakdownFx", () => {
  it("computes INR from FX snapshot for auto items", () => {
    const fxSnapshot = { INR: 1, CAD: 65 };
    const resolved = resolveCostBreakdownFx(sampleBreakdown, currencyConfig, fxSnapshot);

    expect(resolved.baseCurrency).toBe("CAD");
    expect(resolved.fxRateUsed).toBe(65);
    expect(resolved.fxRateSource).toBe("snapshot");

    const fee = resolved.sections[0]?.items[0];
    expect(fee?.foreignDisplay).toContain("150");
    expect(fee?.inrAmount).toBe(9750);

    const range = resolved.sections[0]?.items[1];
    expect(range?.inrRange).toEqual([13000, 26000]);
  });

  it("falls back to currencyConfig.fallbackRate when snapshot missing", () => {
    const resolved = resolveCostBreakdownFx(sampleBreakdown, currencyConfig, { INR: 1 });
    expect(resolved.fxRateUsed).toBe(62.5);
    expect(resolved.fxRateSource).toBe("fallback");
    expect(resolved.sections[0]?.items[0]?.inrAmount).toBe(9375);
  });

  it("needsFxResolution when inr is auto", () => {
    expect(needsFxResolution(sampleBreakdown, currencyConfig)).toBe(true);
    expect(
      needsFxResolution(
        {
          ...sampleBreakdown,
          sections: [{ id: "x", label: "X", items: [{ label: "Y", inr: 1000 }] }],
          totals: [],
        },
        currencyConfig,
      ),
    ).toBe(false);
  });

  it("convertBaseToInr uses snapshot then fallback", () => {
    expect(convertBaseToInr(100, "CAD", { INR: 1, CAD: 60 })).toBe(6000);
    expect(convertBaseToInr(100, "CAD", { INR: 1 }, 55)).toBe(5500);
  });

  it("does not convert consultancy FLC section via Currency Master", () => {
    const withFlc: FlcFullCostBreakdown = {
      ...sampleBreakdown,
      sections: [
        ...sampleBreakdown.sections,
        {
          id: "flc",
          label: "Future Link professional fee (consultancy)",
          items: [
            {
              label: "FLC professional fee — TRV (1 person)",
              cadAmount: 105,
              inr: "auto",
              official: false,
            },
          ],
        },
      ],
    };
    const fxSnapshot = { INR: 1, CAD: 68 };
    const resolved = resolveCostBreakdownFx(withFlc, currencyConfig, fxSnapshot);
    const flcItem = resolved.sections.find((s) => s.id === "flc")?.items[0];
    expect(flcItem?.foreignDisplay).toContain("105");
    expect(flcItem?.inrAmount).toBeNull();
    expect(flcItem?.inrDisplay).toBeUndefined();
  });
});
