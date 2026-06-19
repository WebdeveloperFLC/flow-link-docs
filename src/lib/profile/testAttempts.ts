import type { ClientRow } from "@/lib/clientRegistration";
import {
  ENGLISH_SCORES_BY_TEST_KEY,
  hydrateScoresByTest,
  type EnglishScoresByTest,
} from "@/lib/englishTestScores";
import { leadToBackgroundState, type LeadBackgroundState } from "@/lib/leadBackground";
import { normalizeLanguageTests } from "@/lib/languageTests";
import { slotLabel } from "@/lib/profile/profileDocumentSlots";
import { ensureAttemptId, testAttemptRefKey } from "@/lib/profile/profileRecordIds";
import {
  ENGLISH_TEST_IDS,
  legacyAptitudeToTestId,
  legacyEnglishToTestId,
  testCategory,
  testIdToLegacyAptitude,
  testIdToLegacyEnglish,
  type ProfileAptitudeTestId,
  type ProfileEnglishTestId,
  type ProfileLanguageTestId,
  type ProfileTestId,
} from "@/lib/profile/profileTestCatalog";
import { PTE_VARIANTS, TOEFL_VARIANTS } from "@/lib/profile/types";
import type {
  ClientDocumentRefRow,
  IeltsVariant,
  PteVariant,
  ToeflVariant,
  ProfileAptitudeTestEntry,
  ProfileEnglishTestEntry,
  ProfileLanguageTestEntry,
  ProfileLinkedDocument,
  ProfileTestCategory,
  ProfileTests,
  ProfileTestStatus,
  TestAttempt,
} from "@/lib/profile/types";

type RawLinkedDoc = {
  document_id?: string;
  slot?: string;
  label?: string;
  linked_at?: string | null;
};

function str(v: unknown): string | null {
  if (v == null) return null;
  const s = String(v).trim();
  return s.length ? s : null;
}

export function coerceAttemptStatus(raw: unknown): ProfileTestStatus | null {
  const s = str(raw);
  if (!s) return null;
  const valid: ProfileTestStatus[] = [
    "not_taken",
    "planned",
    "scheduled",
    "result_awaited",
    "taken",
    "expired",
    "waived",
  ];
  if (valid.includes(s as ProfileTestStatus)) return s as ProfileTestStatus;
  if (s === "scheduled") return "scheduled";
  if (s === "taken") return "taken";
  if (s === "waived") return "waived";
  if (s === "not_taken") return "not_taken";
  return null;
}

function readIeltsVariant(sections: Record<string, unknown>, topLevel?: unknown): IeltsVariant | null {
  const v = str(topLevel) ?? str(sections.ielts_variant) ?? str(sections.variant);
  if (v === "Academic" || v === "General") return v;
  const lower = v?.toLowerCase();
  if (lower === "academic") return "Academic";
  if (lower === "general") return "General";
  return null;
}

function readPteVariant(sections: Record<string, unknown>, topLevel?: unknown): PteVariant | null {
  const v = str(topLevel) ?? str(sections.pte_variant) ?? str(sections.variant);
  if (!v) return null;
  const hit = PTE_VARIANTS.find((option) => option.toLowerCase() === v.toLowerCase());
  return hit ?? null;
}

function readToeflVariant(sections: Record<string, unknown>, topLevel?: unknown): ToeflVariant | null {
  const v = str(topLevel) ?? str(sections.toefl_variant) ?? str(sections.variant);
  if (!v) return null;
  const hit = TOEFL_VARIANTS.find((option) => option.toLowerCase() === v.toLowerCase());
  return hit ?? null;
}

function readVariantForEnglishTest(
  testId: ProfileEnglishTestId,
  sections: Record<string, unknown>,
  entryVariant?: unknown,
): string | null {
  if (testId === "ielts") return readIeltsVariant(sections, entryVariant);
  if (testId === "pte") return readPteVariant(sections, entryVariant);
  if (testId === "toefl") return readToeflVariant(sections, entryVariant);
  return str(entryVariant);
}

