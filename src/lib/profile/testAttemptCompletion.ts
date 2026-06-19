import {
  APTITUDE_TEST_IDS,
  LANGUAGE_TEST_IDS,
} from "@/lib/profile/profileTestCatalog";
import type { ProfileTests, TestAttempt } from "@/lib/profile/types";
import { attemptHasData, getActiveAttempt } from "@/lib/profile/testAttempts";

export type AttemptCompletionWeight = 0 | 0.5 | 1;

function filledStr(v: string | null | undefined): boolean {
  return !!(v && String(v).trim());
}

/**
 * Per-status completion weight for a single active attempt.
 * Taken: category-specific required fields; planned/scheduled → partial; waived → complete.
 */
export function attemptCompletionWeight(attempt: TestAttempt): AttemptCompletionWeight {
  const status = attempt.status ?? "not_taken";
  switch (status) {
    case "waived":
      return 1;
    case "taken": {
      if (attempt.category === "english") {
        return filledStr(attempt.overall_score) && filledStr(attempt.test_date) ? 1 : 0.5;
      }
      if (attempt.category === "aptitude") {
        return filledStr(attempt.overall_score) ? 1 : 0.5;
      }
      if (attempt.category === "language") {
        return filledStr(attempt.exam_type) ? 1 : 0.5;
      }
      return 0.5;
    }
    case "planned":
    case "scheduled":
    case "result_awaited":
      return 0.5;
    case "not_taken":
    case "expired":
    default:
      return 0;
  }
}

export interface TestsCompletionBuckets {
  english: TestAttempt | null;
  aptitude: TestAttempt | null;
  language: TestAttempt | null;
}

function pickBestBucketAttempt(candidates: (TestAttempt | null)[]): TestAttempt | null {
  const present = candidates.filter((a): a is TestAttempt => !!a && attemptHasData(a));
  if (!present.length) return null;
  return present.sort((a, b) => attemptCompletionWeight(b) - attemptCompletionWeight(a))[0]!;
}

/** Three completion buckets — english primary, best aptitude, best language. */
export function getTestsCompletionBuckets(tests: ProfileTests): TestsCompletionBuckets {
  const english =
    tests.active_english_test_id
      ? getActiveAttempt(tests.attempts, tests.active_attempt_ids, tests.active_english_test_id)
      : null;
  const englishOk = english && attemptHasData(english) ? english : null;

  const aptitude = pickBestBucketAttempt(
    APTITUDE_TEST_IDS.map((id) => getActiveAttempt(tests.attempts, tests.active_attempt_ids, id)),
  );

  const language = pickBestBucketAttempt(
    LANGUAGE_TEST_IDS.map((id) => getActiveAttempt(tests.attempts, tests.active_attempt_ids, id)),
  );

  return { english: englishOk, aptitude, language };
}

export function testsCompletionFilledTotal(tests: ProfileTests): { filled: number; total: number } {
  const buckets = getTestsCompletionBuckets(tests);
  const weights = [buckets.english, buckets.aptitude, buckets.language].map((a) =>
    a ? attemptCompletionWeight(a) : 0,
  );
  const filled = weights.reduce((sum, w) => sum + w, 0);
  return { filled, total: 3 };
}
