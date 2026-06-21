import type { DocumentCategory } from "./documentCategories";

/** Service context for document relevance (derived from case service_code + template name). */
export type ServiceDocumentProfile =
  | "student"
  | "spouse_dependent"
  | "visitor"
  | "work"
  | "general";

export function detectServiceDocumentProfile(
  serviceCode: string | null | undefined,
  templateName: string | null | undefined,
): ServiceDocumentProfile {
  const hay = `${serviceCode ?? ""} ${templateName ?? ""}`.toLowerCase();
  if (/spouse|dependent visitor|partner|common[- ]?law|family reun|super visa/.test(hay)) {
    return "spouse_dependent";
  }
  if (/student|study permit|sds|pgwp|college|university/.test(hay)) {
    return "student";
  }
  if (/visitor|tourist|trv|business visitor/.test(hay)) {
    return "visitor";
  }
  if (/work permit|lmia|pgwp/.test(hay)) {
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

export function shouldShowCategoryInAddDialog(
  profile: ServiceDocumentProfile,
  category: DocumentCategory,
  hasSearchQuery: boolean,
): boolean {
  if (hasSearchQuery) return true;
  return !HIDDEN_UNLESS_SEARCH[profile].has(category);
}
