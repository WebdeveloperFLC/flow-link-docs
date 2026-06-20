import { describe, expect, it } from "vitest";
import type { MasterItem } from "@/lib/masters";
import { masterDocumentFileName, resolveDocumentMasterLabel } from "@/lib/documentMasterMatch";

function mockMaster(labels: string[]): MasterItem[] {
  return labels.map((label, i) => ({
    id: `id-${i}`,
    list_key: "document_types",
    code: label.toLowerCase().replace(/\s+/g, "_"),
    label,
    metadata: {},
    is_active: true,
    sort_order: i * 10,
  }));
}

const ACADEMIC_MASTER = mockMaster([
  "Passport",
  "Marksheet",
  "Degree Certificate",
  "Diploma Certificate",
  "Provisional Certificate",
  "Migration Certificate",
  "Consolidated Marksheet",
  "Academic Transcript",
  "Academic Transcripts",
  "IELTS Language Test",
  "PTE Language Test",
  "Other",
]);

describe("resolveDocumentMasterLabel", () => {
  it("prefers Marksheet over generic Academic Transcripts", () => {
    const r = resolveDocumentMasterLabel({
      masterItems: ACADEMIC_MASTER,
      filename: "B.Tech_Year2_Marksheet.pdf",
      snippet: "statement of marks semester II",
      coarseType: "Academic Transcripts",
    });
    expect(r.label).toBe("Marksheet");
    expect(r.displayLabel).toBe("Marksheet");
    expect(r.documentType).toBe("Marksheet");
  });

  it("maps degree certificate upload to Degree Certificate master label", () => {
    const r = resolveDocumentMasterLabel({
      masterItems: ACADEMIC_MASTER,
      filename: "degree_certificate_scan.pdf",
      coarseType: "Academic Transcripts",
    });
    expect(r.label).toBe("Degree Certificate");
  });

  it("maps provisional certificate upload to Provisional Certificate", () => {
    const r = resolveDocumentMasterLabel({
      masterItems: ACADEMIC_MASTER,
      filename: "provisional_certificate.pdf",
      coarseType: "Academic Transcripts",
    });
    expect(r.label).toBe("Provisional Certificate");
  });

  it("maps migration certificate upload to Migration Certificate", () => {
    const r = resolveDocumentMasterLabel({
      masterItems: ACADEMIC_MASTER,
      filename: "migration_certificate.pdf",
      coarseType: "Academic Transcripts",
    });
    expect(r.label).toBe("Migration Certificate");
  });

  it("maps consolidated marksheet to Consolidated Marksheet", () => {
    const r = resolveDocumentMasterLabel({
      masterItems: ACADEMIC_MASTER,
      filename: "consolidated_marksheet.pdf",
      coarseType: "Academic Transcripts",
    });
    expect(r.label).toBe("Consolidated Marksheet");
  });

  it("maps IELTS TRF to IELTS Language Test master label", () => {
    const r = resolveDocumentMasterLabel({
      masterItems: ACADEMIC_MASTER,
      filename: "IELTS_TRF.pdf",
      snippet: "test report form international english language testing system",
      coarseType: "English Language Proficiency Test",
    });
    expect(r.label).toBe("IELTS Language Test");
  });

  it("maps PTE score report to PTE Language Test master label", () => {
    const r = resolveDocumentMasterLabel({
      masterItems: ACADEMIC_MASTER,
      filename: "PTE_Score_Report.pdf",
      snippet: "pearson test of english academic score report",
      coarseType: "English Language Proficiency Test",
    });
    expect(r.label).toBe("PTE Language Test");
  });

  it("falls back to generic Academic Transcripts when no specific signal", () => {
    const r = resolveDocumentMasterLabel({
      masterItems: ACADEMIC_MASTER,
      filename: "scan001.pdf",
      snippet: "university college semester",
      coarseType: "Academic Transcripts",
    });
    expect(r.label).toBe("Academic Transcripts");
  });

  it("uses metadata aliases when configured on master item", () => {
    const items = mockMaster(["Marksheet", "Academic Transcripts"]);
    items[0] = {
      ...items[0]!,
      metadata: { aliases: ["statement of marks", "grade sheet"] },
    };
    const r = resolveDocumentMasterLabel({
      masterItems: items,
      filename: "grade_sheet_2024.pdf",
      coarseType: "Academic Transcripts",
    });
    expect(r.label).toBe("Marksheet");
  });
});

describe("masterDocumentFileName", () => {
  it("renames using master label not original filename", () => {
    expect(masterDocumentFileName("Marksheet", "B.Tech_Marksheet.pdf", 1)).toBe("Marksheet");
  });

  it("bumps version when same master label stem exists", () => {
    expect(masterDocumentFileName("Marksheet", "other.pdf", 2)).toBe("Marksheet_v2");
  });
});
