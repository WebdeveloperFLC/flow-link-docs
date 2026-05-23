/**
 * Centralized config for the OCR + extraction + verification pipeline.
 * See .lovable/plan.md (Phase 2/3).
 */

export const AUTO_FILL_MIN = 85;
export const REVIEW_MIN = 60;

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