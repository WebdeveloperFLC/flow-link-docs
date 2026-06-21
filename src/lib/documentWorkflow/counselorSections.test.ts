import { describe, expect, it } from "vitest";
import { resolveCounselorSectionForRequirement } from "./counselorSections";

describe("counselorSections", () => {
  it("maps passport template row to Identity", () => {
    const sec = resolveCounselorSectionForRequirement({
      master_item_code: "valid_passport_bio_page_and_relevant_visa_stamp_",
      display_name: "Valid passport — bio page and relevant visa/stamp pages",
      requirement_kind: "document",
      section_key: "identity_travel_documents",
    });
    expect(sec.label).toBe("Identity");
  });

  it("maps fee milestone to Submission", () => {
    const sec = resolveCounselorSectionForRequirement({
      master_item_code: "government_visa_fee_paid_official_receipt_saved",
      display_name: "Government visa fee paid; official receipt saved",
      requirement_kind: "milestone",
      section_key: "fees_submission",
    });
    expect(sec.label).toBe("Submission");
  });

  it("maps eligibility template section by document type not template label", () => {
    const sec = resolveCounselorSectionForRequirement({
      master_item_code: "relationship_proof",
      display_name: "Relationship is genuine and well documented",
      requirement_kind: "document",
      section_key: "eligibility_core_documents",
    });
    expect(sec.label).toBe("Relationship");
  });
});