function mergeLinkedDocs(
  jsonb: RawLinkedDoc[] | undefined,
  refs: ClientDocumentRefRow[],
  refKey: string,
  legacyRefKey?: string,
): ProfileLinkedDocument[] {
  const fromJson = (jsonb ?? [])
    .filter((d) => d.document_id && d.slot)
    .map((d) => ({
      document_id: d.document_id!,
      slot: d.slot!,
      label: d.label ?? slotLabel(d.slot!),
      linked_at: d.linked_at ?? null,
    }));
  const fromRefs = refs
    .filter((r) => r.ref_key === refKey || (legacyRefKey && r.ref_key === legacyRefKey))
    .map((r) => ({
      document_id: r.document_id,
      slot: r.slot,
      label: r.label ?? slotLabel(r.slot),
      linked_at: r.linked_at,
      file_name: r.file_name ?? null,
    }));
  const byKey = new Map<string, ProfileLinkedDocument>();
  for (const d of fromJson) byKey.set(`${d.slot}:${d.document_id}`, d);
  for (const d of fromRefs) byKey.set(`${d.slot}:${d.document_id}`, d);
  return [...byKey.values()];
}

export function attemptHasData(a: TestAttempt): boolean {
  return !!(
    a.status ||
    a.overall_score ||
    a.test_date ||
    a.result_date ||
    a.expiry_date ||
    a.variant ||
    a.exam_type ||
    a.cefr_level ||
    a.notes ||
    a.waiver_reason ||
    a.planned_month ||
    Object.keys(a.sections ?? {}).length > 0 ||
    a.linked_documents.length > 0
  );
}

function normalizeAttemptRow(raw: unknown, refs: ClientDocumentRefRow[] = []): TestAttempt | null {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return null;
  const o = raw as Record<string, unknown>;
  const testId = str(o.test_id)?.toLowerCase();
  if (!testId) return null;

  const category = (str(o.category) as ProfileTestCategory | null) ?? testCategory(testId as ProfileTestId);
  const attemptId = ensureAttemptId(str(o.attempt_id));
  const sections =
    o.sections && typeof o.sections === "object" && !Array.isArray(o.sections)
      ? Object.fromEntries(
          Object.entries(o.sections as Record<string, unknown>)
            .filter(([, v]) => typeof v === "string")
            .map(([k, v]) => [k, v as string]),
        )
      : {};

  const rawLinked = o.linked_documents as RawLinkedDoc[] | undefined;
  const refKey = testAttemptRefKey(testId as ProfileTestId, attemptId);
  const legacyRefKey = `tests:${testId}`;

  return {
    attempt_id: attemptId,
    test_id: testId as ProfileTestId,
    category,
    status: coerceAttemptStatus(o.status),
    variant: str(o.variant) ?? str(o.ielts_variant),
    test_date: str(o.test_date),
    result_date: str(o.result_date),
    expiry_date: str(o.expiry_date) ?? str(o.test_expiry),
    overall_score: str(o.overall_score) ?? str(o.overall),
    sections,
    exam_type: str(o.exam_type),
    cefr_level: str(o.cefr_level),
    country: str(o.country) ?? str(o.test_country),
    planned_month: str(o.planned_month),
    target_intake: str(o.target_intake),
    exam_centre: str(o.exam_centre),
    waiver_reason: str(o.waiver_reason),
    notes: str(o.notes),
    linked_documents: mergeLinkedDocs(rawLinked, refs, refKey, legacyRefKey),
  };
}

