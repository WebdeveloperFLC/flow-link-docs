import { describe, expect, it } from "vitest";
import {
  filterUploadableDocumentRequirements,
  isUploadableDocumentRequirement,
} from "./uploadableRequirements";
import type { ApplicationDocumentRequirement } from "./types";

const CATALOGUE = new Set([
  "passport",
  "marriage_certificate",
  "financial_documents",
  "relationship_proof",
  "other",
]);

function req(
  partial: Partial<ApplicationDocumentRequirement> & Pick<ApplicationDocumentRequirement, "display_name">,
): ApplicationDocumentRequirement {
  return {
    id: "1",
    client_service_case_id: "c",
    client_id: "cl",
    source: "template",
    template_item_id: "t",
    workflow_template_id: null,
    master_item_code: partial.master_item_code ?? "passport",
    display_name: partial.display_name,
    mandatory: true,
    requirement_kind: partial.requirement_kind ?? "document",
    section_key: partial.section_key ?? "identity",
    section_label: "Identity",
    display_group: null,
    party_scope: "applicant",
    person_id: null,
    is_suppressed: false,
    notes: null,
    sort_order: 0,
    ...partial,
  };
}

describe("isUploadableDocumentRequirement", () => {
  it("accepts catalogue-backed upload rows", () => {
    expect(
      isUploadableDocumentRequirement(
        req({ master_item_code: "marriage_certificate", display_name: "Marriage Certificate" }),
        CATALOGUE,
      ),
    ).toBe(true);
  });

  it("rejects locked non-upload assessment labels", () => {
    const blocked = [
      "Genuine Student (GS) requirement",
      "Financial capacity",
      "Client is physically in Canada",
      "No unauthorized work history",
      "Weak Genuine Student statement",
      "CoE / provider issues",
      "Insufficient financial evidence",
      "Wrong PR category",
      "No inadmissibility",
    ];
    for (const display_name of blocked) {
      expect(
        isUploadableDocumentRequirement(
          req({ master_item_code: "genuine_student_gs_requirement", display_name }),
          CATALOGUE,
        ),
      ).toBe(false);
    }
  });

  it("rejects slug pseudo-codes not in catalogue", () => {
    expect(
      isUploadableDocumentRequirement(
        req({
          master_item_code: "financial_capacity_for_full_program",
          display_name: "Financial capacity for full program",
        }),
        CATALOGUE,
      ),
    ).toBe(false);
  });

  it("rejects eligibility and submission sections", () => {
    expect(
      isUploadableDocumentRequirement(
        req({ section_key: "eligibility", display_name: "Passport", master_item_code: "passport" }),
        CATALOGUE,
      ),
    ).toBe(false);
    expect(
      isUploadableDocumentRequirement(
        req({
          section_key: "fees_submission",
          display_name: "Government visa fee paid",
          master_item_code: "other",
        }),
        CATALOGUE,
      ),
    ).toBe(false);
  });

  it("filters mixed ADR lists", () => {
    const rows = [
      req({ master_item_code: "passport", display_name: "Passport" }),
      req({
        master_item_code: "genuine_student_requirement",
        display_name: "Genuine Student (GS) requirement",
        section_key: "eligibility",
      }),
      req({ master_item_code: "marriage_certificate", display_name: "Marriage Certificate" }),
    ];
    const filtered = filterUploadableDocumentRequirements(rows, CATALOGUE);
    expect(filtered.map((r) => r.master_item_code)).toEqual(["passport", "marriage_certificate"]);
  });
});
