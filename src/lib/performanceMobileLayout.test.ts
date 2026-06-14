import { describe, expect, it } from "vitest";
import { PERFORMANCE_MOBILE_PAGE } from "./performanceMobileLayout";

describe("performanceMobileLayout", () => {
  it("targets 390px mobile shell with desktop expansion", () => {
    expect(PERFORMANCE_MOBILE_PAGE).toContain("max-w-[390px]");
    expect(PERFORMANCE_MOBILE_PAGE).toContain("md:max-w-7xl");
  });
});
