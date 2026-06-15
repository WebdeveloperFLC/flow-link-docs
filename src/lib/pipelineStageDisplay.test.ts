import { describe, expect, it } from "vitest";
import { pipelineStepDisplay } from "./pipelineStageDisplay";

describe("pipelineStepDisplay", () => {
  it("uses 1-based index, not sort_order (50 → step 5 of 12)", () => {
    expect(pipelineStepDisplay(4, 12)).toEqual({ step: 5, total: 12 });
  });

  it("falls back to view total when stages not loaded", () => {
    expect(pipelineStepDisplay(0, 0, 12)).toEqual({ step: 1, total: 12 });
  });

  it("returns null step when stage not found", () => {
    expect(pipelineStepDisplay(-1, 12)).toEqual({ step: null, total: 12 });
  });
});
