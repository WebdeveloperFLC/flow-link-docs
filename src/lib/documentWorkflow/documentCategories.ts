import type { MasterItem } from "@/lib/masters";

/** Counselor-facing document categories (Add Document + relevance). */
export type DocumentCategory =
  | "academic"
  | "identity"
  | "relationship"
  | "police"
  | "financial"
  | "employment"
  | "medical"
  | "travel"
  | "family"
  | "forms"
  | "other";

export const DOCUMENT_CATEGORY_LABELS: Record<DocumentCategory, string> = {
  academic: "Academic",
  identity: "Identity",
  relationship: "Relationship",
  police: "Police",
  financial: "Financial",
  employment: "Employment",
  medical: "Medical",
  travel: "Travel",
  family: "Family",
  forms: "Forms",
  other: "Other",
};

const CODE_CATEGORY: Record<string, DocumentCategory> = {
  marriage_certificate: "relationship",
  divorce_certificate: "relationship",
  photograph: "relationship",
  wedding_photos: "relationship",
  relationship_proof: "relationship",
  police_clearance: "police",
  passport: "identity",
  birth_certificate: "identity",
  national_id: "identity",
  gic_certificate: "financial",
  financial_documents: "financial",
  bank_statement: "financial",
  tuition_fee_receipt: "financial",
  employment_letter: "employment",
  experience_letter: "employment",
  salary_slips: "employment",
  medical_report: "medical",
  visa_refusal: "travel",
  refusal_letter: "travel",
  travel_history: "travel",
  visa_forms: "forms",
  statement_of_purpose: "forms",
  personal_statement: "forms",
};

function norm(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
}

/** Resolve category from master item — metadata.category wins, then code rules, then label heuristics. */
export function resolveDocumentCategory(item: MasterItem): DocumentCategory {
  const metaCat = item.metadata?.category;
  if (typeof metaCat === "string" && metaCat in DOCUMENT_CATEGORY_LABELS) {
    return metaCat as DocumentCategory;
  }

  if (CODE_CATEGORY[item.code]) return CODE_CATEGORY[item.code];

  const label = norm(item.label);
  const code = norm(item.code.replace(/_/g, " "));

  if (/10th|12th|marksheet|transcript|degree|diploma|ielts|toefl|pte|offer letter|pal|aps|lor|academic/.test(label + " " + code)) {
    return "academic";
  }
  if (/marriage|wedding|relationship|divorce|spouse/.test(label)) return "relationship";
  if (/passport|birth|photo|aadhaar|pan|national id|driving/.test(label)) return "identity";
  if (/police|pcc|clearance/.test(label)) return "police";
  if (/bank|gic|tuition|financial|sponsor|itr|affidavit|fund/.test(label)) return "financial";
  if (/employ|salary|experience|resume|cv|noc/.test(label)) return "employment";
  if (/medical|vaccin/.test(label)) return "medical";
  if (/refusal|travel history|visa copy/.test(label)) return "travel";
  if (/family|dependent/.test(label)) return "family";
  if (/visa form|imm|sop|statement of purpose|cover letter/.test(label)) return "forms";

  return "other";
}

export function formatDocumentWithCategory(item: MasterItem): string {
  const cat = resolveDocumentCategory(item);
  return `${item.label} (${DOCUMENT_CATEGORY_LABELS[cat]})`;
}
