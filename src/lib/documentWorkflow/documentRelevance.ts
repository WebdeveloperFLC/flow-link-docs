import type { DocumentCategory } from "./documentCategories";
import { resolveDocumentCategory } from "./documentCategories";
import type { MasterItem } from "@/lib/masters";

/** Service context for document relevance (derived from case service_code + template name). */
export type ServiceDocumentProfile =
  | "student"
  | "spouse_dependent"
  | "visitor"
  | "work"
  | "general";

/** Preferred top codes per profile (Add Document default ordering). */
export const PROFILE_PINNED_CODES: Record<ServiceDocumentProfile, string[]> = {
  spouse_dependent: [
    "marriage_certificate",
    "photograph",
    "relationship_proof",
    "divorce_certificate",
    "police_clearance",
    "visa_refusal",
    "refusal_letter",
    "employment_letter",
    "experience_letter",
    "bank_statement",
    "financial_documents",
    "affidavit_of_support",
    "cover_letter",
    "passport",
    "birth_certificate",
  ],
  student: [
    "passport",
    "academic_transcripts",
    "ielts_language_test",
    "offer_letter",
    "bank_statement",
    "gic_certificate",
    "tuition_fee_receipt",
    "statement_of_purpose",
  ],
  visitor: [
    "passport",
    "bank_statement",
    "financial_documents",
    "travel_history",
    "visa_refusal",
    "employment_letter",
    "cover_letter",
  ],
  work: [
    "employment_letter",
    "experience_letter",
    "passport",
    "police_clearance",
    "medical_report",
  ],
  general: [],
};

export function detectServiceDocumentProfile(
  serviceCode: string | null | undefined,
  templateName: string | null | undefined,
): ServiceDocumentProfile {
  const hay = `${serviceCode ?? ""} ${templateName ?? ""}`.toLowerCase();

  // Spouse / partner / dependent visitor — BEFORE generic "visitor" match
  if (
    /spouse|partner visa|common[- ]?law|family reun|super visa|dependent visitor|spouse\s*[\/|]\s*dependent|dependent\s+owp|owp.*spouse/.test(
      hay,
    )
  ) {
    return "spouse_dependent";
  }
  if (/student|study permit|sds|college|university|pgwp(?!\s*spouse)/.test(hay)) {
    return "student";
  }
  if (/visitor|tourist|trv|business visitor/.test(hay)) {
    return "visitor";
  }
  if (/work permit|lmia/.test(hay)) {
    return "work";
  }
  return "general";
}

/** Category sort priority — lower index = shown first in Add Document. */
export const CATEGORY_PRIORITY: Record<ServiceDocumentProfile, DocumentCategory[]> = {
  spouse_dependent: [
    "relationship",
    "identity",
    "financial",
    "employment",
    "police",
    "medical",
    "travel",
    "family",
    "forms",
    "other",
    "academic",
  ],
  student: [
    "academic",
    "financial",
    "identity",
    "employment",
    "police",
    "medical",
    "forms",
    "relationship",
    "travel",
    "family",
    "other",
  ],
  visitor: [
    "identity",
    "financial",
    "travel",
    "employment",
    "relationship",
    "police",
    "medical",
    "family",
    "forms",
    "other",
    "academic",
  ],
  work: [
    "employment",
    "identity",
    "financial",
    "police",
    "medical",
    "academic",
    "relationship",
    "travel",
    "forms",
    "family",
    "other",
  ],
  general: [
    "identity",
    "financial",
    "relationship",
    "academic",
    "employment",
    "police",
    "medical",
    "travel",
    "family",
    "forms",
    "other",
  ],
};

/** Hidden from default Add Document list unless user is actively searching. */
export const HIDDEN_UNLESS_SEARCH: Record<ServiceDocumentProfile, Set<DocumentCategory>> = {
  spouse_dependent: new Set(["academic"]),
  visitor: new Set(["academic"]),
  student: new Set(),
  work: new Set(),
  general: new Set(),
};

export function categoryRank(
  profile: ServiceDocumentProfile,
  category: DocumentCategory,
): number {
  const order = CATEGORY_PRIORITY[profile];
  const idx = order.indexOf(category);
  return idx >= 0 ? idx : order.length + 1;
}

export function pinnedRank(profile: ServiceDocumentProfile, code: string): number {
  const idx = PROFILE_PINNED_CODES[profile].indexOf(code);
  return idx >= 0 ? idx : PROFILE_PINNED_CODES[profile].length + 100;
}

export function shouldShowCategoryInAddDialog(
  profile: ServiceDocumentProfile,
  category: DocumentCategory,
  hasSearchQuery: boolean,
): boolean {
  if (hasSearchQuery) return true;
  return !HIDDEN_UNLESS_SEARCH[profile].has(category);
}

/** Label-based boost when master code differs from expected pinned codes. */
export function labelPinnedBoost(profile: ServiceDocumentProfile, item: MasterItem): number {
  const label = item.label.toLowerCase();
  if (profile !== "spouse_dependent") return 0;
  if (/marriage certificate/.test(label)) return 200;
  if (/wedding photo|relationship proof/.test(label)) return 190;
  if (/divorce/.test(label)) return 180;
  if (/police|pcc|clearance/.test(label)) return 170;
  if (/refusal/.test(label)) return 160;
  if (/sponsor.*employ|employment letter/.test(label)) return 150;
  if (/bank statement|financial|sponsor.*fund/.test(label)) return 140;
  if (/explanation|cover letter/.test(label)) return 130;
  return 0;
}

export function compareAddDocumentItems(
  profile: ServiceDocumentProfile,
  a: MasterItem,
  b: MasterItem,
): number {
  const pinA = pinnedRank(profile, a.code);
  const pinB = pinnedRank(profile, b.code);
  if (pinA !== pinB) return pinA - pinB;

  const boostA = labelPinnedBoost(profile, a);
  const boostB = labelPinnedBoost(profile, b);
  if (boostA !== boostB) return boostB - boostA;

  const catA = categoryRank(profile, resolveDocumentCategory(a));
  const catB = categoryRank(profile, resolveDocumentCategory(b));
  if (catA !== catB) return catA - catB;

  return a.label.localeCompare(b.label);
}

/** Sample top-N labels for UAT / debugging (client-side query simulation). */
export function sampleAddDocumentResults(
  items: MasterItem[],
  serviceCode: string | null | undefined,
  templateName: string | null | undefined,
  query = "",
  excludedCodes: string[] = [],
  limit = 15,
): { profile: ServiceDocumentProfile; results: string[] } {
  const profile = detectServiceDocumentProfile(serviceCode, templateName);
  const excluded = new Set(excludedCodes);
  const hasSearch = !!query.trim();

  const filtered = items
    .filter((item) => item.is_active && !excluded.has(item.code))
    .filter((item) =>
      shouldShowCategoryInAddDialog(profile, resolveDocumentCategory(item), hasSearch),
    )
    .filter((item) => {
      if (!hasSearch) return true;
      const q = query.toLowerCase();
      return (
        item.label.toLowerCase().includes(q) ||
        item.code.toLowerCase().includes(q)
      );
    })
    .sort((a, b) => compareAddDocumentItems(profile, a, b))
    .slice(0, limit)
    .map((item) => {
      const cat = resolveDocumentCategory(item);
      return `${item.label} (${cat})`;
    });

  return { profile, results: filtered };
}
