/**
 * Canonical document_types codes seeded in master_items.
 * Source: supabase/migrations/20260429160503_*.sql
 */
export const DOCUMENT_MASTER_CODES = new Set([
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

/** @param {string} code */
export function isValidMasterItemCode(code) {
  return DOCUMENT_MASTER_CODES.has(String(code ?? "").trim());
}

/** @param {string} code @param {string} [context] */
export function assertValidMasterItemCode(code, context = "manifest item") {
  const trimmed = String(code ?? "").trim();
  if (!isValidMasterItemCode(trimmed)) {
    throw new Error(
      `${context}: invalid master_item_code "${code}". Must be one of: ${[...DOCUMENT_MASTER_CODES].sort().join(", ")}`,
    );
  }
  return trimmed;
}
