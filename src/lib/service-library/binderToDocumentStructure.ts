import type { FlcDocumentBinder, FlcDocumentBinderCategory } from "./knowledgeGuide/types";
import {
  DEFAULT_DOCUMENT_SECTION_TEMPLATES,
  slugKey,
  type DocumentStructureDocument,
  type DocumentStructureSection,
  type ServiceDocumentStructure,
} from "./documentStructure";
import { normalizeBinderItemText, resolveBinderItemMasterCode } from "./binderItemAliases";

/** Category label / key → document_structure section_key (mirrors LEGACY_SECTION_KEY_MAP). */
const BINDER_CATEGORY_SECTION_MAP: Record<string, string> = {
  identity: "personal_documents",
  personal: "personal_documents",
  academic: "academic_documents",
  education: "academic_documents",
  admission: "application_forms",
  financial: "financial_documents",
  "financial / proof of funds": "financial_documents",
  "proof of funds": "financial_documents",
  employment: "employment_documents",
  "employment proof": "employment_documents",
  "employment proof (if working)": "employment_documents",
  relationship: "relationship_documents",
  marriage: "relationship_documents",
  sponsor: "sponsor_documents",
  travel: "travel_documents",
  forms: "application_forms",
  application: "application_forms",
  business: "financial_documents",
  other: "other_documents",
};

const CORE_REQUIRED = new Set(["core", "required", "mandatory", "yes"]);

function resolveSectionKey(category: FlcDocumentBinderCategory): string {
  const raw = category.category.trim().toLowerCase();
  if (BINDER_CATEGORY_SECTION_MAP[raw]) return BINDER_CATEGORY_SECTION_MAP[raw];

  for (const [key, sectionKey] of Object.entries(BINDER_CATEGORY_SECTION_MAP)) {
    if (raw.includes(key) || key.includes(raw)) return sectionKey;
  }

  const slug = slugKey(category.category);
  const known = DEFAULT_DOCUMENT_SECTION_TEMPLATES.find((t) => t.section_key === slug);
  if (known) return known.section_key;

  return "other_documents";
}

function isMandatoryCategory(category: FlcDocumentBinderCategory): boolean {
  const req = (category.required ?? "").trim().toLowerCase();
  if (!req) return false;
  if (CORE_REQUIRED.has(req)) return true;
  return !/optional|if applicable|when applicable|not required/i.test(req);
}

function itemMandatory(category: FlcDocumentBinderCategory, itemText: string): boolean {
  if (/if applicable|optional|when required|if any/i.test(itemText)) return false;
  return isMandatoryCategory(category);
}

export type BinderToStructureOptions = {
  catalogueCodes: ReadonlySet<string>;
  /** Existing structure to merge section order from; new sections appended at end. */
  existing?: ServiceDocumentStructure | null;
};

/**
 * Convert FLC documentBinder categories → ServiceDocumentStructure for academy_metadata.
 * Unmapped items use master_item_code "other" with label preserved.
 */
export function binderToDocumentStructure(
  binder: FlcDocumentBinder,
  opts: BinderToStructureOptions,
): ServiceDocumentStructure {
  const sectionMap = new Map<string, DocumentStructureSection>();

  for (const category of binder.categories ?? []) {
    const sectionKey = resolveSectionKey(category);
    const sectionLabel =
      DEFAULT_DOCUMENT_SECTION_TEMPLATES.find((t) => t.section_key === sectionKey)?.label ??
      category.category.trim();

    if (!sectionMap.has(sectionKey)) {
      sectionMap.set(sectionKey, {
        section_key: sectionKey,
        label: sectionLabel,
        sort_order: sectionMap.size * 10 + 10,
        is_active: true,
        documents: [],
      });
    }

    const section = sectionMap.get(sectionKey)!;
    const seenInSection = new Set(section.documents.map((d) => d.item_key));

    for (const itemText of category.items ?? []) {
      const label = itemText.trim();
      if (!label) continue;

      const masterCode =
        resolveBinderItemMasterCode(label, opts.catalogueCodes) ??
        (opts.catalogueCodes.has("other") ? "other" : null);
      if (!masterCode) continue;

      const itemKey = slugKey(label, section.documents.length);
      if (seenInSection.has(itemKey)) continue;
      seenInSection.add(itemKey);

      const doc: DocumentStructureDocument = {
        item_key: itemKey,
        master_item_code: masterCode,
        label,
        mandatory: itemMandatory(category, label),
        is_active: true,
        sort_order: section.documents.length * 10 + 10,
        notes: normalizeBinderItemText(label) !== normalizeBinderItemText(category.category)
          ? undefined
          : undefined,
      };
      section.documents.push(doc);
    }
  }

  const sections = [...sectionMap.values()]
    .filter((s) => s.documents.length > 0)
    .map((s) => ({
      ...s,
      documents: [...s.documents].sort((a, b) => a.sort_order - b.sort_order),
    }))
    .sort((a, b) => a.sort_order - b.sort_order);

  return {
    sections,
    updated_at: new Date().toISOString(),
  };
}

/** Flatten binder items for comparison scripts. */
export function flattenBinderItems(binder: FlcDocumentBinder): { section: string; item: string }[] {
  const out: { section: string; item: string }[] = [];
  for (const cat of binder.categories ?? []) {
    for (const item of cat.items ?? []) {
      out.push({ section: cat.category, item: item.trim() });
    }
  }
  return out;
}
