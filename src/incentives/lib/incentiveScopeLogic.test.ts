import { describe, expect, it } from "vitest";
import { matchesScope, matchesServiceFilter, mergeScope, resolveScopePreset } from "./incentiveScopeLogic";

describe("resolveScopePreset", () => {
  it("allied_travel includes both masters", () => {
    const s = resolveScopePreset("allied_travel");
    expect(s.master_keys).toContain("allied_services");
    expect(s.master_keys).toContain("travel_financial");
  });
});

describe("matchesScope", () => {
  it("matches master key preset", () => {
    const scope = mergeScope("core_only", {});
    expect(matchesScope(scope, { master_key: "coaching_services" })).toBe(true);
    expect(matchesScope(scope, { master_key: "allied_services" })).toBe(false);
  });

  it("matches country and institution", () => {
    const scope = mergeScope(null, { country_codes: ["CA"], institution_ids: ["inst-1"] });
    expect(matchesScope(scope, { master_key: "admission_services", country_code: "CA", institution_id: "inst-1" })).toBe(true);
    expect(matchesScope(scope, { master_key: "admission_services", country_code: "US", institution_id: "inst-1" })).toBe(false);
  });

  it("requires first payment when milestone set", () => {
    const scope = mergeScope("all_services", {});
    expect(matchesScope(scope, { master_key: "coaching_services", is_first_payment: true }, { requireFirstPayment: true })).toBe(true);
    expect(matchesScope(scope, { master_key: "coaching_services", is_first_payment: false }, { requireFirstPayment: true })).toBe(false);
  });
});

describe("matchesServiceFilter", () => {
  it("blank matches all", () => {
    expect(matchesServiceFilter(null, { service_code: "abc" })).toBe(true);
  });

  it("matches service code prefix", () => {
    expect(matchesServiceFilter("lib-id", { service_code: "lib-id::CA" })).toBe(true);
  });
});
