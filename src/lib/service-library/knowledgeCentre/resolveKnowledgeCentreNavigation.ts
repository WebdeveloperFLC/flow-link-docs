import type { AcademyViewModel } from "../buildAcademyViewModel";
import type { AcademyTabId } from "../academyTabs";
import type { KnowledgeCentreMetadata, KnowledgeCentreSectionId } from "./types";

function hasArrayContent(value: unknown): boolean {
  return Array.isArray(value) && value.length > 0;
}

function hasText(value: unknown): boolean {
  return typeof value === "string" && value.trim().length > 0;
}

function hasDocumentStructure(meta: KnowledgeCentreMetadata): boolean {
  const sections = meta.document_structure?.sections;
  return Array.isArray(sections) && sections.some((s) => s.is_active !== false);
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
  >,
): boolean {
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
        !!meta.fullCostBreakdown
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
      return (view.checklist?.total ?? 0) > 0 || (view.checklist?.submission?.length ?? 0) > 0;
    case "binder":
      return hasDocumentStructure(meta);
    case "visaforms":
      return (view.visaForms?.length ?? 0) > 0;
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
      return hasArrayContent(meta.resources) || hasArrayContent(view.resources) || hasArrayContent(view.downloads);
    case "sampledocs":
      return hasArrayContent(meta.sampleDocs) || hasArrayContent(view.sampleDocs);
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

/**
 * Ordered tab ids from navigation.sections, filtered to sections with content.
 * Returns null when navigation is absent (caller should use legacy tab logic).
 */
export function resolveKnowledgeCentreNavigation(
  meta: KnowledgeCentreMetadata,
  view: Parameters<typeof sectionHasContent>[2],
): AcademyTabId[] | null {
  const sections = meta.navigation?.sections;
  if (!sections?.length) return null;

  const ordered = [...sections]
    .map((s, index) => ({
      id: s.id,
      label: s.label,
      sortOrder: s.sortOrder ?? (index + 1) * 10,
    }))
    .sort((a, b) => a.sortOrder - b.sortOrder);

  return ordered
    .filter((s) => sectionHasContent(s.id, meta, view))
    .map((s) => s.id);
}

export function resolveKnowledgeCentreNavItems(
  meta: KnowledgeCentreMetadata,
  view: Parameters<typeof sectionHasContent>[2],
): ResolvedKnowledgeCentreNavItem[] | null {
  const sections = meta.navigation?.sections;
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
