import { describe, expect, it } from "vitest";
import {
  createDefaultDocumentStructure,
  documentManifestToStructure,
  flattenDocumentStructureForSeeding,
  normalizeDocumentStructure,
  reorderDocumentsInSection,
  reorderSections,
  resolveDocumentStructure,
  slugKey,
} from "./documentStructure";

describe("documentStructure", () => {
  it("creates nine default section templates", () => {
    const s = createDefaultDocumentStructure();
    expect(s.sections).toHaveLength(9);
    expect(s.sections[0]?.section_key).toBe("personal_documents");
    expect(s.sections.at(-1)?.section_key).toBe("other_documents");
  });

  it("converts legacy document_manifest to hierarchical structure", () => {
    const structure = documentManifestToStructure([
      {
        item_key: "passport",
        label: "Passport",
        master_item_code: "passport",
        section_key: "personal",
        mandatory: true,
        sort_order: 10,
      },
      {
        item_key: "ielts",
        label: "IELTS",
        master_item_code: "ielts",
        section_key: "academic",
        mandatory: false,
        sort_order: 20,
      },
    ]);
    expect(structure.sections).toHaveLength(2);
    expect(structure.sections[0]?.section_key).toBe("personal_documents");
    expect(structure.sections[0]?.documents[0]?.master_item_code).toBe("passport");
    expect(structure.sections[1]?.section_key).toBe("academic_documents");
  });

  it("prefers document_structure over manifest", () => {
    const resolved = resolveDocumentStructure({
      document_structure: createDefaultDocumentStructure(),
      document_manifest: [
        { item_key: "x", label: "X", master_item_code: "passport" },
      ],
    });
    expect(resolved?.sections).toHaveLength(9);
  });

  it("flattens active sections for seeding and skips inactive catalogue codes", () => {
    const raw = {
      sections: [
        {
          section_key: "personal_documents",
          label: "Personal Documents",
          sort_order: 10,
          is_active: true,
          documents: [
            {
              item_key: "passport",
              master_item_code: "passport",
              mandatory: true,
              is_active: true,
              sort_order: 10,
            },
            {
              item_key: "ghost",
              master_item_code: "not_in_catalogue",
              mandatory: true,
              is_active: true,
              sort_order: 20,
            },
          ],
        },
        {
          section_key: "travel_documents",
          label: "Travel Documents",
          sort_order: 20,
          is_active: false,
          documents: [],
        },
      ],
    };
    const structure = normalizeDocumentStructure(raw)!;
    const items = flattenDocumentStructureForSeeding(structure, new Set(["passport", "ielts"]));
    expect(items).toHaveLength(1);
    expect(items[0]).toMatchObject({
      code: "passport",
      mandatory: true,
      sectionKey: "personal_documents",
      sectionLabel: "Personal Documents",
    });
  });

  it("reorders sections and documents via drag indices", () => {
    let structure = createDefaultDocumentStructure();
    structure = {
      ...structure,
      sections: structure.sections.map((s, i) =>
        s.section_key === "personal_documents"
          ? {
              ...s,
              documents: [
                {
                  item_key: "passport",
                  master_item_code: "passport",
                  mandatory: true,
                  is_active: true,
                  sort_order: 10,
                },
                {
                  item_key: "photo",
                  master_item_code: "photograph",
                  mandatory: false,
                  is_active: true,
                  sort_order: 20,
                },
              ],
            }
          : s,
      ),
    };
    const reorderedSections = reorderSections(
      structure,
      "financial_documents",
      "personal_documents",
    );
    expect(reorderedSections.sections[0]?.section_key).toBe("financial_documents");

    const reorderedDocs = reorderDocumentsInSection(
      structure,
      "personal_documents",
      "photo",
      "passport",
    );
    const personal = reorderedDocs.sections.find((s) => s.section_key === "personal_documents");
    expect(personal?.documents[0]?.item_key).toBe("photo");
  });

  it("slugKey normalizes codes", () => {
    expect(slugKey("Marriage Certificate")).toBe("marriage_certificate");
  });
});
