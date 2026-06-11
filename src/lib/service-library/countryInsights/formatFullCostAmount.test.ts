import { describe, expect, it } from "vitest";
import { formatFullCostAmount } from "./formatFullCostAmount";

describe("formatFullCostAmount", () => {
  it("formats USD numeric ranges with $ prefix", () => {
    expect(formatFullCostAmount({ range: "20,480", currency: "USD" }, "USD")).toBe("$20,480");
  });

  it("does not prepend USD to INR ranges that already include ₹", () => {
    expect(formatFullCostAmount({ range: "₹50,000–2,00,000+" }, "USD")).toBe("₹50,000–2,00,000+");
  });

  it("formats INR misc items when currency is set explicitly", () => {
    expect(
      formatFullCostAmount({ range: "50,000–2,00,000+", currency: "INR" }, "USD"),
    ).toBe("₹50,000–2,00,000+");
  });

  it("leaves descriptive text without a currency prefix", () => {
    expect(formatFullCostAmount({ range: "See Fees tab" }, "USD")).toBe("See Fees tab");
    expect(formatFullCostAmount({ range: "Varies by city", unit: "per month" }, "USD")).toBe(
      "Varies by city per month",
    );
  });

  it("preserves euro amounts that already include €", () => {
    expect(formatFullCostAmount({ range: "€350–900", unit: "per month" }, "EUR")).toBe("€350–900 per month");
  });
});
