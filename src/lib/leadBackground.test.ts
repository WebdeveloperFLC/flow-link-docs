import { describe, expect, it } from "vitest";
import {
  buildBackgroundDetailSections,
  educationEntryHasData,
  formatEducationEntrySummary,
  hasBackgroundData,
  leadToBackgroundState,
  listEnglishTestDetails,
  summarizeEducation,
  summarizeEnglishTests,
  summarizeExperience,
} from "@/lib/leadBackground";

describe("leadBackground summaries", () => {
  it("shows scheduled English test with score in summary", () => {
    const summary = summarizeEnglishTests({
      english_test_status: "scheduled",
      english_test: "CELPIP",
      english_overall: "7",
    } as never);
    expect(summary).toContain("CELPIP");
    expect(summary).toContain("Scheduled");
    expect(summary).toContain("Overall 7");
  });

  it("counts education with location-only entries", () => {
    const bg = {
      education_history: [{ city: "Mumbai", country: "India", state_province: "Maharashtra" }],
    };
    expect(educationEntryHasData(bg.education_history[0]!)).toBe(true);
    expect(summarizeEducation(bg as never)).toContain("Mumbai");
  });

  it("hydrates english scores from __by_test__ cache when loading lead", () => {
    const state = leadToBackgroundState({
      english_test: "IELTS",
      english_test_status: "taken",
      english_sections: {
        __by_test__: {
          IELTS: {
            overall: "7",
            test_date: "2026-06-17",
            sections: { listening: "7", reading: "7" },
          },
        },
      },
    } as never);
    expect(state.english_overall).toBe("7");
    expect(state.english_test_date).toBe("2026-06-17");
    expect(summarizeEnglishTests(state)).toContain("IELTS");
    expect(summarizeEnglishTests(state)).toContain("Overall 7");
  });

  it("merges last_education into empty education history", () => {
    const state = leadToBackgroundState({
      last_education: "graduate",
      education_history: [],
    } as never);
    expect(state.education_history[0]?.level).toBe("graduate");
    expect(hasBackgroundData(state)).toBe(true);
  });

  it("formats education entry with institution and location", () => {
    const text = formatEducationEntrySummary({
      level: "graduate",
      institution: "Delhi University",
      city: "Delhi",
      country: "India",
    });
    expect(text).toContain("Delhi University");
    expect(text).toContain("Delhi");
  });

  it("lists every English test from __by_test__ with sectional scores", () => {
    const bg = leadToBackgroundState({
      english_test: "CELPIP",
      english_test_status: "scheduled",
      english_overall: "54",
      english_sections: {
        listening: "55",
        reading: "66",
        writing: "44",
        speaking: "55",
        __by_test__: {
          IELTS: {
            overall: "7",
            test_date: "2026-06-17",
            test_expiry: "2027-06-18",
            sections: { listening: "7", reading: "8", writing: "4", speaking: "6" },
          },
          CELPIP: {
            overall: "54",
            sections: { listening: "55", reading: "66", writing: "44", speaking: "55" },
          },
        },
      },
    } as never);

    const lines = listEnglishTestDetails(bg);
    expect(lines).toHaveLength(2);
    expect(lines[0]).toContain("IELTS");
    expect(lines[0]).toContain("Overall 7");
    expect(lines[0]).toContain("L 7");
    expect(lines[1]).toContain("CELPIP");
    expect(lines[1]).toContain("Overall 54");
    expect(lines[1]).toContain("Scheduled");

    const summary = summarizeEnglishTests(bg);
    expect(summary).toContain("IELTS");
    expect(summary).toContain("CELPIP");
  });

  it("includes academic tests with sectional scores in detail sections", () => {
    const bg = leadToBackgroundState({
      other_tests: [
        {
          type: "GMAT",
          score: "44",
          sections: { verbal: "55", quant: "66", ir: "33", awa: "44" },
        },
      ],
    } as never);

    const sections = buildBackgroundDetailSections(bg);
    expect(sections.academic).toHaveLength(1);
    expect(sections.academic[0]).toContain("GMAT");
    expect(sections.academic[0]).toContain("Verbal 55");
    expect(sections.academic[0]).toContain("Quant 66");
    expect(hasBackgroundData(bg)).toBe(true);
  });
});
