import { describe, expect, it } from "vitest";
import {
  buildAvailabilityFromOfferings,
  buildProgramSummaryFromOfferings,
} from "./programSummary";
import type { UpiCourseStaging } from "../types/upi";

function row(partial: Partial<UpiCourseStaging> & { id: string }): UpiCourseStaging {
  return {
    course_title: "Computer Science",
    institution_id: "inst-1",
    review_status: "pending_review",
    dedup_hash: "hash-1",
    program_level_id: "lvl-1",
    duration_value: 2,
    duration_unit: "years",
    intake_months: ["Sep", "Jan"],
    tuition_fee: 18000,
    currency: "CAD",
    ielts_overall: 6.5,
    is_pgwp_eligible: true,
    is_coop: false,
    metadata: { study_area: "IT" },
    ...partial,
  } as UpiCourseStaging;
}

describe("buildProgramSummaryFromOfferings", () => {
  it("builds summary from grouped offerings without duplicating campuses", () => {
    const rows = [
      row({ id: "a", campus_name: "Toronto" }),
      row({ id: "b", campus_name: "Scarborough", tuition_fee: 19000 }),
    ];
    const summary = buildProgramSummaryFromOfferings(
      rows,
      { key: "hash-1", title: "Computer Science", offeringCount: 2, levelLabel: "Diploma" },
      () => "Diploma",
    );
    expect(summary?.programName).toBe("Computer Science");
    expect(summary?.qualification).toBe("Diploma");
    expect(summary?.studyArea).toBe("IT");
    expect(summary?.pgwp).toBe(true);
    expect(summary?.offeringCount).toBe(2);
    expect(summary?.tuitionSummary).toContain("18000");
  });
});

describe("buildAvailabilityFromOfferings", () => {
  it("lists per-offering campus and intake differences", () => {
    const availability = buildAvailabilityFromOfferings([
      row({ id: "a", campus_name: "Toronto", intake_months: ["Sep"] }),
      row({ id: "b", campus_name: "Scarborough", intake_months: ["Jan"] }),
    ]);
    expect(availability).toHaveLength(2);
    expect(availability[0].campuses).toContain("Toronto");
    expect(availability[1].intakes).toContain("Jan");
  });
});
