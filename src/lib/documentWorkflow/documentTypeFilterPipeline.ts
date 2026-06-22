import type { MasterItem } from "@/lib/masters";
import { DOCUMENT_CATEGORY_LABELS, resolveDocumentCategory, type DocumentCategory } from "./documentCategories";
import {
  buildOccupiedDocumentFamilies,
  isDocumentFamilyOnChecklist,
  type ChecklistRequirementRef,
} from "./documentFamily";
import {
  detectServiceDocumentProfile,
  type ServiceDocumentProfile,
} from "./documentRelevance";
import { scoreDocumentTypeMatch } from "./searchDocumentTypes";

export type AddDocumentPickerItem = {
  item: MasterItem;
  /** Family already on checklist — show disabled, not selectable. */
  duplicateFamily: boolean;
};

/** Counts at each Add Document filter stage — for UAT / debugging. */
export interface DocumentTypeFilterPipelineCounts {
  /** 1. Active items from useMasterItems. */
  masterActiveTotal: number;
  /** 2. After excluding duplicate document families (selectable only). */
  afterExclusion: number;
  /** 3. After duplicate family filter (= afterExclusion for empty search). */
  afterDuplicateFiltering: number;
  /** 4. Rows actually rendered in dropdown. */
  uiRendered: number;
  /** Selectable rows in dropdown. */
  selectableRendered: number;
  /** Disabled duplicate-family rows shown. */
  disabledDuplicateRendered: number;
  occupiedFamilyCount: number;
  duplicateFamilyCodes: string[];
  profile: ServiceDocumentProfile;
  categoryCounts: Record<string, number>;
  renderedGroupCount: number;
  hiddenBySearch: string[];
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

function sortByCatalogue(items: MasterItem[]): MasterItem[] {
  return [...items]
    .filter((i) => i.is_active)
    .sort((a, b) => a.label.localeCompare(b.label, undefined, { sensitivity: "base" }));
}

/** Fixed category order for Add Document picker (no visa profile automation). */
const CATEGORY_DISPLAY_ORDER: DocumentCategory[] = [
  "identity",
  "relationship",
  "family",
  "financial",
  "employment",
  "academic",
  "travel",
  "police",
  "medical",
  "forms",
  "other",
];

function categoryDisplayRank(category: DocumentCategory): number {
  const idx = CATEGORY_DISPLAY_ORDER.indexOf(category);
  return idx >= 0 ? idx : CATEGORY_DISPLAY_ORDER.length;
}

function annotateDuplicates(
  items: MasterItem[],
  occupiedFamilies: Set<string>,
): AddDocumentPickerItem[] {
  return items.map((item) => ({
    item,
    duplicateFamily: isDocumentFamilyOnChecklist(item, occupiedFamilies),
  }));
}

/**
 * Build Add Document picker rows: full catalogue, relevance sort, family duplicate flags.
 * Default (empty search): hides duplicate families.
 * Search: shows duplicates disabled with label.
 */
export function buildAddDocumentPickerItems(
  items: MasterItem[],
  query: string,
  checklist: ChecklistRequirementRef[],
  serviceCode?: string | null,
  templateName?: string | null,
): AddDocumentPickerItem[] {
  const profile = detectServiceDocumentProfile(serviceCode, templateName);
  const occupiedFamilies = buildOccupiedDocumentFamilies(checklist);
  const sorted = sortByCatalogue(items);
  const searched = applySearchFilter(sorted, query, profile);
  const annotated = annotateDuplicates(searched, occupiedFamilies);
  const hasSearch = !!query.trim();

  if (hasSearch) return annotated;
  return annotated.filter((row) => !row.duplicateFamily);
}

/** @deprecated alias */
export function filterDocumentTypesForAdd(
  items: MasterItem[],
  query: string,
  _checklistOrService?: ChecklistRequirementRef[] | string | null,
  serviceCode?: string | null,
  templateName?: string | null,
): MasterItem[] {
  const checklist = Array.isArray(_checklistOrService) ? _checklistOrService : [];
  const svc = typeof _checklistOrService === "string" ? _checklistOrService : serviceCode;
  const tpl = typeof _checklistOrService === "string" ? serviceCode : templateName;
  return buildAddDocumentPickerItems(items, query, checklist, svc, tpl)
    .filter((r) => !r.duplicateFamily)
    .map((r) => r.item);
}

export function groupPickerItemsByCategory(
  rows: AddDocumentPickerItem[],
): [DocumentCategory, AddDocumentPickerItem[]][] {
  const map = new Map<DocumentCategory, AddDocumentPickerItem[]>();
  for (const row of rows) {
    const cat = resolveDocumentCategory(row.item);
    const list = map.get(cat) ?? [];
    list.push(row);
    map.set(cat, list);
  }
  return Array.from(map.entries()).sort(
    (a, b) => categoryDisplayRank(a[0]) - categoryDisplayRank(b[0]),
  );
}

/** @deprecated use groupPickerItemsByCategory */
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
    (a, b) => categoryDisplayRank(a[0]) - categoryDisplayRank(b[0]),
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

export function inspectDocumentTypeFilterPipeline(
  items: MasterItem[],
  query: string,
  checklist: ChecklistRequirementRef[],
  serviceCode?: string | null,
  templateName?: string | null,
): DocumentTypeFilterPipelineCounts {
  const profile = detectServiceDocumentProfile(serviceCode, templateName);
  const masterActiveTotal = items.filter((i) => i.is_active).length;
  const occupiedFamilies = buildOccupiedDocumentFamilies(checklist);
  const sorted = sortByCatalogue(items);
  const searched = applySearchFilter(sorted, query, profile);
  const allAnnotated = annotateDuplicates(searched, occupiedFamilies);
  const hasSearch = !!query.trim();
  const rendered = hasSearch ? allAnnotated : allAnnotated.filter((r) => !r.duplicateFamily);
  const selectable = rendered.filter((r) => !r.duplicateFamily);
  const disabledDupes = rendered.filter((r) => r.duplicateFamily);
  const afterExclusion = allAnnotated.filter((r) => !r.duplicateFamily).length;
  const grouped = groupPickerItemsByCategory(rendered);

  return {
    masterActiveTotal,
    afterExclusion,
    afterDuplicateFiltering: afterExclusion,
    uiRendered: rendered.length,
    selectableRendered: selectable.length,
    disabledDuplicateRendered: disabledDupes.length,
    occupiedFamilyCount: occupiedFamilies.size,
    duplicateFamilyCodes: allAnnotated.filter((r) => r.duplicateFamily).map((r) => r.item.code),
    profile,
    categoryCounts: countByCategory(rendered.map((r) => r.item)),
    renderedGroupCount: grouped.length,
    hiddenBySearch:
      query.trim() === ""
        ? []
        : sorted
            .filter((item) => scoreDocumentTypeMatch(item, query, profile) === 0)
            .map((i) => i.code),
  };
}

export { applySearchFilter, sortByCatalogue as sortByRelevance };
