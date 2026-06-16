import { describe, expect, it } from "vitest";
import type { ServiceSelection } from "@/components/leads/ServiceTabs";
import {
  codesForTabSelection,
  serviceSelectionForTab,
  shouldShowTabSelectedSummary,
} from "@/lib/service-library/serviceSelectionSummary";

const SAMPLE: ServiceSelection = {
  coaching_services: ["ielts"],
  visa_services: ["a1111111-1111-4111-8111-111111111111::Canada::express"],
  admission_services: [],
  allied_services: ["insurance"],
  travel_services: [],
};

describe("serviceSelectionSummary", () => {
  it("hides tab summary when parent renders external panel (inline edit dialog)", () => {
    expect(shouldShowTabSelectedSummary("inline", true)).toBe(false);
    expect(shouldShowTabSelectedSummary("inline", false)).toBe(true);
    expect(shouldShowTabSelectedSummary("compact", true)).toBe(true);
  });

  it("slices selection per tab", () => {
    const visaOnly = serviceSelectionForTab("visa_services", SAMPLE);
    expect(visaOnly.visa_services).toHaveLength(1);
    expect(visaOnly.coaching_services).toHaveLength(0);
  });

  it("collects codes for label map resolution", () => {
    const codes = codesForTabSelection("all", SAMPLE);
    expect(codes).toContain("ielts");
    expect(codes).toContain("insurance");
    expect(codes.some((c) => c.includes("Canada"))).toBe(true);
  });
});
