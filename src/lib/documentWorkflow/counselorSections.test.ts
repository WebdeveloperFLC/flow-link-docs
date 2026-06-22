import { describe, expect, it } from "vitest";
import { resolveCounselorSectionForRequirement } from "./counselorSections";

describe("counselorSections", () => {
  it("maps passport to Personal Documents", () => {
    const sec = resolveCounselorSectionForRequirement({
      master_item_code: "passport",
      display_name: "Passport",
      requirement_kind: "document",
      section_key: "identity",
    });
    expect(sec.label).toBe("Personal Documents");
  });

  it("maps marriage certificate to Relationship Documents", () => {
    const sec = resolveCounselorSectionForRequirement({
      master_item_code: "marriage_certificate",
      display_name: "Marriage Certificate",
      requirement_kind: "document",
      section_key: "eligibility_core_documents",
    });
    expect(sec.label).toBe("Relationship Documents");
  });

  it("maps milestones to Other Documents (not shown on upload tab)", () => {
    const sec = resolveCounselorSectionForRequirement({
      master_item_code: "other",
      display_name: "Government visa fee paid",
      requirement_kind: "milestone",
      section_key: "fees_submission",
    });
    expect(sec.label).toBe("Other Documents");
  });
});
