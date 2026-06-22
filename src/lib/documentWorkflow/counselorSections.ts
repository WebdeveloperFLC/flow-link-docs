import type { DocumentSectionKey } from "./visaDocumentProfiles";
import { CODE_TO_SECTION, DOCUMENT_SECTION_LABELS, DOCUMENT_SECTION_ORDER } from "./visaDocumentProfiles";
import type { ApplicationDocumentRequirement } from "./types";

export type CounselorSectionKey = DocumentSectionKey;

export const COUNSELOR_SECTION_ORDER = DOCUMENT_SECTION_ORDER;
export const COUNSELOR_SECTION_LABELS = DOCUMENT_SECTION_LABELS;

export function resolveCounselorSectionForRequirement(
  req: Pick<
    ApplicationDocumentRequirement,
    "master_item_code" | "display_name" | "requirement_kind" | "section_key"
  >,
): { key: CounselorSectionKey; label: string } {
  if (req.requirement_kind !== "document") {
    return { key: "other_documents", label: COUNSELOR_SECTION_LABELS.other_documents };
  }

  const mapped = CODE_TO_SECTION[req.master_item_code];
  if (mapped) {
    return { key: mapped, label: COUNSELOR_SECTION_LABELS[mapped] };
  }

  if (req.section_key && req.section_key in COUNSELOR_SECTION_LABELS) {
    const key = req.section_key as CounselorSectionKey;
    return { key, label: COUNSELOR_SECTION_LABELS[key] };
  }

  return { key: "other_documents", label: COUNSELOR_SECTION_LABELS.other_documents };
}

export function counselorSectionSortIndex(key: string): number {
  const idx = COUNSELOR_SECTION_ORDER.indexOf(key as CounselorSectionKey);
  return idx >= 0 ? idx : COUNSELOR_SECTION_ORDER.length;
}
