/** Reserved key inside `english_sections` jsonb — stores scores per test type. */
export const ENGLISH_SCORES_BY_TEST_KEY = "__by_test__";

export type EnglishTestStatusValue = "not_taken" | "scheduled" | "taken" | "waived";

export interface EnglishTestScoreEntry {
  status?: EnglishTestStatusValue | null;
  overall?: string | null;
  test_date?: string | null;
  test_expiry?: string | null;
  sections?: Record<string, string>;
}

export type EnglishScoresByTest = Record<string, EnglishTestScoreEntry>;

export interface EnglishScoreFields {
  english_test?: string | null;
  english_test_status?: EnglishTestStatusValue | null;
  english_overall?: string | null;
  english_test_date?: string | null;
  english_test_expiry?: string | null;
  english_sections?: Record<string, unknown>;
}

function isScoreEntry(value: unknown): value is EnglishTestScoreEntry {
  return value != null && typeof value === "object" && !Array.isArray(value);
}

/** Strip reserved cache key; return sectional scores only. */
export function sectionalScoresOnly(sections: Record<string, unknown> | undefined): Record<string, string> {
  const out: Record<string, string> = {};
  if (!sections) return out;
  for (const [k, v] of Object.entries(sections)) {
    if (k === ENGLISH_SCORES_BY_TEST_KEY) continue;
    if (typeof v === "string") out[k] = v;
  }
  return out;
}

export function parseScoresByTest(english_sections: Record<string, unknown> | undefined): EnglishScoresByTest {
  const raw = english_sections?.[ENGLISH_SCORES_BY_TEST_KEY];
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return {};
  const out: EnglishScoresByTest = {};
  for (const [test, entry] of Object.entries(raw as Record<string, unknown>)) {
    if (isScoreEntry(entry)) out[test] = entry;
  }
  return out;
}

/** Legacy rows: flat fields belong to the active `english_test`. */
export function hydrateScoresByTest(fields: EnglishScoreFields): EnglishScoresByTest {
  const existing = parseScoresByTest(fields.english_sections);
  if (Object.keys(existing).length > 0) return existing;

  const test = fields.english_test;
  if (!test || test === "None") return {};

  const sections = sectionalScoresOnly(fields.english_sections);
  const hasData =
    fields.english_test_status ||
    fields.english_overall ||
    fields.english_test_date ||
    fields.english_test_expiry ||
    Object.keys(sections).length > 0;
  if (!hasData) return {};

  return {
    [test]: {
      status: fields.english_test_status ?? null,
      overall: fields.english_overall ?? null,
      test_date: fields.english_test_date ?? null,
      test_expiry: fields.english_test_expiry ?? null,
      sections,
    },
  };
}

export function scoresForTest(byTest: EnglishScoresByTest, testType: string | null | undefined): EnglishTestScoreEntry {
  if (!testType || testType === "None") return {};
  return byTest[testType] ?? {};
}

/** Persist per-test cache + mirror active test sectional keys at top level for profile sync. */
export function encodeEnglishSections(
  byTest: EnglishScoresByTest,
  activeTest: string | null | undefined,
): Record<string, unknown> {
  const active = activeTest && activeTest !== "None" ? byTest[activeTest] : undefined;
  return {
    ...(active?.sections ?? {}),
    [ENGLISH_SCORES_BY_TEST_KEY]: byTest,
  };
}

function snapshotCurrentTest(fields: EnglishScoreFields, byTest: EnglishScoresByTest): EnglishScoresByTest {
  const current = fields.english_test;
  if (!current || current === "None") return byTest;
  const prev = scoresForTest(byTest, current);
  return {
    ...byTest,
    [current]: {
      status: fields.english_test_status ?? prev.status ?? null,
      overall: fields.english_overall ?? null,
      test_date: fields.english_test_date ?? null,
      test_expiry: fields.english_test_expiry ?? null,
      sections: sectionalScoresOnly(fields.english_sections),
    },
  };
}

/** Call when user picks a different English test type. */
export function buildEnglishTestSwitchPatch(
  fields: EnglishScoreFields,
  nextTest: string | null,
): Partial<EnglishScoreFields> {
  let byTest = hydrateScoresByTest(fields);
  byTest = snapshotCurrentTest(fields, byTest);

  if (!nextTest || nextTest === "None") {
    return {
      english_test: nextTest,
      english_test_status: null,
      english_overall: null,
      english_test_date: null,
      english_test_expiry: null,
      english_sections: encodeEnglishSections(byTest, null),
    };
  }

  const loaded = scoresForTest(byTest, nextTest);
  return {
    english_test: nextTest,
    english_test_status: loaded.status ?? null,
    english_overall: loaded.overall ?? null,
    english_test_date: loaded.test_date ?? null,
    english_test_expiry: loaded.test_expiry ?? null,
    english_sections: encodeEnglishSections(byTest, nextTest),
  };
}

/** Call when status changes for the active test. */
export function buildEnglishStatusPatch(
  fields: EnglishScoreFields,
  status: EnglishTestStatusValue | null,
): Partial<EnglishScoreFields> {
  const test = fields.english_test;
  let byTest = hydrateScoresByTest(fields);
  byTest = snapshotCurrentTest(fields, byTest);

  if (test && test !== "None") {
    const prev = scoresForTest(byTest, test);
    byTest[test] = {
      ...prev,
      status: status ?? null,
      overall: fields.english_overall ?? null,
      test_date: fields.english_test_date ?? null,
      test_expiry: fields.english_test_expiry ?? null,
      sections: sectionalScoresOnly(fields.english_sections),
    };
  }

  return {
    english_test_status: status,
    english_sections: encodeEnglishSections(byTest, test),
  };
}

/** Call when overall / date / sectional scores change for the active test. */
export function buildEnglishScorePatch(
  fields: EnglishScoreFields,
  patch: Partial<Pick<EnglishScoreFields, "english_overall" | "english_test_date" | "english_test_expiry" | "english_sections">>,
): Partial<EnglishScoreFields> {
  const test = fields.english_test;
  const merged: EnglishScoreFields = {
    english_overall: patch.english_overall !== undefined ? patch.english_overall : fields.english_overall,
    english_test_date: patch.english_test_date !== undefined ? patch.english_test_date : fields.english_test_date,
    english_test_expiry: patch.english_test_expiry !== undefined ? patch.english_test_expiry : fields.english_test_expiry,
    english_sections:
      patch.english_sections !== undefined ? patch.english_sections : fields.english_sections,
  };

  if (!test || test === "None") return merged;

  let byTest = hydrateScoresByTest(fields);
  byTest = snapshotCurrentTest(
    {
      ...fields,
      english_overall: merged.english_overall,
      english_test_date: merged.english_test_date,
      english_test_expiry: merged.english_test_expiry,
      english_sections: merged.english_sections,
    },
    byTest,
  );

  const prev = scoresForTest(byTest, test);
  byTest[test] = {
    status: fields.english_test_status ?? prev.status ?? null,
    overall: merged.english_overall ?? null,
    test_date: merged.english_test_date ?? null,
    test_expiry: merged.english_test_expiry ?? null,
    sections: sectionalScoresOnly(merged.english_sections),
  };

  return {
    ...merged,
    english_sections: encodeEnglishSections(byTest, test),
  };
}
