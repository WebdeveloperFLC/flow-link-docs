import { describe, expect, it } from "vitest";
import { MASTER_DOMAIN_REGISTRY, MASTER_DATA_CATEGORIES } from "@/hr-payroll/lib/masterDataRegistry";
import { WPMS_POLICY_KINDS, WPMS_DEFAULT_CONFIG } from "@/hr-payroll/lib/wpmsTypes";
import { ALL_HR_SCREENS, HR_SCREEN_ROUTES } from "@/hr-payroll/lib/constants";

describe("Epic 1 — Master Data + WPMS", () => {
  it("registers all master data categories", () => {
    expect(MASTER_DATA_CATEGORIES.length).toBeGreaterThanOrEqual(8);
    for (const cat of MASTER_DATA_CATEGORIES) {
      const domains = MASTER_DOMAIN_REGISTRY.filter((d) => d.categoryId === cat.id);
      expect(domains.length, cat.id).toBeGreaterThan(0);
    }
  });

  it("does not duplicate CRM masters in hr_masters registry", () => {
    const crm = MASTER_DOMAIN_REGISTRY.filter((d) => d.source === "crm");
    expect(crm.map((d) => d.id)).toEqual(expect.arrayContaining(["branches", "departments", "designations"]));
  });

  it("defines all WPMS policy kinds with default config", () => {
    expect(WPMS_POLICY_KINDS.length).toBe(6);
    for (const k of WPMS_POLICY_KINDS) {
      expect(WPMS_DEFAULT_CONFIG[k.id]).toBeDefined();
    }
  });

  it("admin and wpms screens have routes", () => {
    expect(ALL_HR_SCREENS).toContain("admin");
    expect(ALL_HR_SCREENS).toContain("masterData");
    expect(ALL_HR_SCREENS).toContain("wpms");
    expect(HR_SCREEN_ROUTES.admin).toBe("/hr/admin");
    expect(HR_SCREEN_ROUTES.wpms).toBe("/hr/admin/wpms");
  });
});