function serializeAttempt(a: TestAttempt): Record<string, unknown> {
  return {
    attempt_id: a.attempt_id,
    test_id: a.test_id,
    category: a.category,
    status: a.status,
    variant: a.variant,
    test_date: a.test_date,
    result_date: a.result_date,
    expiry_date: a.expiry_date,
    overall_score: a.overall_score,
    sections: { ...a.sections },
    exam_type: a.exam_type,
    cefr_level: a.cefr_level,
    country: a.country,
    planned_month: a.planned_month,
    target_intake: a.target_intake,
    exam_centre: a.exam_centre,
    waiver_reason: a.waiver_reason,
    notes: a.notes,
    linked_documents: a.linked_documents.map((d) => ({
      document_id: d.document_id,
      slot: d.slot,
      label: d.label,
      linked_at: d.linked_at,
    })),
  };
}

function englishAttemptFromCache(
  testId: ProfileEnglishTestId,
  entry: EnglishScoresByTest[string],
  sectionsRaw: Record<string, unknown>,
  isActive: boolean,
  refs: ClientDocumentRefRow[],
  bgEnglishStatus?: string | null,
): TestAttempt {
  const attemptId = ensureAttemptId(`legacy_${testId}`);
  const legacy = testIdToLegacyEnglish(testId);
  const refKey = testAttemptRefKey(testId, attemptId);
  const jsonbLinked = (sectionsRaw[`linked_documents_${legacy}`] ??
    (isActive ? sectionsRaw.linked_documents : undefined)) as RawLinkedDoc[] | undefined;

  return {
    attempt_id: attemptId,
    test_id: testId,
    category: "english",
    status:
      coerceAttemptStatus(entry.status) ??
      (isActive ? coerceAttemptStatus(bgEnglishStatus) : null),
    variant: readVariantForEnglishTest(testId, sectionsRaw, entry.variant),
    test_date: str(entry.test_date),
    expiry_date: str(entry.test_expiry),
    overall_score: str(entry.overall),
    sections: { ...(entry.sections ?? {}) },
    country: isActive ? str(sectionsRaw.test_country) : null,
    linked_documents: mergeLinkedDocs(jsonbLinked, refs, refKey, `tests:${testId}`),
  };
}

/**
 * One-time migration from legacy columns → attempt records.
 * Preserves multiple aptitude rows (e.g. two GRE entries in other_tests).
 */
