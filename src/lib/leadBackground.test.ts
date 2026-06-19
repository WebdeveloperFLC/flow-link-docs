import { describe, expect, it } from "vitest";
import {
  backgroundStateToLeadDraft,
  buildBackgroundDetailSections,
  reconcileBackgroundAfterSave,
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
import { ensureAttemptId } from "@/lib/profile/profileRecordIds";

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
    expect(summarizeEnglishTests(state)).toBe("IELTS Taken 7");
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
    expect(lines).toHaveLength(1);
    expect(lines[0]).toContain("CELPIP");
    expect(lines[0]).toContain("Taken");
    expect(lines[0]).not.toContain("Scheduled");

    const summary = summarizeEnglishTests(bg);
    expect(summary).toBe("CELPIP Taken 54");
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

  it("buildBackgroundDetailView lists multiple English test cards from __by_test__", () => {
    const view = buildBackgroundDetailView({
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

    expect(view.english).toHaveLength(2);
    expect(view.english.map((t) => t.test)).toEqual(expect.arrayContaining(["IELTS", "CELPIP"]));
    expect(view.english.find((t) => t.test === "IELTS")?.overall).toBe("7");
    expect(view.english.find((t) => t.test === "CELPIP")?.overall).toBe("54");
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

describe("leadBackground attempts (Phase E5)", () => {
  it("hydrates attempts from stored test_attempts on lead", () => {
    const state = leadToBackgroundState({
      english_test: "IELTS",
      test_attempts: [
        {
          attempt_id: "test_a1",
          test_id: "ielts",
          category: "english",
          status: "taken",
          overall_score: "7.5",
          test_date: "2025-11-20",
          sections: {},
        },
      ],
      active_attempt_ids: { ielts: "test_a1" },
    } as never);
    expect(state.attempts).toHaveLength(1);
    expect(state.attempts![0]!.overall_score).toBe("7.5");
    expect(summarizeEnglishTests(state)).toContain("7.5");
  });

  it("shows active attempt only when multiple IELTS siblings exist", () => {
    const oldId = ensureAttemptId("old");
    const newId = ensureAttemptId("new");
    const state = leadToBackgroundState({
      english_test: "IELTS",
      english_test_status: "taken",
      english_overall: "7.5",
      test_attempts: [
        {
          attempt_id: oldId,
          test_id: "ielts",
          category: "english",
          status: "expired",
          overall_score: "6",
          test_date: "2020-01-01",
          sections: {},
        },
        {
          attempt_id: newId,
          test_id: "ielts",
          category: "english",
          status: "taken",
          overall_score: "7.5",
          test_date: "2025-11-20",
          sections: {},
        },
      ],
      active_attempt_ids: { ielts: newId },
    } as never);
    const view = buildBackgroundDetailView(state);
    expect(view.english).toHaveLength(1);
    expect(view.english[0]?.overall).toBe("7.5");
    expect(summarizeEnglishTests(state)).not.toContain("6");
  });

  it("backgroundStateToLeadDraft dual-writes test_attempts + legacy mirror", () => {
    const state = leadToBackgroundState({
      english_test: "IELTS",
      english_test_status: "taken",
      english_overall: "7",
      english_test_date: "2025-06-01",
      english_sections: { listening: "7" },
    } as never);
    const draft = backgroundStateToLeadDraft(state);
    expect(draft.test_attempts?.length).toBeGreaterThan(0);
    expect(draft.active_attempt_ids?.ielts).toBeTruthy();
    expect(draft.english_overall).toBe("7");
  });

  it("falls back to legacy english when attempt rows exist but active summary is empty", () => {
    const view = buildBackgroundDetailView({
      attempts: [
        {
          attempt_id: ensureAttemptId("stub"),
          test_id: "ielts",
          category: "english",
          sections: {},
          linked_documents: [],
        },
      ],
      active_attempt_ids: {},
      english_test: "IELTS",
      english_test_status: "taken",
      english_overall: "7",
      english_sections: { listening: "7" },
    } as never);
    expect(view.english.length).toBeGreaterThan(0);
    expect(view.english[0]?.overall).toBe("7");
  });

  it("reconcileBackgroundAfterSave keeps local tests when DB round-trip is empty", () => {
    const local = leadToBackgroundState({
      english_test: "IELTS",
      english_test_status: "taken",
      english_overall: "7",
    } as never);
    const fromDb = leadToBackgroundState({
      last_education: "post_graduate",
      education_history: [{ level: "post_graduate" }],
      test_attempts: [],
    } as never);
    const merged = reconcileBackgroundAfterSave(local, fromDb);
    expect(merged.english_overall).toBe("7");
    expect(buildBackgroundDetailView(merged).english.length).toBeGreaterThan(0);
  });

  it("formats education level code for display", () => {
    const view = buildBackgroundDetailView({
      education_history: [{ level: "post_graduate" }],
    } as never);
    expect(view.education[0]?.title).toBe("Post Graduate");
  });
});
