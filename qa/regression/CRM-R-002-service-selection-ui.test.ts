import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { shouldShowTabSelectedSummary } from "@/lib/service-library/serviceSelectionSummary";

/**
 * CRM-R-002 — Edit client services dialog must not duplicate "Currently selected"
 * (parent SelectedServicesPanel + TabSelectedServices on All tab).
 */
describe("CRM-R-002 service selection UI", () => {
  it("inline + externalSelectedSummary skips tab-level duplicate panel", () => {
    expect(shouldShowTabSelectedSummary("inline", true)).toBe(false);
  });

  it("ClientServicesCard passes externalSelectedSummary to ServiceTabs", () => {
    const src = readFileSync(
      resolve(process.cwd(), "src/components/clients/ClientServicesCard.tsx"),
      "utf8",
    );
    expect(src).toContain("externalSelectedSummary");
    expect(src).toContain("<SelectedServicesPanel");
    expect(src).toMatch(/layout="inline"/);
  });

  it("ServiceTabs respects shouldShowTabSelectedSummary", () => {
    const src = readFileSync(resolve(process.cwd(), "src/components/leads/ServiceTabs.tsx"), "utf8");
    expect(src).toContain("shouldShowTabSelectedSummary");
    expect(src).toContain("externalSelectedSummary");
  });
});