export function migrateLegacyToAttempts(
  client: Partial<ClientRow>,
  refs: ClientDocumentRefRow[] = [],
  prehydratedBg?: LeadBackgroundState,
): { attempts: TestAttempt[]; active_attempt_ids: Partial<Record<ProfileTestId, string>> } {
  const bg = prehydratedBg ?? leadToBackgroundState(client);
  const sectionsRaw = (client.english_sections ?? bg.english_sections ?? {}) as Record<string, unknown>;
  const byTest = hydrateScoresByTest({
    english_test: bg.english_test,
    english_test_status: bg.english_test_status,
    english_overall: bg.english_overall,
    english_test_date: bg.english_test_date,
    english_test_expiry: bg.english_test_expiry,
    english_sections: sectionsRaw,
  });

  const attempts: TestAttempt[] = [];
  const active_attempt_ids: Partial<Record<ProfileTestId, string>> = {};

  const activeEnglishId = legacyEnglishToTestId(bg.english_test);

  for (const testId of ENGLISH_TEST_IDS) {
    const legacy = testIdToLegacyEnglish(testId);
    const cached = byTest[legacy];
    if (!cached) continue;
    const hasData =
      cached.status ||
      cached.overall ||
      cached.test_date ||
      cached.test_expiry ||
      Object.keys(cached.sections ?? {}).length > 0;
    const isActive = activeEnglishId === testId;
    if (!hasData && !isActive) continue;

    const attempt = englishAttemptFromCache(testId, cached, sectionsRaw, isActive, refs, bg.english_test_status);
    if (attemptHasData(attempt)) {
      attempts.push(attempt);
      if (isActive) active_attempt_ids[testId] = attempt.attempt_id;
    }
  }

  if (attempts.filter((a) => a.test_id === activeEnglishId).length === 0 && activeEnglishId) {
    const attemptId = ensureAttemptId(`legacy_${activeEnglishId}`);
    const refKey = testAttemptRefKey(activeEnglishId, attemptId);
    attempts.push({
      attempt_id: attemptId,
      test_id: activeEnglishId,
      category: "english",
      status: coerceAttemptStatus(bg.english_test_status),
      variant: activeEnglishId
        ? readVariantForEnglishTest(activeEnglishId, sectionsRaw)
        : null,
      test_date: str(bg.english_test_date),
      expiry_date: str(bg.english_test_expiry),
      overall_score: str(bg.english_overall),
      sections: {},
      country: str(sectionsRaw.test_country),
      linked_documents: mergeLinkedDocs(
        sectionsRaw.linked_documents as RawLinkedDoc[] | undefined,
        refs,
        refKey,
        `tests:${activeEnglishId}`,
      ),
    });
    active_attempt_ids[activeEnglishId] = attemptId;
  }

  let greIndex = 0;
  for (const row of bg.other_tests ?? []) {
    const testId = legacyAptitudeToTestId(row.type);
    if (!testId) continue;
    const attemptId = ensureAttemptId(`legacy_${testId}_${greIndex++}`);
    const refKey = testAttemptRefKey(testId, attemptId);
    const rawLinked = (row as { linked_documents?: RawLinkedDoc[] }).linked_documents;
    const attempt: TestAttempt = {
      attempt_id: attemptId,
      test_id: testId,
      category: "aptitude",
      status: row.score || row.date ? "taken" : coerceAttemptStatus((row as { status?: string }).status) ?? "not_taken",
      test_date: str(row.date),
      overall_score: str(row.score),
      sections: { ...(row.sections ?? {}) },
      linked_documents: mergeLinkedDocs(rawLinked, refs, refKey, `tests:${testId}`),
    };
    if (attemptHasData(attempt)) {
      attempts.push(attempt);
      active_attempt_ids[testId] = attemptId;
    }
  }

  const lt = normalizeLanguageTests(client.language_tests ?? bg.language_tests);
  for (const langKey of ["french", "german"] as ProfileLanguageTestId[]) {
    const block = lt[langKey];
    if (!block) continue;
    const attemptId = ensureAttemptId(`legacy_${langKey}`);
    const refKey = testAttemptRefKey(langKey, attemptId);
    const rawLinked = (block as { linked_documents?: RawLinkedDoc[] }).linked_documents;
    const attempt: TestAttempt = {
      attempt_id: attemptId,
      test_id: langKey,
      category: "language",
      status: coerceAttemptStatus(block.status),
      cefr_level: str(block.cefr_level),
      exam_type: str(block.exam_type),
      overall_score: str(block.overall_score),
      test_date: str(block.test_date),
      expiry_date: str(block.expiry_date),
      sections: { ...(block.sections ?? {}) },
      linked_documents: mergeLinkedDocs(rawLinked, refs, refKey, `tests:${langKey}`),
    };
    if (attemptHasData(attempt)) {
      attempts.push(attempt);
      active_attempt_ids[langKey] = attemptId;
    }
  }

  return { attempts, active_attempt_ids };
}

export function parseTestAttemptsFromClient(
  client: Partial<ClientRow>,
  refs: ClientDocumentRefRow[] = [],
  options?: { prehydratedBg?: LeadBackgroundState },
): { attempts: TestAttempt[]; active_attempt_ids: Partial<Record<ProfileTestId, string>> } {
  const rawAttempts = (client as { test_attempts?: unknown }).test_attempts;
  const rawActive = (client as { active_attempt_ids?: unknown }).active_attempt_ids;

  let attempts: TestAttempt[] = [];
  if (Array.isArray(rawAttempts) && rawAttempts.length > 0) {
    attempts = rawAttempts
      .map((row) => normalizeAttemptRow(row, refs))
      .filter((a): a is TestAttempt => !!a && attemptHasData(a));
  }

  let active_attempt_ids: Partial<Record<ProfileTestId, string>> = {};
  if (rawActive && typeof rawActive === "object" && !Array.isArray(rawActive)) {
    for (const [k, v] of Object.entries(rawActive as Record<string, unknown>)) {
      const id = str(v);
      if (id) active_attempt_ids[k as ProfileTestId] = ensureAttemptId(id);
    }
  }

  if (attempts.length === 0) {
    return migrateLegacyToAttempts(client, refs, options?.prehydratedBg);
  }

  return { attempts, active_attempt_ids };
}

