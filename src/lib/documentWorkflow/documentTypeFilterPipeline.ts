import type { MasterItem } from "@/lib/masters";
import { DOCUMENT_CATEGORY_LABELS, resolveDocumentCategory, type DocumentCategory } from "./documentCategories";
import {
  categoryRank,
  compareAddDocumentItems,
  detectServiceDocumentProfile,
  type ServiceDocumentProfile,
} from "./documentRelevance";
import { scoreDocumentTypeMatch } from "./searchDocumentTypes";

/** Counts at each Add Document filter stage — for UAT / debugging. */
export interface DocumentTypeFilterPipelineCounts {
  /** 1. Active items returned from useMasterItems / fetchList. */
  masterActiveTotal: number;
  /** 2. Codes on case checklist (informational — not removed from picker). */
  onChecklistCount: number;
  /** 3. After relevance sort (same count as master when search empty). */
  afterRelevance: number;
  /** 4. After search text filter. */
  afterSearch: number;
  /** 5. Items rendered in dropdown (= afterSearch). */
  uiRendered: number;
  /** Category breakdown of rendered list. */
  categoryCounts: Record<string, number>;
  /** Number of category groups rendered. */
  renderedGroupCount: number;
  profile: ServiceDocumentProfile;
  hiddenBySearch: string[];
  onChecklistCodes: string[];
}

function applySearchFilter(
  items: MasterItem[],
  query: string,
  profile: ServiceDocumentProfile,
): MasterItem[] {
  const q = query.trim();
  if (!q) return items;
  return items.filter((item) => scoreDocumentTypeMatch(item, q, profile) > 0);
}

function sortByRelevance(items: MasterItem[], profile: ServiceDocumentProfile): MasterItem[] {
  return [...items].filter((i) => i.is_active).sort((a, b) => compareAddDocumentItems(profile, a, b));
}

/**
 * Add Document catalogue: ALL active master types, visa relevance sort-only, optional search filter.
 * Does NOT remove types already on the case checklist.
 */
export function filterDocumentTypesForAdd(
  items: MasterItem[],
  query: string,
  serviceCode?: string | null,
  templateName?: string | null,
): MasterItem[] {
  const profile = detectServiceDocumentProfile(serviceCode, templateName);
  const sorted = sortByRelevance(items, profile);
  return applySearchFilter(sorted, query, profile);
}

export function groupDocumentTypesByCategory(
  items: MasterItem[],
  profile: ServiceDocumentProfile,
): [DocumentCategory, MasterItem[]][] {
  const map = new Map<DocumentCategory, MasterItem[]>();
  for (const item of items) {
    const cat = resolveDocumentCategory(item);
    const list = map.get(cat) ?? [];
    list.push(item);
    map.set(cat, list);
  }
  return Array.from(map.entries()).sort(
    (a, b) => categoryRank(profile, a[0]) - categoryRank(profile, b[0]),
  );
}

export function countByCategory(items: MasterItem[]): Record<string, number> {
  const counts: Record<string, number> = {};
  for (const item of items) {
    const cat = resolveDocumentCategory(item);
    const label = DOCUMENT_CATEGORY_LABELS[cat];
    counts[label] = (counts[label] ?? 0) + 1;
  }
  return counts;
}

/** Inspect counts at each pipeline stage (1–5) for UAT. */
export function inspectDocumentTypeFilterPipeline(
  items: MasterItem[],
  query: string,
  onChecklistCodes: Set<string>,
  serviceCode?: string | null,
  templateName?: string | null,
): DocumentTypeFilterPipelineCounts {
  const profile = detectServiceDocumentProfile(serviceCode, templateName);
  const masterActiveTotal = items.filter((i) => i.is_active).length;
  const sorted = sortByRelevance(items, profile);
  const afterRelevance = sorted.length;
  const afterSearchList = applySearchFilter(sorted, query, profile);
  const afterSearch = afterSearchList.length;
  const grouped = groupDocumentTypesByCategory(afterSearchList, profile);
  const categoryCounts = countByCategory(afterSearchList);
  const hiddenBySearch =
    query.trim() === ""
      ? []
      : sorted
          .filter((item) => scoreDocumentTypeMatch(item, query, profile) === 0)
          .map((i) => i.code);

  return {
    masterActiveTotal,
    onChecklistCount: onChecklistCodes.size,
    afterRelevance,
    afterSearch,
    uiRendered: afterSearch,
    categoryCounts,
    renderedGroupCount: grouped.length,
    profile,
    hiddenBySearch,
    onChecklistCodes: Array.from(onChecklistCodes),
  };
}

export { applySearchFilter, sortByRelevance };
