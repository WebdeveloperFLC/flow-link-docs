import { describe, expect, it } from "vitest";
import {
  buildEnglishScorePatch,
  buildEnglishTestSwitchPatch,
  ENGLISH_SCORES_BY_TEST_KEY,
  parseScoresByTest,
} from "@/lib/englishTestScores";

describe("englishTestScores", () => {
  it("switching IELTS → CELPIP clears displayed scores but keeps IELTS in cache", () => {
    const ieltsState = {
      english_test: "IELTS",
      english_overall: "7",
      english_test_date: "2026-06-17",
      english_test_expiry: "2027-06-18",
      english_sections: {
        listening: "7",
        reading: "7",
        writing: "7",
        speaking: "7",
      },
    };

    const switched = buildEnglishTestSwitchPatch(ieltsState, "CELPIP");

    expect(switched.english_test).toBe("CELPIP");
    expect(switched.english_overall).toBeNull();
    expect(switched.english_test_date).toBeNull();
    expect(switched.english_test_expiry).toBeNull();

    const byTest = parseScoresByTest(switched.english_sections as Record<string, unknown>);
    expect(byTest.IELTS?.overall).toBe("7");
    expect(byTest.IELTS?.sections?.listening).toBe("7");
    expect(byTest.CELPIP).toBeUndefined();
  });

  it("switching back to IELTS restores saved scores", () => {
    const afterCelpip = buildEnglishTestSwitchPatch(
      {
        english_test: "IELTS",
        english_overall: "7",
        english_test_date: "2026-06-17",
        english_test_expiry: "2027-06-18",
        english_sections: { listening: "7", reading: "7", writing: "7", speaking: "7" },
      },
      "CELPIP",
    );

    const backToIelts = buildEnglishTestSwitchPatch(
      { english_test: "CELPIP", ...afterCelpip },
      "IELTS",
    );

    expect(backToIelts.english_overall).toBe("7");
    expect(backToIelts.english_test_date).toBe("2026-06-17");
    const sections = backToIelts.english_sections as Record<string, unknown>;
    expect(sections.listening).toBe("7");
  });

  it("saving CELPIP scores does not overwrite IELTS cache", () => {
    const base = buildEnglishTestSwitchPatch(
      {
        english_test: "IELTS",
        english_overall: "7",
        english_test_date: "2026-06-17",
        english_test_expiry: "2027-06-18",
        english_sections: { listening: "7", reading: "7", writing: "7", speaking: "7" },
      },
      "CELPIP",
    );

    const withCelpipScores = buildEnglishScorePatch(
      { english_test: "CELPIP", ...base },
      {
        english_overall: "9",
        english_sections: { listening: "9", reading: "9", writing: "9", speaking: "9" },
      },
    );

    const byTest = parseScoresByTest(withCelpipScores.english_sections as Record<string, unknown>);
    expect(byTest.IELTS?.overall).toBe("7");
    expect(byTest.CELPIP?.overall).toBe("9");
    expect(withCelpipScores.english_overall).toBe("9");
  });

  it("hydrates legacy flat rows without __by_test__ cache", () => {
    const switched = buildEnglishTestSwitchPatch(
      {
        english_test: "IELTS",
        english_overall: "6.5",
        english_test_date: null,
        english_test_expiry: null,
        english_sections: { listening: "6.5" },
      },
      "PTE",
    );

    expect(switched.english_overall).toBeNull();
    const byTest = parseScoresByTest(switched.english_sections as Record<string, unknown>);
    expect(byTest.IELTS?.overall).toBe("6.5");
    expect(switched.english_sections?.[ENGLISH_SCORES_BY_TEST_KEY]).toBeTruthy();
  });
});
