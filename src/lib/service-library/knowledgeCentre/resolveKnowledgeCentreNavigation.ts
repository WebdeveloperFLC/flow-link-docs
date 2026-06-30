import type { AcademyViewModel } from "../buildAcademyViewModel";
import type { AcademyTabId } from "../academyTabs";
import { isFlcKnowledgeGuide, type FlcKnowledgeGuide } from "../knowledgeGuide/types";
import { ZIP_NAV_KEY_TO_TAB } from "./types";
import type { KnowledgeCentreMetadata, KnowledgeCentreSectionId } from "./types";

function hasArrayContent(value: unknown): boolean {
  return Array.isArray(value) && value.length > 0;
}

function hasText(value: unknown): boolean {
  return typeof value === "string" && value.trim().length > 0;
}

function zipGuideFromMeta(meta: KnowledgeCentreMetadata): FlcKnowledgeGuide | null {
  if (isFlcKnowledgeGuide(meta)) return meta;
  return null;
}

function hasDocumentStructure(meta: KnowledgeCentreMetadata): boolean {
  const sections = meta.document_structure?.sections;
  return Array.isArray(sections) && sections.some((s) => s.is_active !== false);
}

function hasZipBinder(guide: FlcKnowledgeGuide): boolean {
  return (guide.documentBinder?.categories?.length ?? 0) > 0;
}

function hasZipChecklist(guide: FlcKnowledgeGuide): boolean {
  return (guide.checklistItems?.items?.length ?? 0) > 0;
}

function hasZipVisaForms(guide: FlcKnowledgeGuide): boolean {
  return (guide.visaForms?.forms?.length ?? 0) > 0;
}

function hasZipDownloads(guide: FlcKnowledgeGuide): boolean {
  return (guide.downloads?.templates?.length ?? 0) > 0 || (guide.sources?.length ?? 0) > 0;
}

function hasZipSampleDocs(guide: FlcKnowledgeGuide): boolean {
  const sd = guide.sampleDocs;
  if (!sd) return false;
  if (Array.isArray(sd)) return sd.length > 0;
  return (sd.items?.length ?? 0) > 0;
}

/** Whether a tab should render — no placeholder tabs when content is absent. */
export function sectionHasContent(
  sectionId: KnowledgeCentreSectionId,
  meta: KnowledgeCentreMetadata,
  view: Pick<
    AcademyViewModel,
    | "feeBreakdown"
    | "countryInsights"
    | "checklist"
    | "process"
    | "visaForms"
    | "downloads"
    | "sampleDocs"
    | "quiz"
    | "internalNotes"
    | "changelog"
    | "faqs"
    | "compliance"
    | "redFlags"
    | "redFlagsBanner"
    | "dosDonts"
    | "resources"
    | "about"
    | "eligibility"
    | "isMbbs"
    | "mbbsMeta"
    | "guideSources"
    | "downloadTemplates"
    | "checklistGuide"
    | "documentBinder"
  >,
): boolean {
  const zip = zipGuideFromMeta(meta);

  switch (sectionId) {
    case "overview":
      return (
        hasText(meta.displayName) ||
        hasText(meta.shortDescription) ||
        hasArrayContent(meta.about) ||
        hasArrayContent(meta.kpis) ||
        hasArrayContent(meta.tags) ||
        hasArrayContent(view.about)
      );
    case "institution":
      return view.isMbbs && !!view.mbbsMeta?.institutionName;
    case "programs":
      return view.isMbbs && hasArrayContent(view.mbbsMeta?.relatedPrograms);
    case "fees":
      return (
        !!view.feeBreakdown?.govt ||
        !!view.feeBreakdown?.consultancy ||
        !!meta.feeBreakdown ||
        !!meta.consultancyBreakdown ||
        !!meta.fullCostBreakdown ||
        !!view.fullCostBreakdown
      );
    case "countryinsights":
      return view.countryInsights != null || !!meta.workingRights || !!meta.fullCostBreakdown;
    case "practice":
      return view.isMbbs && !!view.mbbsMeta?.practicePathways;
    case "eligibility":
      return hasArrayContent(meta.eligibility) || hasArrayContent(view.eligibility);
    case "acceptance":
      return !!meta.compare?.rows?.length;
    case "testday":
      return (
        hasArrayContent(meta.testDayGuide?.checklist) ||
        hasArrayContent(meta.testDayGuide?.dos) ||
        hasArrayContent(meta.testDayGuide?.donts)
      );
    case "checklist":
      return (
        (view.checklist?.total ?? 0) > 0 ||
        (view.checklist?.submission?.length ?? 0) > 0 ||
        (view.checklistGuide?.items?.length ?? 0) > 0 ||
        (zip ? hasZipChecklist(zip) : false)
      );
    case "binder":
      return hasDocumentStructure(meta) || (view.documentBinder?.categories?.length ?? 0) > 0 || (zip ? hasZipBinder(zip) : false);
    case "visaforms":
      return (view.visaForms?.length ?? 0) > 0 || (zip ? hasZipVisaForms(zip) : false);
    case "process":
      return (view.process?.length ?? 0) > 0 || hasArrayContent(meta.timeline);
    case "dos":
      return (
        hasArrayContent(meta.donts?.dos) ||
        hasArrayContent(meta.donts?.donts) ||
        hasArrayContent(meta.donts?.mistakes) ||
        hasArrayContent(meta.proTips) ||
        hasArrayContent(meta.postApproval) ||
        hasArrayContent(view.dosDonts?.dos) ||
        hasArrayContent(view.dosDonts?.donts) ||
        hasArrayContent(view.dosDonts?.mistakes)
      );
    case "redflags":
      return (
        hasArrayContent(meta.redFlags) ||
        hasArrayContent(view.redFlags) ||
        hasText(meta.redFlagsBanner) ||
        hasText(view.redFlagsBanner)
      );
    case "faqs":
      return hasArrayContent(meta.faqs) || hasArrayContent(view.faqs);
    case "compliance":
      return hasArrayContent(meta.compliance) || hasArrayContent(view.compliance);
    case "downloads":
      return (
        hasArrayContent(meta.resources) ||
        hasArrayContent(view.resources) ||
        hasArrayContent(view.downloads) ||
        (view.downloadTemplates?.length ?? 0) > 0 ||
        (view.guideSources?.length ?? 0) > 0 ||
        (zip ? hasZipDownloads(zip) : false)
      );
    case "sampledocs":
      return hasArrayContent(meta.sampleDocs) || hasArrayContent(view.sampleDocs) || (zip ? hasZipSampleDocs(zip) : false);
    case "documentstructure":
      return hasDocumentStructure(meta);
    case "quiz":
      return hasArrayContent(meta.quiz) || hasArrayContent(view.quiz);
    case "notes":
      return hasArrayContent(meta.staffNotes) || hasArrayContent(view.internalNotes);
    case "changelog":
      return hasArrayContent(meta.changelog) || hasArrayContent(view.changelog);
    default:
      return false;
  }
}