export function getActiveAttempt(
  attempts: TestAttempt[],
  activeIds: Partial<Record<ProfileTestId, string>>,
  testId: ProfileTestId,
): TestAttempt | null {
  const activeId = activeIds[testId];
  if (activeId) {
    const hit = attempts.find((a) => a.attempt_id === activeId && a.test_id === testId);
    if (hit) return hit;
  }
  const forType = attempts.filter((a) => a.test_id === testId);
  const taken = forType.filter((a) => a.status === "taken");
  if (taken.length) return taken[taken.length - 1]!;
  return forType[forType.length - 1] ?? null;
}

function attemptToEnglishEntry(a: TestAttempt): ProfileEnglishTestEntry {
  return {
    test_id: a.test_id as ProfileEnglishTestId,
    status: a.status,
    overall: a.overall_score,
    test_date: a.test_date,
    test_expiry: a.expiry_date,
    sections: { ...a.sections },
    ielts_variant: (a.variant as IeltsVariant | null) ?? null,
    country: a.country,
    linked_documents: a.linked_documents,
  };
}

function attemptToAptitudeEntry(a: TestAttempt): ProfileAptitudeTestEntry {
  return {
    test_id: a.test_id as ProfileAptitudeTestId,
    status: a.status,
    overall: a.overall_score,
    test_date: a.test_date,
    sections: { ...a.sections },
    linked_documents: a.linked_documents,
  };
}

function attemptToLanguageEntry(a: TestAttempt): ProfileLanguageTestEntry {
  return {
    test_id: a.test_id as ProfileLanguageTestId,
    status: a.status,
    cefr_level: a.cefr_level,
    exam_type: a.exam_type,
    overall_score: a.overall_score,
    test_date: a.test_date,
    expiry_date: a.expiry_date,
    sections: { ...a.sections },
    linked_documents: a.linked_documents,
  };
}

/** Derive Phase C compat arrays from attempts (one entry per type = active attempt). */
export function deriveLegacyTestsFromAttempts(
  attempts: TestAttempt[],
  active_attempt_ids: Partial<Record<ProfileTestId, string>>,
): Pick<ProfileTests, "active_english_test_id" | "english" | "aptitude" | "language"> {
  const englishTypes = new Set(attempts.filter((a) => a.category === "english").map((a) => a.test_id));
  const aptitudeTypes = new Set(attempts.filter((a) => a.category === "aptitude").map((a) => a.test_id));
  const languageTypes = new Set(attempts.filter((a) => a.category === "language").map((a) => a.test_id));

  const english: ProfileEnglishTestEntry[] = [];
  for (const testId of ENGLISH_TEST_IDS) {
    if (!englishTypes.has(testId)) continue;
    const active = getActiveAttempt(attempts, active_attempt_ids, testId);
    if (active) english.push(attemptToEnglishEntry(active));
  }

  const aptitude: ProfileAptitudeTestEntry[] = [];
  for (const testId of aptitudeTypes) {
    const active = getActiveAttempt(attempts, active_attempt_ids, testId as ProfileTestId);
    if (active) aptitude.push(attemptToAptitudeEntry(active));
  }

  const language: ProfileLanguageTestEntry[] = [];
  for (const testId of languageTypes) {
    const active = getActiveAttempt(attempts, active_attempt_ids, testId as ProfileTestId);
    if (active) language.push(attemptToLanguageEntry(active));
  }

  let active_english_test_id: ProfileEnglishTestId | null = null;
  for (const testId of ENGLISH_TEST_IDS) {
    if (active_attempt_ids[testId]) {
      active_english_test_id = testId;
      break;
    }
  }
  if (!active_english_test_id && english.length) {
    active_english_test_id = english[0]!.test_id;
  }

  return { active_english_test_id, english, aptitude, language };
}

