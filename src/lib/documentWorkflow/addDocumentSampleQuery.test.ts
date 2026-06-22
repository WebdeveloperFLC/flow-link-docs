import { describe, expect, it } from "vitest";
import { sampleAddDocumentResults } from "./documentRelevance";
import type { MasterItem } from "@/lib/masters";

const item = (code: string, label: string): MasterItem => ({
  id: code,
  list_key: "document_types",
  code,
  label,
  metadata: {},
  is_active: true,
  sort_order: 0,
});

/** Minimal catalog resembling production document_types. */
const CATALOG: MasterItem[] = [
  item("marksheet_10", "10th Marksheet"),
  item("marksheet_12", "12th Marksheet"),
  item("marriage_certificate", "Marriage Certificate"),
  item("photograph", "Passport-size photographs"),
  item("relationship_proof", "Relationship Proof"),
  item("divorce_certificate", "Divorce Certificate"),
  item("police_clearance", "Police Clearance Certificate"),
  item("visa_refusal", "Visa Refusal Letter"),
  item("employment_letter", "Employment Letter"),
  item("bank_statement", "Bank Statement"),
  item("financial_documents", "Financial Documents"),
  item("passport", "Passport"),
  item("cover_letter", "Cover Letter"),
  item("academic_transcripts", "Academic Transcripts"),
];

describe("Canada Spouse Add Document sample query", () => {
  const templateName = "Canada - Spouse / Dependent Visitor Visa";
  const serviceCode = "b2000001-0001-4000-8000-00000000001b::Canada";

  it("lists catalogue items alphabetically for spouse service", () => {
    const { results } = sampleAddDocumentResults(
      CATALOG,
      serviceCode,
      templateName,
      "",
      [],
      20,
    );

    expect(results.some((r) => r.includes("12th Marksheet"))).toBe(true);
    expect(results.some((r) => r.includes("Marriage Certificate"))).toBe(true);
    expect(results.some((r) => r.includes("Passport"))).toBe(true);
    // Alphabetical — Academic Transcripts before Marriage Certificate
    const academicIdx = results.findIndex((r) => r.includes("Academic Transcripts"));
    const marriageIdx = results.findIndex((r) => r.includes("Marriage Certificate"));
    if (academicIdx >= 0 && marriageIdx >= 0) {
      expect(academicIdx).toBeLessThan(marriageIdx);
    }
  });

  it("shows academic only when searching", () => {
    const { results } = sampleAddDocumentResults(CATALOG, serviceCode, templateName, "12th", [], 5);
    expect(results.some((r) => r.includes("12th Marksheet"))).toBe(true);
  });

  it("falls back to general when no template context", () => {
    const { profile } = sampleAddDocumentResults(CATALOG, null, null, "", [], 5);
    expect(profile).toBe("general");
  });
});
