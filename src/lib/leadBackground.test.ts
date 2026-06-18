import { describe, expect, it } from "vitest";
import {
  educationEntryHasData,
  formatEducationEntrySummary,
  hasBackgroundData,
  leadToBackgroundState,
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
    expect(summary).toBe("Scheduled · CELPIP 7");
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
});
