import { describe, expect, it } from "vitest";
import fs from "node:fs";
import path from "node:path";
import { buildAcademyViewModel } from "@/lib/service-library/buildAcademyViewModel";
import { resolveAcademyTabs } from "@/lib/service-library/academyTabs";
import { isFlcKnowledgeGuide } from "@/lib/service-library/knowledgeGuide/types";
import type { Master, Override } from "@/lib/serviceLibrary";

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

const canadaFixturePath = path.resolve(
  process.cwd(),
  "content/service-library/canada-student-visa.json",
);

function visaMaster(academy_metadata: unknown): Master & { academy_metadata?: unknown } {
  return {
    id: "c35e6051-f40f-47bf-9cac-0a386c47a336",
    service_category: "visa_immigration",
    service: "Student Visa",
    sub_service: "Outside Canada",
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
    academy_metadata,
  };
}

describe("buildAcademyViewModel ZIP guide reader", () => {
  it("reads ZIP navigation despite legacy country override patch", () => {
    const zip = JSON.parse(fs.readFileSync(canadaFixturePath, "utf8"));
    const view = buildAcademyViewModel({
      master: visaMaster(zip),
      override: {
        id: "ov-1",
        library_id: "c35e6051-f40f-47bf-9cac-0a386c47a336",
        country: "Canada",
        academy_metadata: {
          displayName: "Legacy Canada override",
          navigation: { sections: [{ id: "overview", sortOrder: 10 }] },
        },
      } as Override,
      country: "Canada",
      countries: ["Canada"],
      feeItems: [],
      submissionItems: [],
      checklistFiles: [],
      sopTasks: [],
      submissionCompletedIds: new Set(),
    });

    expect(isFlcKnowledgeGuide(view.knowledgeCentreMeta)).toBe(true);
    expect(view.title).toBe(zip.displayName);
    const tabs = resolveAcademyTabs(view);
    expect(tabs.length).toBeGreaterThan(4);
    expect(tabs).not.toEqual(["overview"]);
  });
});
