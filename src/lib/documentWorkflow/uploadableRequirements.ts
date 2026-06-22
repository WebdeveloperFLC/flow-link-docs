import type { ApplicationDocumentRequirement } from "./types";

/** Template section keys that must never surface on the Documents tab. */
export const NON_UPLOAD_SECTION_KEYS = new Set([
  "eligibility",
  "red_flags",
  "redflags",
  "red_flag",
  "compliance",
  "assessment",
  "verification",
  "guidance",
  "counselor_guidance",
  "fees_submission",
  "fees_qa_lodgement",
  "submission",
]);

/**
 * Assessment / checklist / guidance labels that must never appear as upload rows.
 * Locked per DOCUMENT_MANAGEMENT_ARCHITECTURE.md (simplified).
 */
export const NON_UPLOAD_DISPLAY_PATTERNS: RegExp[] = [
  /genuine student/i,
  /\bgs\b requirement/i,
  /financial capacity/i,
  /client is physically in canada/i,
  /unauthorized work/i,
  /weak genuine student/i,
  /coe\s*\/\s*provider/i,
  /insufficient financial evidence/i,
  /wrong pr category/i,
  /inadmissibility/i,
  /relationship genuine/i,
  /strong ties to home country/i,
  /principal applicant eligible/i,
  /english proficiency/i,
  /oshc gaps/i,
  /red flag/i,
  /\beligibility\b/i,
  /\bassessment\b/i,
  /\bverification\b/i,
  /qa sign/i,
  /fee paid/i,
  /application lodged/i,
  /checklist signed/i,
  /biometric completed/i,
  /visa issued/i,
  /aor received/i,
];

export type UploadableRequirementRef = Pick<
  ApplicationDocumentRequirement,
  "master_item_code" | "display_name" | "section_key" | "requirement_kind"
>;

/** True when ADR row is a real uploadable document (catalogue code + not assessment text). */
export function isUploadableDocumentRequirement(
  req: UploadableRequirementRef,
  validCatalogueCodes: ReadonlySet<string>,
): boolean {
  if (req.requirement_kind !== "document") return false;

  const sectionKey = (req.section_key ?? "").trim().toLowerCase();
  if (NON_UPLOAD_SECTION_KEYS.has(sectionKey)) return false;

  const displayName = (req.display_name ?? "").trim();
  if (!displayName) return false;

  for (const pattern of NON_UPLOAD_DISPLAY_PATTERNS) {
    if (pattern.test(displayName)) return false;
  }

  const code = (req.master_item_code ?? "").trim();
  if (!code || !validCatalogueCodes.has(code)) return false;

  return true;
}

export function filterUploadableDocumentRequirements<T extends UploadableRequirementRef>(
  requirements: T[],
  validCatalogueCodes: ReadonlySet<string>,
): T[] {
  return requirements.filter((req) => isUploadableDocumentRequirement(req, validCatalogueCodes));
}
