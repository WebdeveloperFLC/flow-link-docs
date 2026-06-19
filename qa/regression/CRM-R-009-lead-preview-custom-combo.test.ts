import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { buildLeadCustomComboCodes } from "@/lib/leads/leadServicePreview";

/**
 * CRM-R-009 — Lead Preview must show Travel & Financial and Custom Combo services.
 */
describe("CRM-R-009 lead preview custom combo", () => {
  it("buildLeadCustomComboCodes returns travel-only selections", () => {
    expect(
      buildLeadCustomComboCodes({
        coaching_services: [],
        visa_services: [],
        allied_services: [],
        travel_financial_services: ["travel-insurance", "forex-card"],
      }),
    ).toEqual(["travel-insurance", "forex-card"]);
  });

  it("buildLeadCustomComboCodes merges coaching, visa, allied and travel", () => {
    expect(
      buildLeadCustomComboCodes({
        coaching_services: ["ielts-prep"],
        visa_services: ["CA::study-permit"],
        allied_services: ["medical"],
        travel_financial_services: ["travel-insurance"],
      }),
    ).toEqual(["ielts-prep", "CA::study-permit", "medical", "travel-insurance"]);
  });

  it("buildLeadCustomComboCodes is empty when no combo-scope services", () => {
    expect(buildLeadCustomComboCodes({})).toEqual([]);
  });

  it("LeadDetail renders category rows, travel, and conditional custom combo", () => {
    const src = readFileSync(
      resolve(process.cwd(), "src/pages/leads/LeadDetail.tsx"),
      "utf8",
    );
    expect(src).toContain('label="Coaching"');
    expect(src).toContain('label="Visa & Immigration"');
    expect(src).toContain('label="Admission"');
    expect(src).toContain('label="Allied"');
    expect(src).toContain('label="Travel & Financial"');
    expect(src).toContain('label="Custom Combo"');
    expect(src).toContain("buildLeadCustomComboCodes");
    expect(src).toContain("customComboCodes.length > 0");
    expect(src).toContain("lead.travel_financial_services");
  });
});
