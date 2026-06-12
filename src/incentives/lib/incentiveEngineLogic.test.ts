import { describe, expect, it } from "vitest";
import {
  applySlabs,
  applyTargetBonus,
  classifySourceType,
  discountPenaltyMultiplier,
  effectiveDiscountPct,
  forecastMonthEnd,
  resolveIncentiveCounselorId,
  revenueToNextSlab,
} from "./incentiveEngineLogic";
import { buildFxSnapshot, effectiveRateToInr } from "@/lib/fxPolicy";

describe("fxPolicy", () => {
  it("applies fixed +2 buffer by default", () => {
    expect(effectiveRateToInr({ currency: "CAD", base_rate_to_inr: 66 })).toBe(68);
  });

  it("builds snapshot with INR = 1", () => {
    const snap = buildFxSnapshot([{ currency: "CAD", base_rate_to_inr: 66, buffer_fixed: 2 }]);
    expect(snap.INR).toBe(1);
    expect(snap.CAD).toBe(68);
  });
});

describe("resolveIncentiveCounselorId", () => {
  it("prefers closing over assigned", () => {
    expect(
      resolveIncentiveCounselorId({
        closing_counselor_id: "close",
        assigned_counselor_id: "assign",
        owner_id: "owner",
      }),
    ).toBe("close");
  });
});

describe("classifySourceType", () => {
  it("maps allied and travel to ancillary", () => {
    expect(classifySourceType("allied_services")).toBe("ancillary");
    expect(classifySourceType("travel_financial")).toBe("ancillary");
    expect(classifySourceType("coaching_services")).toBe("service_revenue");
  });
});

describe("applySlabs", () => {
  const slabs = [
    {
      id: "s1",
      source_type: "service_revenue",
      rate_type: "percent",
      min_threshold: 0,
      max_threshold: 500000,
      rate_value: 3,
    },
    {
      id: "s2",
      source_type: "service_revenue",
      rate_type: "percent",
      min_threshold: 500000,
      max_threshold: null,
      rate_value: 5,
    },
  ];

  it("tiers percent slabs", () => {
    const r = applySlabs(600000, 10, slabs);
    expect(r.earned).toBe(20000); // 500k*3% + 100k*5%
  });
});

describe("applyTargetBonus", () => {
  it("pays flat bonus when trigger met", () => {
    expect(
      applyTargetBonus({
        target_value: 100000,
        achieved: 110000,
        bonus_trigger_pct: 100,
        bonus_rate_type: "flat",
        bonus_value: 5000,
      }),
    ).toBe(5000);
  });

  it("skips when below trigger", () => {
    expect(
      applyTargetBonus({
        target_value: 100000,
        achieved: 80000,
        bonus_trigger_pct: 100,
        bonus_rate_type: "flat",
        bonus_value: 5000,
      }),
    ).toBe(0);
  });
});

describe("discountPenaltyMultiplier", () => {
  it("follows band table", () => {
    expect(discountPenaltyMultiplier(3)).toBe(1);
    expect(discountPenaltyMultiplier(8)).toBe(0.9);
    expect(discountPenaltyMultiplier(12)).toBe(0.75);
    expect(discountPenaltyMultiplier(20)).toBe(0);
  });
});

describe("effectiveDiscountPct", () => {
  it("computes discount percent", () => {
    expect(effectiveDiscountPct(100000, 90000)).toBe(10);
  });
});

describe("forecastMonthEnd", () => {
  it("projects linearly", () => {
    expect(forecastMonthEnd(15000, 15, 30)).toBe(30000);
  });
});

describe("revenueToNextSlab", () => {
  it("returns gap to next tier", () => {
    const slabs = [
      {
        id: "a",
        source_type: "service_revenue",
        rate_type: "percent",
        min_threshold: 0,
        max_threshold: 100000,
        rate_value: 5,
      },
      {
        id: "b",
        source_type: "service_revenue",
        rate_type: "percent",
        min_threshold: 100000,
        max_threshold: null,
        rate_value: 7,
      },
    ];
    const r = revenueToNextSlab(85000, slabs);
    expect(r.nextThreshold).toBe(100000);
    expect(r.revenueNeeded).toBe(15000);
  });
});
