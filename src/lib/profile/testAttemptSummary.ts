import {
  APTITUDE_TEST_IDS,
  ENGLISH_TEST_IDS,
  LANGUAGE_TEST_IDS,
  testLabel,
} from "@/lib/profile/profileTestCatalog";
import type { ProfileTests, ProfileTestStatus, TestAttempt } from "@/lib/profile/types";
import { attemptHasData, getActiveAttempt } from "@/lib/profile/testAttempts";

const STATUS_DISPLAY: Record<ProfileTestStatus, string> = {
  not_taken: "Not taken",
  planned: "Planned",
  scheduled: "Scheduled",
  result_awaited: "Result awaited",
  taken: "Taken",
  expired: "Expired",
  waived: "Waived",
};

/** C360 / section summary line — active attempt only, e.g. `IELTS (Academic) Taken 7.5`. */
export function formatActiveAttemptLine(attempt: TestAttempt): string {
  const name = testLabel(attempt.test_id);
  const variant = attempt.test_id === "ielts" && attempt.variant ? ` (${attempt.variant})` : "";
  const statusKey = attempt.status ?? "not_taken";
  const status = STATUS_DISPLAY[statusKey] ?? statusKey;

  let suffix = "";
  if (statusKey === "taken") {
    if (attempt.overall_score) suffix = ` ${attempt.overall_score}`;
    else if (attempt.category === "language" && attempt.exam_type) suffix = ` ${attempt.exam_type}`;
  } else if (statusKey === "scheduled" || statusKey === "planned") {
    if (attempt.test_date) suffix = ` ${attempt.test_date}`;
    else if (attempt.planned_month) suffix = ` ${attempt.planned_month}`;
  }

  return `${name}${variant} ${status}${suffix}`.trim();
}

/** Highlight chip when active english (or any taken test) has an overall score. */
export function formatActiveAttemptHighlight(attempt: TestAttempt): string | null {
  if (attempt.status === "taken" && attempt.overall_score) {
    return `${testLabel(attempt.test_id)} ${attempt.overall_score}`;
  }
  return null;
}

/** One active attempt per test type — excludes historical siblings. */
export function listActiveAttemptsForSummary(tests: ProfileTests): TestAttempt[] {
  const out: TestAttempt[] = [];

  const englishTestId = tests.active_english_test_id;
  if (englishTestId) {
    const english = getActiveAttempt(tests.attempts, tests.active_attempt_ids, englishTestId);
    if (english && attemptHasData(english)) out.push(english);
  } else {
    for (const testId of ENGLISH_TEST_IDS) {
      const english = getActiveAttempt(tests.attempts, tests.active_attempt_ids, testId);
      if (english && attemptHasData(english)) {
        out.push(english);
        break;
      }
    }
  }

  for (const testId of APTITUDE_TEST_IDS) {
    const attempt = getActiveAttempt(tests.attempts, tests.active_attempt_ids, testId);
    if (attempt && attemptHasData(attempt)) out.push(attempt);
  }

  for (const testId of LANGUAGE_TEST_IDS) {
    const attempt = getActiveAttempt(tests.attempts, tests.active_attempt_ids, testId);
    if (attempt && attemptHasData(attempt)) out.push(attempt);
  }

  return out;
}
