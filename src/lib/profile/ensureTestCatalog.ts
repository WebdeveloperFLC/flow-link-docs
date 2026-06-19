import {
  APTITUDE_TEST_IDS,
  ENGLISH_TEST_IDS,
  LANGUAGE_TEST_IDS,
} from "@/lib/profile/profileTestCatalog";
import type {
  ProfileAptitudeTestEntry,
  ProfileAptitudeTestId,
  ProfileEnglishTestEntry,
  ProfileEnglishTestId,
  ProfileLanguageTestEntry,
  ProfileLanguageTestId,
  ProfileTests,
} from "@/lib/profile/types";

export function emptyEnglishTestEntry(testId: ProfileEnglishTestId): ProfileEnglishTestEntry {
  return {
    test_id: testId,
    status: null,
    overall: null,
    test_date: null,
    test_expiry: null,
    sections: {},
    ielts_variant: null,
    country: null,
    linked_documents: [],
  };
}

export function emptyAptitudeTestEntry(testId: ProfileAptitudeTestId): ProfileAptitudeTestEntry {
  return {
    test_id: testId,
    status: null,
    overall: null,
    test_date: null,
    sections: {},
    linked_documents: [],
  };
}

export function emptyLanguageTestEntry(testId: ProfileLanguageTestId): ProfileLanguageTestEntry {
  return {
    test_id: testId,
    status: null,
    cefr_level: null,
    exam_type: null,
    overall_score: null,
    test_date: null,
    expiry_date: null,
    sections: {},
    linked_documents: [],
  };
}

/** Ensure edit state has a slot for every catalog test id (sparse VM → full edit grid). */
export function ensureFullTestCatalog(tests: ProfileTests): ProfileTests {
  const englishMap = new Map(tests.english.map((e) => [e.test_id, e]));
  const aptitudeMap = new Map(tests.aptitude.map((a) => [a.test_id, a]));
  const languageMap = new Map(tests.language.map((l) => [l.test_id, l]));

  return {
    attempts: [...(tests.attempts ?? [])],
    active_attempt_ids: { ...(tests.active_attempt_ids ?? {}) },
    active_english_test_id: tests.active_english_test_id,
    english: ENGLISH_TEST_IDS.map((id) => englishMap.get(id) ?? emptyEnglishTestEntry(id)),
    aptitude: APTITUDE_TEST_IDS.map((id) => aptitudeMap.get(id) ?? emptyAptitudeTestEntry(id)),
    language: LANGUAGE_TEST_IDS.map((id) => languageMap.get(id) ?? emptyLanguageTestEntry(id)),
  };
}

export function resolveEnglishEntry(
  english: readonly ProfileEnglishTestEntry[],
  testId: ProfileEnglishTestId,
  mode: "view" | "edit",
): ProfileEnglishTestEntry | null {
  const found = english.find((e) => e.test_id === testId);
  if (found) return found;
  return mode === "edit" ? emptyEnglishTestEntry(testId) : null;
}

export function resolveAptitudeEntry(
  aptitude: readonly ProfileAptitudeTestEntry[],
  testId: ProfileAptitudeTestId,
  mode: "view" | "edit",
): ProfileAptitudeTestEntry | null {
  const found = aptitude.find((a) => a.test_id === testId);
  if (found) return found;
  return mode === "edit" ? emptyAptitudeTestEntry(testId) : null;
}

export function resolveLanguageEntry(
  language: readonly ProfileLanguageTestEntry[],
  testId: ProfileLanguageTestId,
  mode: "view" | "edit",
): ProfileLanguageTestEntry | null {
  const found = language.find((l) => l.test_id === testId);
  if (found) return found;
  return mode === "edit" ? emptyLanguageTestEntry(testId) : null;
}
