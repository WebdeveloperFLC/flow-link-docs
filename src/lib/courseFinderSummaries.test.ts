import { describe, expect, it } from "vitest";
import {
  admissionSummary,
  aiSummaryFromCourse,
  formatDurationMonths,
  intakeSummary,
  tuitionSummary,
  visaTrendLabel,
} from "./courseFinderSummaries";

const base = {
  name: "MBA",
  study_level: "postgraduate",
  field_of_study: "Business",
  duration_months: 24,
  tuition_fee: 25000,
  currency: "CAD",
  intake_months: ["Sep"],
  intake_year: 2026,
  ielts_overall: 6.5,
  pte_score: null,
  toefl_score: null,
  gpa_min: 3.0,
  pgwp_eligible: true,
  coop_available: false,
  internship_included: false,
  scholarship_available: true,
  scholarship_info: null,
  description: "A".repeat(300),
  career_outcomes: null,
  pr_visa_notes: null,
  apply_url: "https://example.edu/apply",
  employability_score: null,
  visa_success_indicator: "high",
};

describe("courseFinderSummaries", () => {
  it("formats duration in years when divisible by 12", () => {
    expect(formatDurationMonths(24)).toBe("2 years");
    expect(formatDurationMonths(18)).toBe("18 months");
  });

  it("builds tuition and admission summaries", () => {
    expect(tuitionSummary(base)).toBe("CAD 25,000");
    expect(admissionSummary(base)).toContain("IELTS 6.5");
    expect(admissionSummary(base)).toContain("GPA 3");
  });

  it("builds intake summary with year", () => {
    expect(intakeSummary(base)).toBe("Sep (2026)");
  });

  it("truncates AI summary", () => {
    const s = aiSummaryFromCourse(base);
    expect(s).toBeTruthy();
    expect(s!.length).toBeLessThanOrEqual(220);
  });

  it("maps visa trend label", () => {
    expect(visaTrendLabel(base)).toBe("High visa success trend");
  });
});
