import type { AcademyViewModel } from "./buildAcademyViewModel";

/** All tab ids used across visa + coaching profiles. */
export const ACADEMY_TAB_IDS = [
  "overview",
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

const VISA_TABS: AcademyTabId[] = [
  "overview",
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

export function resolveAcademyTabs(view: Pick<AcademyViewModel, "isCoaching" | "coachingProfile">): AcademyTabId[] {
  if (!view.isCoaching) return VISA_TABS;
  return view.coachingProfile === "test_reference" ? COACHING_TEST_TABS : COACHING_PROGRAM_TABS;
}

export function tabLabel(
  id: AcademyTabId,
  view: Pick<AcademyViewModel, "isCoaching" | "coachingProfile">,
): string {
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

export function defaultAcademyTab(view: Pick<AcademyViewModel, "isCoaching">): AcademyTabId {
  return view.isCoaching ? "overview" : "redflags";
}
