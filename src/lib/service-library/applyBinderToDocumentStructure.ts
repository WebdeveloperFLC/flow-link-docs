import type { FlcDocumentBinder } from "./knowledgeGuide/types";
import type { ServiceDocumentStructure } from "./documentStructure";
import { normalizeDocumentStructure } from "./documentStructure";
import { binderToDocumentStructure } from "./binderToDocumentStructure";

export type ApplyBinderOptions = {
  catalogueCodes: ReadonlySet<string>;
  /** When true, replace existing document_structure entirely from binder. Default: merge/update. */
  replace?: boolean;
};

/**
 * Merge auto-generated document_structure from documentBinder into metadata.
 * Only updates academy_metadata.document_structure — never touches client ADRs.
 */
export function applyBinderToDocumentStructure(
  binder: FlcDocumentBinder | undefined | null,
  existingRaw: unknown,
  opts: ApplyBinderOptions,
): ServiceDocumentStructure | null {
  if (!binder?.categories?.length) return normalizeDocumentStructure(existingRaw);

  const existing = normalizeDocumentStructure(existingRaw);
  const generated = binderToDocumentStructure(binder, {
    catalogueCodes: opts.catalogueCodes,
    existing,
  });

  if (opts.replace || !existing) return generated;

  // Merge: generated sections overwrite matching section_keys; preserve admin-only sections.
  const mergedKeys = new Set(generated.sections.map((s) => s.section_key));
  const preserved = existing.sections.filter((s) => !mergedKeys.has(s.section_key));
  return {
    sections: [...generated.sections, ...preserved].sort((a, b) => a.sort_order - b.sort_order),
    updated_at: new Date().toISOString(),
  };
}

/** Default document_types catalogue codes (matches scripts/lib/document-master-codes.mjs). */
export const DEFAULT_DOCUMENT_TYPE_CODES = new Set([
  "passport",
  "birth_certificate",
  "sop",
  "resume",
  "academic_transcripts",
  "financial_documents",
  "visa_forms",
  "offer_letter",
  "gic_certificate",
  "tuition_fee_receipt",
  "medical_report",
  "ielts_language_test",
  "photograph",
  "marriage_certificate",
  "divorce_certificate",
  "police_clearance",
  "affidavit_of_support",
  "sponsorship_letter",
  "property_documents",
  "employment_letter",
  "experience_letter",
  "noc",
  "other",
]);