export type ResolvedKnowledgeCentreNavItem = {
  id: AcademyTabId;
  label?: string;
  sortOrder: number;
};

function resolveZipNavigation(
  guide: FlcKnowledgeGuide,
  meta: KnowledgeCentreMetadata,
  view: Parameters<typeof sectionHasContent>[2],
): ResolvedKnowledgeCentreNavItem[] {
  return guide.navigation
    .filter((entry) => entry.applicable !== false)
    .map((entry, index) => {
      const tabId = ZIP_NAV_KEY_TO_TAB[entry.key];
      return {
        tabId,
        label: entry.label,
        sortOrder: (index + 1) * 10,
        entry,
      };
    })
    .filter((row): row is typeof row & { tabId: AcademyTabId } => row.tabId != null)
    .filter((row) => sectionHasContent(row.tabId, meta, view))
    .map((row) => ({
      id: row.tabId,
      label: row.label,
      sortOrder: row.sortOrder,
    }));
}

function resolveLegacyNavigation(
  meta: KnowledgeCentreMetadata,
  view: Parameters<typeof sectionHasContent>[2],
): ResolvedKnowledgeCentreNavItem[] | null {
  const sections = meta.navigation && !Array.isArray(meta.navigation) ? meta.navigation.sections : undefined;
  if (!sections?.length) return null;

  return [...sections]
    .map((s, index) => ({
      id: s.id,
      label: s.label,
      sortOrder: s.sortOrder ?? (index + 1) * 10,
    }))
    .sort((a, b) => a.sortOrder - b.sortOrder)
    .filter((s) => sectionHasContent(s.id, meta, view));
}

/**
 * Ordered tab ids from navigation, filtered to sections with content.
 * Returns null when navigation is absent (caller should use legacy tab logic).
 */
export function resolveKnowledgeCentreNavigation(
  meta: KnowledgeCentreMetadata,
  view: Parameters<typeof sectionHasContent>[2],
): AcademyTabId[] | null {
  const zip = zipGuideFromMeta(meta);
  if (zip) {
    const items = resolveZipNavigation(zip, meta, view);
    return items.length ? items.map((i) => i.id) : null;
  }

  const legacy = resolveLegacyNavigation(meta, view);
  return legacy?.length ? legacy.map((i) => i.id) : null;
}

export function resolveKnowledgeCentreNavItems(
  meta: KnowledgeCentreMetadata,
  view: Parameters<typeof sectionHasContent>[2],
): ResolvedKnowledgeCentreNavItem[] | null {
  const zip = zipGuideFromMeta(meta);
  if (zip) {
    const items = resolveZipNavigation(zip, meta, view);
    return items.length ? items : null;
  }

  return resolveLegacyNavigation(meta, view);
}

export function resolveKnowledgeCentreTabLabel(
  tabId: AcademyTabId,
  meta: KnowledgeCentreMetadata | null | undefined,
  fallback: string,
): string {
  if (!meta) return fallback;

  const zip = zipGuideFromMeta(meta);
  if (zip) {
    for (const entry of zip.navigation) {
      const mapped = ZIP_NAV_KEY_TO_TAB[entry.key];
      if (mapped === tabId && entry.label?.trim()) return entry.label.trim();
    }
  }

  const sections = meta.navigation && !Array.isArray(meta.navigation) ? meta.navigation.sections : undefined;
  const match = sections?.find((s) => s.id === tabId);
  if (match?.label?.trim()) return match.label.trim();

  return fallback;
}
