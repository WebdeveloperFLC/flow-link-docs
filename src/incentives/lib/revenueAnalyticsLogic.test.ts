import { describe, expect, it } from "vitest";
import { periodShortLabel, rollingPeriodKeys } from "./revenueAnalyticsLogic";

describe("revenueAnalyticsLogic", () => {
  it("builds rolling period keys", () => {
    expect(rollingPeriodKeys("2026-06", 3)).toEqual(["2026-04", "2026-05", "2026-06"]);
    expect(rollingPeriodKeys("2026-01", 2)).toEqual(["2025-12", "2026-01"]);
  });

  it("shortens period labels", () => {
    expect(periodShortLabel("2026-06")).toBe("Jun");
  });
});
