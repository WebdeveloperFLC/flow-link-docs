import { describe, expect, it } from "vitest";
import fs from "node:fs";
import path from "node:path";
import {
  binderToDocumentStructure,
  flattenBinderItems,
} from "./binderToDocumentStructure";
import { DEFAULT_DOCUMENT_TYPE_CODES } from "./applyBinderToDocumentStructure";
import { resolveBinderItemMasterCode } from "./binderItemAliases";

const canadaPath = path.resolve(
  process.cwd(),
  "content/service-library/canada-student-visa.json",
);

describe("binderToDocumentStructure", () => {
  it("maps Canada student visa binder categories to document_structure sections", () => {
    const meta = JSON.parse(fs.readFileSync(canadaPath, "utf8"));
    const binder = meta.documentBinder;
    expect(binder?.categories?.length).toBeGreaterThan(0);

    const structure = binderToDocumentStructure(binder, {
      catalogueCodes: DEFAULT_DOCUMENT_TYPE_CODES,
    });

    expect(structure.sections.length).toBeGreaterThan(0);
    const keys = structure.sections.map((s) => s.section_key);
    expect(keys).toContain("personal_documents");
    expect(keys).toContain("academic_documents");
    expect(keys).toContain("financial_documents");

    const allDocs = structure.sections.flatMap((s) => s.documents);
    expect(allDocs.some((d) => d.master_item_code === "passport")).toBe(true);
    expect(allDocs.some((d) => d.master_item_code === "ielts_language_test")).toBe(true);
    expect(allDocs.some((d) => d.master_item_code === "offer_letter")).toBe(true);
  });

  it("marks core categories as mandatory unless item says if applicable", () => {
    const structure = binderToDocumentStructure(
      {
        categories: [
          {
            category: "Identity",
            required: "Core",
            items: ["Passport (all pages)", "Birth certificate (optional copy)"],
          },
        ],
      },
      { catalogueCodes: DEFAULT_DOCUMENT_TYPE_CODES },
    );
    const personal = structure.sections.find((s) => s.section_key === "personal_documents");
    expect(personal?.documents[0]?.mandatory).toBe(true);
  });

  it("flattenBinderItems returns section + item pairs", () => {
    const items = flattenBinderItems({
      categories: [{ category: "Identity", items: ["Passport"] }],
    });
    expect(items).toEqual([{ section: "Identity", item: "Passport" }]);
  });
});

describe("binderItemAliases", () => {
  it("resolves passport and IELTS from binder text", () => {
    expect(resolveBinderItemMasterCode("Passport (all used pages)", DEFAULT_DOCUMENT_TYPE_CODES)).toBe(
      "passport",
    );
    expect(resolveBinderItemMasterCode("English test result (IELTS/PTE/TOEFL)", DEFAULT_DOCUMENT_TYPE_CODES)).toBe(
      "ielts_language_test",
    );
  });
});
