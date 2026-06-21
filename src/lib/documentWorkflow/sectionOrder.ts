/** Preferred section order for Documents tab (dynamic keys from ADR). */
export const SECTION_KEY_ORDER: string[] = [
  "identity",
  "academic",
  "academics",
  "experience",
  "work_experience",
  "employment",
  "financial",
  "finance",
  "financial_capacity_genuine_visitor",
  "family",
  "forms",
  "submission",
  "fees_submission",
  "fees_qa_lodgement",
  "supporting",
  "other",
  "other_documents",
  "additional",
];

export function sectionSortIndex(sectionKey: string): number {
  const key = sectionKey.toLowerCase();
  const idx = SECTION_KEY_ORDER.indexOf(key);
  return idx >= 0 ? idx : SECTION_KEY_ORDER.length + key.charCodeAt(0);
}

export function compareSectionKeys(a: string, b: string): number {
  const diff = sectionSortIndex(a) - sectionSortIndex(b);
  return diff !== 0 ? diff : a.localeCompare(b);
}
