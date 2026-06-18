import { describe, expect, it } from "vitest";
import {
  buildBackgroundDetailSections,
  buildBackgroundDetailView,
  educationEntryHasData,
  formatEducationEntrySummary,
  hasBackgroundData,
  leadToBackgroundState,
  listEnglishTestDetails,
  summarizeEducation,
  summarizeEnglishTests,
  summarizeExperience,
  yearOfPassingForDb,
} from "@/lib/leadBackground";

describe("leadBackground summaries", () => {
  it("shows compact English test summary", () => {
    const summary = summarizeEnglishTests({
      english_test_status: "scheduled",
      english_test: "CELPIP",
      english_overall: "7",
    } as never);
    expect(summary).toBe("CELPIP 7");
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
    expect(summarizeEnglishTests(state)).toBe("IELTS 7");
  });

  it("merges last_education into empty education history", () => {
    const state = leadToBackgroundState({
      last_education: "graduate",
      education_history: [],
    } as never);
    expect(state.education_history[0]?.level).toBe("graduate");
    expect(hasBackgroundData(state)).toBe(true);
  });

  it("hydrates education from client scalars when JSON history is empty", () => {
    const state = leadToBackgroundState({
      last_education: "graduate",
      institution_name: "Delhi University",
      year_of_passing: "2024-06-30",
      percentage_cgpa: "72",
      education_history: [],
    } as never);
    expect(state.education_history[0]?.institution).toBe("Delhi University");
    expect(state.education_history[0]?.year).toBe("2024");
    expect(hasBackgroundData(state)).toBe(true);
  });

  it("formats education entry with institution and location", () => {
    const text = formatEducationEntrySummary({
      level: "graduate",
      institution: "Delhi University",
      city: "Delhi",
      state_province: "Delhi",
      country: "India",
      year: "2024",
      percentage_cgpa: "65",
    });
    expect(text).toContain("Delhi University");
    expect(text).toContain("Delhi, Delhi, India");
    expect(text).toContain("Passed 2024");
    expect(text).toContain("65%");
  });

  it("lists every English test from __by_test__ with sectional scores", () => {
    const bg = leadToBackgroundState({
      english_test: "CELPIP",
      english_test_status: "taken",
      english_overall: "54",
      english_sections: {
        listening: "55",
        reading: "66",
        writing: "44",
        speaking: "55",
        __by_test__: {
          IELTS: {
            status: "scheduled",
            overall: "7",
            test_date: "2026-06-17",
            test_expiry: "2027-06-18",
            sections: { listening: "7", reading: "8", writing: "4", speaking: "6" },
          },
          CELPIP: {
            status: "taken",
            overall: "54",
            sections: { listening: "55", reading: "66", writing: "44", speaking: "55" },
          },
        },
      },
    } as never);

    const lines = listEnglishTestDetails(bg);
    expect(lines).toHaveLength(2);
    expect(lines[0]).toContain("IELTS");
    expect(lines[0]).toContain("Scheduled");
    expect(lines[1]).toContain("CELPIP");
    expect(lines[1]).toContain("Taken");
    expect(lines[1]).not.toContain("Scheduled");

    const summary = summarizeEnglishTests(bg);
    expect(summary).toBe("IELTS 7, CELPIP 54");
  });

  it("ignores empty English test cache entries from tab switching", () => {
    const view = buildBackgroundDetailView({
      english_test: "IELTS",
      english_overall: "7",
      english_sections: {
        __by_test__: {
          IELTS: { overall: "7", sections: { listening: "7" } },
          PTE: {},
          TOEFL: { sections: {} },
          Duolingo: { overall: "" },
        },
      },
    } as never);
    expect(view.english).toHaveLength(1);
    expect(view.english[0]?.test).toBe("IELTS");
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

describe("yearOfPassingForDb", () => {
  it("converts year string to mid-year date for clients column", () => {
    expect(yearOfPassingForDb("2024")).toBe("2024-06-30");
    expect(yearOfPassingForDb("2024-06-30")).toBe("2024-06-30");
    expect(yearOfPassingForDb("")).toBeNull();
  });
});
