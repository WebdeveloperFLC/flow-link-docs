/**
 * Centralized config for the OCR + extraction + verification pipeline.
 * See .lovable/plan.md (Phase 2/3).
 */

export const AUTO_FILL_MIN = 85;
export const REVIEW_MIN = 60;

/** Only auto-extract profile fields from short documents (keeps uploads fast). */
export const AUTO_EXTRACT_MAX_PAGES = 2;

/** Document types eligible for automatic profile extraction on upload. */
const AUTO_EXTRACT_TYPES = new Set<string>([
  "Passport",
  "English Language Proficiency Test",
  "IELTS / Language Test",
  "Academic Transcripts",
  "Academic Marksheets",
  "Birth Certificate",
  "Marriage Certificate",
  "GIC Certificate",
  "Provincial Attestation Letter",
  "Offer Letter",
  "Employment Letter",
  "Experience Letter",
  "Medical Report",
  "Police Clearance",
  "SOP",
]);

/** High-priority document types that should be classified/extracted first. */
const PRIORITY_TYPES = new Set<string>([
  "Passport",
  "English Language Proficiency Test",
  "IELTS / Language Test",
  "Academic Transcripts",
  "Academic Marksheets",
  "Financial Documents",
  "GIC Certificate",
  "Provincial Attestation Letter",
  "Employment Letter",
  "Experience Letter",
  "Photograph",
  "Refusal Letter",
]);

export function priorityForType(docType: string | null | undefined): 1 | 2 {
  if (!docType) return 2;
  return PRIORITY_TYPES.has(docType) ? 1 : 2;
}

/** Global kill-switch for the auto-fill stage (Phase 4). */
export const AUTO_FILL_ENABLED = true;

function customTypeHintsExtract(customType: string): boolean {
  const lower = customType.toLowerCase();
  return /passport|ielts|toefl|pte|celpip|duolingo|transcript|marksheet|birth cert|marriage cert|offer letter|gic|pal|employment letter|experience letter|medical report|police|sop|statement of purpose/i.test(
    lower,
  );
}

function typeEligibleForAutoExtract(documentType: string, customType?: string | null): boolean {
  if (AUTO_EXTRACT_TYPES.has(documentType)) return true;
  if (documentType === "Other" && customType?.trim()) return customTypeHintsExtract(customType);
  return false;
}

/** Whether to run automatic profile extraction after upload (type + page limit). */
export function shouldAutoExtractProfileFields(
  documentType: string | null | undefined,
  customType?: string | null,
  pageCount?: number,
): boolean {
  if (!AUTO_FILL_ENABLED) return false;
  if (pageCount != null && pageCount > AUTO_EXTRACT_MAX_PAGES) return false;
  const type = (documentType ?? "").trim();
  if (!type) return false;
  return typeEligibleForAutoExtract(type, customType);
}

export function autoExtractSkipReason(
  documentType: string | null | undefined,
  customType?: string | null,
  pageCount?: number,
): string | null {
  if (!AUTO_FILL_ENABLED) return "auto-fill disabled";
  if (pageCount != null && pageCount > AUTO_EXTRACT_MAX_PAGES) {
    return `${pageCount} pages (max ${AUTO_EXTRACT_MAX_PAGES} for auto-extract)`;
  }
  const type = (documentType ?? "").trim();
  if (!type || !typeEligibleForAutoExtract(type, customType)) {
    return "type not in auto-extract list";
  }
  return null;
}