function legacyEntryHasData(
  kind: "english" | "aptitude" | "language",
  entry: ProfileEnglishTestEntry | ProfileAptitudeTestEntry | ProfileLanguageTestEntry,
): boolean {
  if (kind === "english") {
    const e = entry as ProfileEnglishTestEntry;
    return !!(e.status || e.overall || e.test_date || e.test_expiry || Object.keys(e.sections).length);
  }
  if (kind === "aptitude") {
    const a = entry as ProfileAptitudeTestEntry;
    return !!(a.status || a.overall || a.test_date || Object.keys(a.sections).length);
  }
  const l = entry as ProfileLanguageTestEntry;
  return !!(l.status || l.exam_type || l.overall_score || l.test_date || l.cefr_level);
}

/**
 * Merge Phase C UI edits into attempts without overwriting sibling attempts for the same test type.
 */
export function mergeLegacyEditsIntoAttempts(
  attempts: TestAttempt[],
  active_attempt_ids: Partial<Record<ProfileTestId, string>>,
  legacy: {
    active_english_test_id: ProfileEnglishTestId | null;
    english: ProfileEnglishTestEntry[];
    aptitude: ProfileAptitudeTestEntry[];
    language: ProfileLanguageTestEntry[];
  },
): { attempts: TestAttempt[]; active_attempt_ids: Partial<Record<ProfileTestId, string>> } {
  const nextAttempts = [...attempts];
  const nextActive = { ...active_attempt_ids };

  const upsertFromLegacy = (
    testId: ProfileTestId,
    category: ProfileTestCategory,
    patch: Partial<TestAttempt>,
  ) => {
    let attemptId = nextActive[testId];
    let idx = attemptId ? nextAttempts.findIndex((a) => a.attempt_id === attemptId) : -1;
    if (idx < 0) {
      attemptId = ensureAttemptId();
      idx = nextAttempts.length;
      nextAttempts.push({
        attempt_id: attemptId,
        test_id: testId,
        category,
        status: null,
        sections: {},
        linked_documents: [],
      });
      if (!nextActive[testId]) nextActive[testId] = attemptId;
    }
    const prev = nextAttempts[idx]!;
    nextAttempts[idx] = {
      ...prev,
      ...patch,
      attempt_id: prev.attempt_id,
      test_id: testId,
      category,
      sections: { ...prev.sections, ...(patch.sections ?? {}) },
      linked_documents: patch.linked_documents ?? prev.linked_documents,
    };
  };

  for (const e of legacy.english) {
    if (!legacyEntryHasData("english", e)) continue;
    upsertFromLegacy(e.test_id, "english", {
      status: e.status,
      variant: e.ielts_variant,
      test_date: e.test_date,
      expiry_date: e.test_expiry,
      overall_score: e.overall,
      sections: { ...e.sections },
      country: e.country,
      linked_documents: [...e.linked_documents],
    });
    if (legacy.active_english_test_id === e.test_id) {
      const id = nextActive[e.test_id] ?? nextAttempts.find((a) => a.test_id === e.test_id)?.attempt_id;
      if (id) nextActive[e.test_id] = id;
    }
  }

  for (const a of legacy.aptitude) {
    if (!legacyEntryHasData("aptitude", a)) continue;
    upsertFromLegacy(a.test_id, "aptitude", {
      status: a.status,
      test_date: a.test_date,
      overall_score: a.overall,
      sections: { ...a.sections },
      linked_documents: [...a.linked_documents],
    });
  }

  for (const l of legacy.language) {
    if (!legacyEntryHasData("language", l)) continue;
    upsertFromLegacy(l.test_id, "language", {
      status: l.status,
      exam_type: l.exam_type,
      cefr_level: l.cefr_level,
      overall_score: l.overall_score,
      test_date: l.test_date,
      expiry_date: l.expiry_date,
      sections: { ...l.sections },
      linked_documents: [...l.linked_documents],
    });
  }

  return {
    attempts: nextAttempts.filter(attemptHasData),
    active_attempt_ids: nextActive,
  };
}

