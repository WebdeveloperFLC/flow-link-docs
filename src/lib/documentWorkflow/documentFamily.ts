import type { MasterItem } from "@/lib/masters";

/** Checklist row used for family duplicate detection. */
export interface ChecklistRequirementRef {
  master_item_code: string;
  display_name: string;
}

/**
 * Canonical master_item codes — family anchor when code is already in catalogue.
 * Two checklist rows match when they share the same family key.
 */
const CANONICAL_MASTER_CODES = new Set([
  "passport",
  "birth_certificate",
  "photograph",
  "wedding_photos",
  "national_id",
  "marriage_certificate",
  "divorce_certificate",
  "relationship_proof",
  "police_clearance",
  "academic_transcripts",
  "marksheet_10",
  "marksheet_12",
  "degree_certificate",
  "ielts_language_test",
  "offer_letter",
  "bank_statement",
  "financial_documents",
  "gic_certificate",
  "tuition_fee_receipt",
  "affidavit_of_support",
  "employment_letter",
  "experience_letter",
  "salary_slips",
  "resume",
  "noc",
  "medical_report",
  "visa_refusal",
  "refusal_letter",
  "travel_history",
  "visa_forms",
  "statement_of_purpose",
  "personal_statement",
  "cover_letter",
  "sop",
  "property_documents",
  "sponsorship_letter",
  "other",
]);

/** Label/code keyword → canonical family (first match wins). */
const FAMILY_RULES: Array<{ pattern: RegExp; family: string }> = [
  { pattern: /passport.size|passport-size|wedding photo|digital photo/, family: "photograph" },
  { pattern: /photograph|\bphotos?\b/, family: "photograph" },
  { pattern: /\bpassport\b|bio page|visa stamp|visa\/stamp/, family: "passport" },
  { pattern: /marriage cert|marriage certificate/, family: "marriage_certificate" },
  { pattern: /wedding photo/, family: "wedding_photos" },
  { pattern: /relationship proof|relationship evidence/, family: "relationship_proof" },
  { pattern: /divorce/, family: "divorce_certificate" },
  { pattern: /birth cert/, family: "birth_certificate" },
  { pattern: /police|pcc|clearance cert/, family: "police_clearance" },
  { pattern: /bank statement|\bbank\b/, family: "bank_statement" },
  { pattern: /financial doc|proof of fund|funds for|settlement fund/, family: "financial_documents" },
  { pattern: /\bgic\b/, family: "gic_certificate" },
  { pattern: /tuition/, family: "tuition_fee_receipt" },
  { pattern: /affidavit|sponsor/, family: "affidavit_of_support" },
  { pattern: /employment letter|employ.*letter/, family: "employment_letter" },
  { pattern: /experience letter/, family: "experience_letter" },
  { pattern: /salary slip|pay slip/, family: "salary_slips" },
  { pattern: /\bresume\b|\bcv\b/, family: "resume" },
  { pattern: /\bnoc\b|no objection/, family: "noc" },
  { pattern: /medical|biometric/, family: "medical_report" },
  { pattern: /refusal letter|visa refusal/, family: "visa_refusal" },
  { pattern: /travel history/, family: "travel_history" },
  { pattern: /visa form|\bimm\b/, family: "visa_forms" },
  { pattern: /statement of purpose|\bsop\b/, family: "statement_of_purpose" },
  { pattern: /cover letter|explanation letter/, family: "cover_letter" },
  { pattern: /10th|tenth/, family: "marksheet_10" },
  { pattern: /12th|twelfth/, family: "marksheet_12" },
  { pattern: /transcript|marksheet|degree|diploma/, family: "academic_transcripts" },
  { pattern: /ielts|language test|toefl|pte/, family: "ielts_language_test" },
  { pattern: /offer letter/, family: "offer_letter" },
];

function norm(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
}

/** Resolve canonical document family — used for duplicate detection across template slugs + master codes. */
export function resolveDocumentFamily(code: string, displayName = ""): string {
  const c = (code ?? "").trim();
  if (CANONICAL_MASTER_CODES.has(c)) return c;

  const hay = norm(`${c.replace(/_/g, " ")} ${displayName}`);
  for (const { pattern, family } of FAMILY_RULES) {
    if (pattern.test(hay)) return family;
  }

  return c || norm(displayName).replace(/\s+/g, "_") || "unknown";
}

export function resolveDocumentFamilyFromMasterItem(item: MasterItem): string {
  return resolveDocumentFamily(item.code, item.label);
}

/** Families already represented on the case checklist (template + manual rows). */
export function buildOccupiedDocumentFamilies(
  checklist: ChecklistRequirementRef[],
): Set<string> {
  const families = new Set<string>();
  for (const row of checklist) {
    families.add(resolveDocumentFamily(row.master_item_code, row.display_name));
  }
  return families;
}

export function isDocumentFamilyOnChecklist(
  item: MasterItem,
  occupiedFamilies: Set<string>,
): boolean {
  return occupiedFamilies.has(resolveDocumentFamilyFromMasterItem(item));
}
