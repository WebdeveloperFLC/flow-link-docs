import type { DocumentCategory } from "./documentCategories";
import { resolveDocumentCategory } from "./documentCategories";
import type { ApplicationDocumentRequirement } from "./types";
import type { MasterItem } from "@/lib/masters";

/** Approved counselor-facing document sections (Documents tab). */
export const COUNSELOR_SECTION_ORDER = [
  "identity",
  "relationship",
  "financial",
  "employment",
  "academic",
  "travel_immigration",
  "medical",
  "forms_letters",
  "other_documents",
  "submission",
] as const;

export type CounselorSectionKey = (typeof COUNSELOR_SECTION_ORDER)[number];

export const COUNSELOR_SECTION_LABELS: Record<CounselorSectionKey, string> = {
  identity: "Identity",
  relationship: "Relationship",
  financial: "Financial",
  employment: "Employment",
  academic: "Academic",
  travel_immigration: "Travel & Immigration",
  medical: "Medical",
  forms_letters: "Forms & Letters",
  other_documents: "Other Documents",
  submission: "Submission",
};

const SUBMISSION_SECTION_KEYS = new Set([
  "submission",
  "fees_submission",
  "fees_qa_lodgement",
]);

function pseudoMasterItem(code: string, label: string): MasterItem {
  return {
    id: code,
    list_key: "document_types",
    code,
    label,
    metadata: {},
    is_active: true,
    sort_order: 0,
  };
}

function categoryToCounselorSection(category: DocumentCategory): CounselorSectionKey {
  switch (category) {
    case "identity":
      return "identity";
    case "relationship":
    case "family":
      return "relationship";
    case "financial":
      return "financial";
    case "employment":
      return "employment";
    case "academic":
      return "academic";
    case "police":
    case "travel":
      return "travel_immigration";
    case "medical":
      return "medical";
    case "forms":
      return "forms_letters";
    default:
      return "other_documents";
  }
}

/** Map ADR row → approved counselor section (ignores raw template section labels). */
export function resolveCounselorSectionForRequirement(
  req: Pick<
    ApplicationDocumentRequirement,
    "master_item_code" | "display_name" | "requirement_kind" | "section_key"
  >,
): { key: CounselorSectionKey; label: string } {
  if (
    req.requirement_kind === "milestone" ||
    SUBMISSION_SECTION_KEYS.has(req.section_key) ||
    /fee paid|application lodged|checklist|qa sign|submission|biometric completed|visa issued|aor received/.test(
      req.display_name.toLowerCase(),
    )
  ) {
    return { key: "submission", label: COUNSELOR_SECTION_LABELS.submission };
  }

  const category = resolveDocumentCategory(
    pseudoMasterItem(req.master_item_code, req.display_name),
  );
  const key = categoryToCounselorSection(category);
  return { key, label: COUNSELOR_SECTION_LABELS[key] };
}

export function counselorSectionSortIndex(key: string): number {
  const idx = COUNSELOR_SECTION_ORDER.indexOf(key as CounselorSectionKey);
  return idx >= 0 ? idx : COUNSELOR_SECTION_ORDER.length + 1;
}
