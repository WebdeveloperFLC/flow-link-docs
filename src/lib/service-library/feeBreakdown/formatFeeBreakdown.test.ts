import { describe, expect, it } from "vitest";
import { buildFeeBreakdownView } from "./formatFeeBreakdown";
import type { GovtFeeBreakdownSource } from "./types";

const sample: GovtFeeBreakdownSource = {
  libraryId: "test",
  title: "Test Visa",
  nativeCurrency: "CAD",
  lastVerified: "Jun 2026",
  sourceUrl: "https://example.com",
  disclaimer: "Test disclaimer",
  items: [
    {
      id: "visa_application",
      label: "Application fee",
      applicable: true,
      amount: 990,
      currency: "CAD",
      unit: "per applicant",
    },
    {
      id: "landing_rprf",
      label: "Landing fee",
      applicable: false,
      amount: null,
      currency: "CAD",
    },
  ],
};

describe("buildFeeBreakdownView", () => {
  it("formats native and INR for applicable rows", () => {
    const view = buildFeeBreakdownView(sample);
    expect(view.items[0].nativeDisplay).toBe("CAD $990");
    expect(view.items[0].inrDisplay).toMatch(/^₹/);
    expect(view.items[1].nativeDisplay).toBe("Not applicable");
    expect(view.applicableCount).toBe(1);
  });
});