export function attemptsToStoragePayload(
  attempts: TestAttempt[],
  active_attempt_ids: Partial<Record<ProfileTestId, string>>,
): { test_attempts: Record<string, unknown>[]; active_attempt_ids: Record<string, string> } {
  return {
    test_attempts: attempts.filter(attemptHasData).map(serializeAttempt),
    active_attempt_ids: Object.fromEntries(
      Object.entries(active_attempt_ids).filter(([, v]) => !!v),
    ) as Record<string, string>,
  };
}

/** Dual-write mirror for legacy triggers and profile sync. */
export function attemptsToLegacyMirror(
  attempts: TestAttempt[],
  active_attempt_ids: Partial<Record<ProfileTestId, string>>,
): Pick<
  ClientRow,
  | "english_test"
  | "english_test_status"
  | "english_overall"
  | "english_test_date"
  | "english_test_expiry"
  | "english_sections"
  | "other_tests"
  | "language_tests"
> {
  const legacy = deriveLegacyTestsFromAttempts(attempts, active_attempt_ids);
  const byTest: EnglishScoresByTest = {};

  for (const e of legacy.english) {
    const active = getActiveAttempt(attempts, active_attempt_ids, e.test_id);
    if (!active) continue;
    byTest[testIdToLegacyEnglish(e.test_id)] = {
      status: (active.status as EnglishScoresByTest[string]["status"]) ?? null,
      overall: active.overall_score,
      test_date: active.test_date,
      test_expiry: active.expiry_date,
      variant: active.variant ?? null,
      sections: { ...active.sections },
    };
  }

  const activeEnglish = legacy.active_english_test_id;
  const activeEntry = activeEnglish
    ? legacy.english.find((e) => e.test_id === activeEnglish)
    : legacy.english[0];
  const activeAttempt = activeEnglish
    ? getActiveAttempt(attempts, active_attempt_ids, activeEnglish)
    : null;

  const sections: Record<string, unknown> = {
    ...(activeAttempt?.sections ?? {}),
    [ENGLISH_SCORES_BY_TEST_KEY]: byTest,
  };
  if (activeAttempt?.variant && activeEnglish === "ielts") {
    sections.ielts_variant = activeAttempt.variant;
  }
  if (activeAttempt?.variant && activeEnglish === "pte") {
    sections.pte_variant = activeAttempt.variant;
  }
  if (activeAttempt?.variant && activeEnglish === "toefl") {
    sections.toefl_variant = activeAttempt.variant;
  }
  if (activeAttempt?.country) sections.test_country = activeAttempt.country;
  if (activeAttempt?.linked_documents.length) {
    sections.linked_documents = activeAttempt.linked_documents.map((d) => ({
      document_id: d.document_id,
      slot: d.slot,
      label: d.label,
      linked_at: d.linked_at,
    }));
  }
  for (const e of legacy.english) {
    const active = getActiveAttempt(attempts, active_attempt_ids, e.test_id);
    if (active?.linked_documents.length) {
      sections[`linked_documents_${testIdToLegacyEnglish(e.test_id)}`] = active.linked_documents.map((d) => ({
        document_id: d.document_id,
        slot: d.slot,
        label: d.label,
        linked_at: d.linked_at,
      }));
    }
  }

  const other_tests: NonNullable<ClientRow["other_tests"]> = attempts
    .filter((a) => a.category === "aptitude" && attemptHasData(a))
    .map((a) => ({
      type: testIdToLegacyAptitude(a.test_id as ProfileAptitudeTestId),
      score: a.overall_score ?? undefined,
      date: a.test_date ?? undefined,
      status: a.status ?? undefined,
      sections: { ...a.sections },
      ...(a.linked_documents.length
        ? {
            linked_documents: a.linked_documents.map((d) => ({
              document_id: d.document_id,
              slot: d.slot,
              label: d.label,
              linked_at: d.linked_at,
            })),
          }
        : {}),
    })) as NonNullable<ClientRow["other_tests"]>;

  const language_tests: Record<string, unknown> = {};
  for (const langKey of ["french", "german"] as ProfileLanguageTestId[]) {
    const active = getActiveAttempt(attempts, active_attempt_ids, langKey);
    if (!active || !attemptHasData(active)) continue;
    language_tests[langKey] = {
      status: active.status,
      cefr_level: active.cefr_level,
      exam_type: active.exam_type,
      overall_score: active.overall_score,
      test_date: active.test_date,
      expiry_date: active.expiry_date,
      sections: { ...active.sections },
      linked_documents: active.linked_documents.map((d) => ({
        document_id: d.document_id,
        slot: d.slot,
        label: d.label,
        linked_at: d.linked_at,
      })),
    };
  }

  return {
    english_test: activeEnglish ? testIdToLegacyEnglish(activeEnglish) : null,
    english_test_status: (activeEntry?.status as ClientRow["english_test_status"]) ?? null,
    english_overall: activeEntry?.overall ?? null,
    english_test_date: activeEntry?.test_date ?? null,
    english_test_expiry: activeEntry?.test_expiry ?? null,
    english_sections: sections,
    other_tests,
    language_tests,
  };
}

