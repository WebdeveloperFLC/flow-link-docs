import { describe, expect, it } from "vitest";
import {
  canUsePerformanceHubViewAs,
  performanceHubPreviewRoleCatalog,
  performanceHubViewAsRoleOptions,
} from "@/lib/performanceHubViewAs";

describe("performanceHubViewAs", () => {
  it("allows platform owner and administrators", () => {
    expect(canUsePerformanceHubViewAs(["admin"], "SUPER_ADMIN")).toBe(true);
    expect(canUsePerformanceHubViewAs(["administrator"], null)).toBe(true);
    expect(canUsePerformanceHubViewAs(["counselor"], null)).toBe(false);
    expect(canUsePerformanceHubViewAs(["manager"], null)).toBe(false);
  });

  it("builds role catalog from workspace nav", () => {
    const catalog = performanceHubPreviewRoleCatalog();
    expect(catalog).toContain("counselor");
    expect(catalog).toContain("manager");
    expect(catalog).toContain("director");
    expect(catalog).toContain("viewer");
  });

  it("filters role options to hub catalog", () => {
    const options = performanceHubViewAsRoleOptions(["admin"], "SUPER_ADMIN", []);
    expect(options.length).toBeGreaterThan(3);
    expect(options).toContain("counselor");
  });
});
