import { describe, expect, it } from "vitest";
import { buildAcademyViewModel } from "@/lib/service-library/buildAcademyViewModel";
import type { Master } from "@/lib/serviceLibrary";

function coachingMaster(overrides?: Partial<Master>): Master {
  return {
    id: "test-id",
    service_category: "coaching_services",
    service: "German B1 Speaking",
    sub_service: "European Languages",
    quick_guide_what_to_do: null,
    quick_guide_common_mistakes: null,
    quick_guide_escalation_rules: null,
    quick_guide_important_reminders: null,
    checklist_text: null,
    cost_summary_html: null,
    internal_sop_html: null,
    process_flow: null,
    display_order: 1,
    is_active: true,
    ...overrides,
  };
}

describe("buildAcademyViewModel coaching titles", () => {
  it("does not prefix coaching title with a legacy country mapping", () => {
    const view = buildAcademyViewModel({
      master: coachingMaster(),
      country: null,
      countries: ["Australia"],
      feeItems: [],
      submissionItems: [],
      checklistFiles: [],
      sopTasks: [],
      submissionCompletedIds: new Set(),
    });

    expect(view.country).toBeNull();
    expect(view.title).toBe("German B1 Speaking");
    expect(view.breadcrumbTitle).toBe("German Language");
    expect(view.title).not.toContain("Australia");
  });

  it("uses academy displayName when present", () => {
    const view = buildAcademyViewModel({
      master: coachingMaster({
        service: "Duolingo English Test",
        sub_service: "English Proficiency",
        academy_metadata: {
          displayName: "Duolingo English Test",
          shortDescription: "Online proctored test prep",
          navBucket: "coaching",
        },
      }),
      country: null,
      countries: ["Australia"],
      feeItems: [],
      submissionItems: [],
      checklistFiles: [],
      sopTasks: [],
      submissionCompletedIds: new Set(),
    });

    expect(view.title).toBe("Duolingo English Test");
    expect(view.breadcrumbTitle).toBe("Duolingo English Test"); // family key
  });
});
