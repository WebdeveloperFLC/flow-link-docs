import type { MasterItem } from "@/lib/masters";
import { DOCUMENT_CATEGORY_LABELS, resolveDocumentCategory } from "./documentCategories";
import {
  compareAddDocumentItems,
  detectServiceDocumentProfile,
  type ServiceDocumentProfile,
} from "./documentRelevance";
import { scoreDocumentTypeMatch } from "./searchDocumentTypes";

/** Counts at each Add Document filter stage — for UAT / debugging. */
export interface DocumentTypeFilterPipelineCounts {
  /** A. Active items in master_items (same set useMasterItems returns). */
  masterActiveTotal: number;
  /** B. After is_active + excludedMasterCodes (already on checklist). */
  afterExcluded: number;
  /** C. After relevance layer — sort-only; must equal afterExcluded. */
  afterRelevance: number;
  /** D. After search text filter (empty query = same as afterRelevance). */
  afterSearch: number;
  /** E. Shown in UI (afterRelevance/search; no per-category slice). */
  uiVisible: number;
  profile: ServiceDocumentProfile;
  hiddenByExcluded: string[];
  hiddenBySearch: string[];
}

function applyExcluded(items: MasterItem[], excluded: Set<string>): MasterItem[] {
  return items.filter((item) => item.is_active && !excluded.has(item.code));
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
  return [...items].sort((a, b) => compareAddDocumentItems(profile, a, b));
}

/**
 * Full Add Document pipeline: load all active → drop checklist duplicates → sort by visa relevance → search filter.
 * Relevance never removes items.
 */
export function filterDocumentTypesForAdd(
  items: MasterItem[],
  query: string,
  excludedCodes: Set<string>,
  serviceCode?: string | null,
  templateName?: string | null,
): MasterItem[] {
  const profile = detectServiceDocumentProfile(serviceCode, templateName);
  const eligible = applyExcluded(items, excludedCodes);
  const sorted = sortByRelevance(eligible, profile);
  return applySearchFilter(sorted, query, profile);
}

/** Inspect counts at each pipeline stage (A–E). */
export function inspectDocumentTypeFilterPipeline(
  items: MasterItem[],
  query: string,
  excludedCodes: Set<string>,
  serviceCode?: string | null,
  templateName?: string | null,
): DocumentTypeFilterPipelineCounts {
  const profile = detectServiceDocumentProfile(serviceCode, templateName);
  const masterActiveTotal = items.filter((i) => i.is_active).length;
  const eligible = applyExcluded(items, excludedCodes);
  const afterExcluded = eligible.length;
  const sorted = sortByRelevance(eligible, profile);
  const afterRelevance = sorted.length;
  const afterSearchList = applySearchFilter(sorted, query, profile);
  const afterSearch = afterSearchList.length;
  const hiddenByExcluded = items
    .filter((i) => i.is_active && excludedCodes.has(i.code))
    .map((i) => i.code);
  const hiddenBySearch =
    query.trim() === ""
      ? []
      : sorted
          .filter((item) => scoreDocumentTypeMatch(item, query, profile) === 0)
          .map((i) => i.code);

  return {
    masterActiveTotal,
    afterExcluded,
    afterRelevance,
    afterSearch,
    uiVisible: afterSearch,
    profile,
    hiddenByExcluded,
    hiddenBySearch,
  };
}

export { applyExcluded, applySearchFilter, sortByRelevance };
