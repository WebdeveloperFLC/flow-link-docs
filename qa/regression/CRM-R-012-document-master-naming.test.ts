import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { resolveDocumentMasterLabel } from "@/lib/documentMasterMatch";
import type { MasterItem } from "@/lib/masters";

const ACADEMIC_MASTER: MasterItem[] = [
  "Marksheet",
  "Degree Certificate",
  "Provisional Certificate",
  "Migration Certificate",
  "Consolidated Marksheet",
  "Academic Transcripts",
  "IELTS Language Test",
  "PTE Language Test",
].map((label, i) => ({
  id: `id-${i}`,
  list_key: "document_types",
  code: label.toLowerCase().replace(/\s+/g, "_"),
  label,
  metadata: {},
  is_active: true,
  sort_order: i * 10,
}));

/**
 * CRM-R-012 — Document Master drives identification display names across upload surfaces.
 */
describe("CRM-R-012 document master naming", () => {
  it("resolver prefers Marksheet over generic Academic Transcripts", () => {
    const r = resolveDocumentMasterLabel({
      masterItems: ACADEMIC_MASTER,
      filename: "B.Tech_Year2_Marksheet.pdf",
      coarseType: "Academic Transcripts",
    });
    expect(r.displayLabel).toBe("Marksheet");
  });

  it("classifyDocument integrates Document Master resolution", () => {
    const src = readFileSync(resolve(process.cwd(), "src/lib/classifyDocument.ts"), "utf8");
    expect(src).toContain("resolveWithDocumentMaster");
    expect(src).toContain("displayLabel");
    expect(src).toContain('fetchList("document_types")');
  });

  it("SectionBuilderCard uses master label for rename and custom_type", () => {
    const src = readFileSync(resolve(process.cwd(), "src/components/clients/SectionBuilderCard.tsx"), "utf8");
    expect(src).toContain("buildClassifiedDocumentName(displayLabel");
    expect(src).toContain("customTypeForRow = displayLabel");
  });

  it("SmartUploadZone uses buildClassifiedDocumentName with master label", () => {
    const src = readFileSync(resolve(process.cwd(), "src/components/documents/SmartUploadZone.tsx"), "utf8");
    expect(src).toContain("buildClassifiedDocumentName(masterLabel");
    expect(src).toContain("custom_type: masterLabel");
  });

  it("UploadZone uses master-selected type for classified filename", () => {
    const src = readFileSync(resolve(process.cwd(), "src/components/documents/UploadZone.tsx"), "utf8");
    expect(src).toContain("buildClassifiedDocumentName(effectiveType");
    expect(src).toContain("custom_type: effectiveType");
  });

  it("PersonWorkspaceCard uses master label naming", () => {
    const src = readFileSync(resolve(process.cwd(), "src/components/clients/PersonWorkspaceCard.tsx"), "utf8");
    expect(src).toContain("buildClassifiedDocumentName(masterLabel");
    expect(src).toContain("custom_type: masterLabel");
  });

  it("binder split exposes master-aware page typing", () => {
    const src = readFileSync(resolve(process.cwd(), "src/lib/binderSplit.ts"), "utf8");
    expect(src).toContain("inferTypeFromPageTextWithMaster");
    expect(src).toContain("resolveDocumentMasterLabel");
  });
});
