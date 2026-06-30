import { describe, expect, it } from "vitest";
import { applyConsultancyToCostBreakdown } from "./applyConsultancyToCostBreakdown";
import type { ResolvedFullCostBreakdown } from "@/lib/service-library/knowledgeGuide/resolveCostBreakdownFx";

describe("applyConsultancyToCostBreakdown", () => {
  it("overlays stored INR/CAD from Fee Master without conversion", () => {
    const resolved: ResolvedFullCostBreakdown = {
      title: "Cost",
      currency: "CAD",
      lastVerified: "1 Jan 2026",
      disclaimer: "Test",
      sections: [
        {
          id: "flc",
          label: "Future Link professional fee",
          items: [
            {
              label: "FLC professional fee — TRV (1 person)",
              amount: null,
              foreignDisplay: "CAD $105",
              inrDisplay: undefined,
            },
          ],
        },
      ],
      baseCurrency: "CAD",
      displayCurrency: "INR",
    };

    const out = applyConsultancyToCostBreakdown(resolved, [
      {
        picker_label: "1 person",
        fee_inr: 7080,
        fee_cad: 105,
        display_order: 10,
      },
    ]);

    const item = out.sections[0]?.items[0];
    expect(item?.inrDisplay).toBe("₹7,080");
    expect(item?.foreignDisplay).toBe("CAD $105");
    expect(item?.inrAmount).toBe(7080);
  });
});