export function buildProfileTests(
  client: Partial<ClientRow>,
  refs: ClientDocumentRefRow[] = [],
): ProfileTests {
  const { attempts, active_attempt_ids } = parseTestAttemptsFromClient(client, refs);
  const legacy = deriveLegacyTestsFromAttempts(attempts, active_attempt_ids);
  return {
    attempts,
    active_attempt_ids,
    ...legacy,
  };
}

/** New empty attempt for + Add attempt UI. */
export function createEmptyAttempt(testId: ProfileTestId): TestAttempt {
  return {
    attempt_id: ensureAttemptId(),
    test_id: testId,
    category: testCategory(testId),
    status: "not_taken",
    sections: {},
    linked_documents: [],
  };
}

export function attemptsForTestId(
  attempts: readonly TestAttempt[],
  testId: ProfileTestId,
): TestAttempt[] {
  return attempts.filter((a) => a.test_id === testId);
}

export function sortAttemptsChronologically(attempts: readonly TestAttempt[]): TestAttempt[] {
  return [...attempts].sort((a, b) => {
    const da = a.test_date ?? "";
    const db = b.test_date ?? "";
    if (da && db) return db.localeCompare(da);
    if (db) return 1;
    if (da) return -1;
    return a.attempt_id.localeCompare(b.attempt_id);
  });
}

/** One-line summary for attempt list rows. */
export function formatAttemptSummary(attempt: TestAttempt): string {
  const parts: string[] = [];
  if (attempt.variant) parts.push(attempt.variant);
  if (attempt.status) parts.push(attempt.status.replace(/_/g, " "));
  if (attempt.test_date) parts.push(attempt.test_date);
  if (attempt.overall_score) parts.push(`Overall ${attempt.overall_score}`);
  else if (attempt.exam_type) parts.push(attempt.exam_type);
  return parts.join(" · ") || "New attempt";
}

export function defaultAttemptIdForTest(
  attempts: readonly TestAttempt[],
  activeIds: Readonly<Partial<Record<ProfileTestId, string>>>,
  testId: ProfileTestId,
): string | null {
  const active = activeIds[testId];
  if (active && attempts.some((a) => a.attempt_id === active)) return active;
  const forType = attemptsForTestId(attempts, testId);
  return forType[forType.length - 1]?.attempt_id ?? null;
}
