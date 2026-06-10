import type { AcademyViewModel } from "./buildAcademyViewModel";

/** All tab ids used across visa + coaching profiles. */
export const ACADEMY_TAB_IDS = [
  "overview",
  "institution",
  "programs",
  "fees",
  "countryinsights",
  "practice",
  "eligibility",
  "acceptance",
  "testday",
  "checklist",
  "binder",
  "visaforms",
  "process",
  "dos",
  "redflags",
  "faqs",
  "compliance",
  "downloads",
  "sampledocs",
  "quiz",
  "notes",
  "changelog",
] as const;

export type AcademyTabId = (typeof ACADEMY_TAB_IDS)[number];

export type CoachingProfile = "test_reference" | "program";

const MBBS_TABS: AcademyTabId[] = [
  "overview",
  "institution",
  "programs",
  "fees",
  "countryinsights",
  "practice",
  "eligibility",
  "checklist",
  "binder",
  "visaforms",
  "process",
  "dos",
  "redflags",
  "faqs",
  "compliance",
  "downloads",
  "sampledocs",
  "quiz",
  "notes",
  "changelog",
];

const VISA_TABS: AcademyTabId[] = [
  "overview",
  "fees",
  "countryinsights",
  "eligibility",
  "checklist",
  "binder",
  "visaforms",
  "process",
  "dos",
  "redflags",
  "faqs",
  "compliance",
  "downloads",
  "sampledocs",
  "quiz",
  "notes",
  "changelog",
];

const COACHING_TEST_TABS: AcademyTabId[] = [
  "overview",
  "eligibility",
  "acceptance",
  "testday",
  "checklist",
  "binder",
  "process",
  "dos",
  "redflags",
  "faqs",
  "downloads",
  "sampledocs",
  "quiz",
  "notes",
  "changelog",
];

const COACHING_PROGRAM_TABS: AcademyTabId[] = [
  "overview",
  "eligibility",
  "checklist",
  "binder",
  "process",
  "dos",
  "redflags",
  "faqs",
  "downloads",
  "sampledocs",
  "quiz",
  "notes",
  "changelog",
];

export function coachingProfileFromSubService(subService: string): CoachingProfile {
  return /test reference/i.test(subService) ? "test_reference" : "program";
}

export function resolveAcademyTabs(
  view: Pick<
    AcademyViewModel,
    "isCoaching" | "isMbbs" | "coachingProfile" | "feeBreakdown" | "countryInsights" | "mbbsMeta"
  >,
): AcademyTabId[] {
  if (view.isMbbs) {
    let tabs = MBBS_TABS;
    const hasInsights = view.countryInsights != null;
    if (!hasInsights) tabs = tabs.filter((t) => t !== "countryinsights");
    if (!view.mbbsMeta?.practicePathways) tabs = tabs.filter((t) => t !== "practice");
    if (!view.mbbsMeta?.relatedPrograms?.length) tabs = tabs.filter((t) => t !== "programs");
    return tabs;
  }
  if (!view.isCoaching) {
    const hasFees = view.feeBreakdown?.govt || view.feeBreakdown?.consultancy;
    const hasInsights = view.countryInsights != null;
    let tabs = VISA_TABS;
    if (!hasFees) tabs = tabs.filter((t) => t !== "fees");
    if (!hasInsights) tabs = tabs.filter((t) => t !== "countryinsights");
    return tabs;
  }
  return view.coachingProfile === "test_reference" ? COACHING_TEST_TABS : COACHING_PROGRAM_TABS;
}

export function tabLabel(
  id: AcademyTabId,
  view: Pick<AcademyViewModel, "isCoaching" | "isMbbs" | "coachingProfile">,
): string {
  if (view.isMbbs) {
    switch (id) {
      case "institution":
        return "Institution";
      case "programs":
        return "Programs";
      case "practice":
        return "Practice pathways";
      case "countryinsights":
        return "Country & costs";
      case "fees":
        return "Fees";
      case "checklist":
        return "Checklist";
      case "binder":
        return "Document binder";
      case "visaforms":
        return "Application forms";
      case "process":
        return "Process";
      case "eligibility":
        return "Eligibility";
      case "dos":
        return "Do's & don'ts";
      case "redflags":
        return "Red flags";
      case "downloads":
        return "Resources";
      case "sampledocs":
        return "Sample docs";
      case "changelog":
        return "Change log";
      default:
        return id.charAt(0).toUpperCase() + id.slice(1);
    }
  }
  if (view.isCoaching) {
    switch (id) {
      case "eligibility":
        return view.coachingProfile === "test_reference" ? "Exam requirements" : "Enrollment criteria";
      case "acceptance":
        return "Acceptance matrix";
      case "testday":
        return "Test day guide";
      case "checklist":
        return "Checklists";
      case "binder":
        return "Document binder";
      case "downloads":
        return "Resources";
      case "sampledocs":
        return "Sample practice";
      case "process":
        return view.coachingProfile === "program" ? "Delivery process" : "Process";
      default:
        break;
    }
  }

  switch (id) {
    case "fees":
      return "Fees";
    case "countryinsights":
      return "Country & costs";
    case "eligibility":
      return "Eligibility Assessment";
    case "binder":
      return "Document binder";
    case "dos":
      return "Do's & don'ts";
    case "redflags":
      return "Red flags";
    case "visaforms":
      return "Visa forms";
    case "sampledocs":
      return "Sample docs";
    case "changelog":
      return "Change log";
    default:
      return id.charAt(0).toUpperCase() + id.slice(1);
  }
}

export function defaultAcademyTab(
  view: Pick<AcademyViewModel, "isCoaching" | "isMbbs">,
): AcademyTabId {
  if (view.isMbbs) return "overview";
  return view.isCoaching ? "overview" : "redflags";
}
