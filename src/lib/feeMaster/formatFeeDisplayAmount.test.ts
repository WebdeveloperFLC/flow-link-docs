import { describe, it, expect } from "vitest";
import { formatFeeDisplayAmount, isApproximateDisplayAccuracy } from "./formatFeeDisplayAmount";

describe("formatFeeDisplayAmount", () => {
  it("formats EXACT without Approx prefix", () => {
    expect(formatFeeDisplayAmount(100, "CAD", "EXACT")).toBe("CAD 100");
  });

  it("formats APPROXIMATE with Approx prefix", () => {
    expect(formatFeeDisplayAmount(16000, "CAD", "APPROXIMATE")).toBe("Approx. CAD 16,000");
  });

  it("formats AI_DETECTED with Approx prefix", () => {
    expect(formatFeeDisplayAmount(500, "CAD", "AI_DETECTED")).toBe("Approx. CAD 500");
  });

  it("isApproximateDisplayAccuracy distinguishes EXACT", () => {
    expect(isApproximateDisplayAccuracy("EXACT")).toBe(false);
    expect(isApproximateDisplayAccuracy("APPROXIMATE")).toBe(true);
  });
});
