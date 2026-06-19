import { describe, expect, it } from "vitest";
import { createEmptyAttempt } from "@/lib/profile/testAttempts";
import {
  attemptCompletionWeight,
  getTestsCompletionBuckets,
  testsCompletionFilledTotal,
} from "@/lib/profile/testAttemptCompletion";
import { formatActiveAttemptLine, listActiveAttemptsForSummary } from "@/lib/profile/testAttemptSummary";
import type { ProfileTests } from "@/lib/profile/types";

function testsFixture(partial: Partial<ProfileTests>): ProfileTests {
  return {
    attempts: [],
    active_attempt_ids: {},
    active_english_test_id: null,
    english: [],
    aptitude: [],
    language: [],
    ...partial,
  };
}

describe("testAttemptCompletion", () => {
  it("IELTS taken complete requires overall + test_date", () => {
    const complete = createEmptyAttempt("ielts");
    const partial = createEmptyAttempt("ielts");
    Object.assign(complete, {
      status: "taken",
      overall_score: "7.5",
      test_date: "2025-11-20",
    });
    Object.assign(partial, { status: "taken", overall_score: "7.5" });
    expect(attemptCompletionWeight(complete)).toBe(1);
    expect(attemptCompletionWeight(partial)).toBe(0.5);
  });

  it("GRE taken complete requires overall only", () => {
    const complete = createEmptyAttempt("gre");
    Object.assign(complete, { status: "taken", overall_score: "320" });
    expect(attemptCompletionWeight(complete)).toBe(1);
  });

  it("French taken complete requires exam_type", () => {
    const complete = createEmptyAttempt("french");
    const partial = createEmptyAttempt("french");
    Object.assign(complete, { status: "taken", exam_type: "TCF" });
    Object.assign(partial, { status: "taken", overall_score: "B2" });
    expect(attemptCompletionWeight(complete)).toBe(1);
    expect(attemptCompletionWeight(partial)).toBe(0.5);
  });

  it("planned and scheduled are partial; waived is complete", () => {
    const planned = createEmptyAttempt("pte");
    Object.assign(planned, { status: "planned" });
    const waived = createEmptyAttempt("german");
    Object.assign(waived, { status: "waived" });
    expect(attemptCompletionWeight(planned)).toBe(0.5);
    expect(attemptCompletionWeight(waived)).toBe(1);
  });

  it("expired and not_taken are incomplete", () => {
    const expired = createEmptyAttempt("ielts");
    Object.assign(expired, { status: "expired", overall_score: "6" });
    expect(attemptCompletionWeight(expired)).toBe(0);
  });

  it("counts three buckets from active attempts only", () => {
    const ielts = createEmptyAttempt("ielts");
    Object.assign(ielts, {
      status: "taken",
      overall_score: "7",
      test_date: "2025-01-01",
    });
    const gre = createEmptyAttempt("gre");
    Object.assign(gre, { status: "planned" });
    const tests = testsFixture({
      active_english_test_id: "ielts",
      attempts: [ielts, gre],
      active_attempt_ids: { ielts: ielts.attempt_id, gre: gre.attempt_id },
    });
    const buckets = getTestsCompletionBuckets(tests);
    expect(buckets.english?.test_id).toBe("ielts");
    expect(buckets.aptitude?.test_id).toBe("gre");
    expect(buckets.language).toBeNull();
    expect(testsCompletionFilledTotal(tests)).toEqual({ filled: 1.5, total: 3 });
  });
});

describe("testAttemptSummary", () => {
  it("formats active attempt lines for C360", () => {
    const ielts = createEmptyAttempt("ielts");
    Object.assign(ielts, {
      status: "taken",
      variant: "Academic",
      overall_score: "7.5",
    });
    const gre = createEmptyAttempt("gre");
    Object.assign(gre, { status: "planned" });
    const tests = testsFixture({
      active_english_test_id: "ielts",
      attempts: [ielts, gre],
      active_attempt_ids: { ielts: ielts.attempt_id, gre: gre.attempt_id },
    });
    const lines = listActiveAttemptsForSummary(tests).map(formatActiveAttemptLine);
    expect(lines[0]).toBe("IELTS (Academic) Taken 7.5");
    expect(lines[1]).toBe("GRE Planned");
  });

  it("does not include sibling historical attempts", () => {
    const old = createEmptyAttempt("ielts");
    Object.assign(old, { status: "expired", overall_score: "6", test_date: "2020-01-01" });
    const current = createEmptyAttempt("ielts");
    Object.assign(current, {
      status: "taken",
      overall_score: "7.5",
      test_date: "2025-11-20",
    });
    const tests = testsFixture({
      active_english_test_id: "ielts",
      attempts: [old, current],
      active_attempt_ids: { ielts: current.attempt_id },
    });
    const lines = listActiveAttemptsForSummary(tests).map(formatActiveAttemptLine);
    expect(lines).toHaveLength(1);
    expect(lines[0]).toContain("7.5");
    expect(lines[0]).not.toContain("6");
  });
});
