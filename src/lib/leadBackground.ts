import type { EducationEntry, ExperienceEntry, ClientRow } from "@/lib/clientRegistration";
import type { EducationExperienceValue } from "@/components/clients/registration/EducationExperienceFields";
import type { Lead, LeadDraft } from "@/lib/leads";
import {
  ENGLISH_SCORES_BY_TEST_KEY,
  hydrateScoresByTest,
  scoresForTest,
  sectionalScoresOnly,
  type EnglishScoresByTest,
  type EnglishTestScoreEntry,
} from "@/lib/englishTestScores";
import {
  absorbLegacyLanguageTests,
  EMPTY_LANGUAGE_TESTS,
  LANGUAGE_STATUS_LABELS,
  normalizeLanguageTests,
  summarizeLanguageTests,
  type LanguageTestBlock,
  type LanguageTestsValue,
} from "@/lib/languageTests";
import { legacyTestCatalogFromClient } from "@/lib/profile/normalizeProfile";
import {
  legacyEnglishToTestId,
  testIdToLegacyAptitude,
  testIdToLegacyEnglish,
  testLabel,
  type ProfileAptitudeTestId,
  type ProfileEnglishTestId,
  type ProfileTestId,
} from "@/lib/profile/profileTestCatalog";
import {
  formatActiveAttemptLine,
  listActiveAttemptsForSummary,
} from "@/lib/profile/testAttemptSummary";
import {
  attemptsToLegacyMirror,
  attemptsToStoragePayload,
  mergeLegacyEditsIntoAttempts,
  migrateLegacyToAttempts,
  parseTestAttemptsFromClient,
} from "@/lib/profile/testAttempts";
import type { ProfileTests, ProfileTestStatus, TestAttempt } from "@/lib/profile/types";
import { ENGLISH_SECTIONS, OTHER_TEST_SECTIONS } from "@/lib/testSections";

export type EnglishTestStatus = "not_taken" | "scheduled" | "taken" | "waived";

export interface LeadBackgroundState extends EducationExperienceValue {
  english_test_status?: EnglishTestStatus | null;
  language_tests?: LanguageTestsValue;
  /** Phase E5 — multi-attempt source of truth (mirrors clients.test_attempts). */
  attempts?: readonly TestAttempt[];
  active_attempt_ids?: Readonly<Partial<Record<ProfileTestId, string>>>;
}

export const ENGLISH_TEST_STATUS_LABELS: Record<EnglishTestStatus, string> = {
  not_taken: "Not taken",
  scheduled: "Scheduled",
  taken: "Taken",
  waived: "Waived",
};

export const EMPTY_LEAD_BACKGROUND: LeadBackgroundState = {
  education_history: [],
  english_test: null,
  english_test_status: null,
  english_overall: null,
  english_test_date: null,
  english_test_expiry: null,
  english_sections: {},
  other_tests: [],
  work_experience: [],
  language_tests: EMPTY_LANGUAGE_TESTS,
  attempts: [],
  active_attempt_ids: {},
};

function parseJsonArray<T>(raw: unknown): T[] {
  if (Array.isArray(raw)) return raw as T[];
  if (typeof raw === "string") {
    try {
      const parsed = JSON.parse(raw) as unknown;
      return Array.isArray(parsed) ? (parsed as T[]) : [];
    } catch {
      return [];
    }
  }
  return [];
}

export function educationEntryHasData(e: EducationEntry | undefined): boolean {
  if (!e) return false;
  return !!(
    e.level ||
    e.institution ||
    e.city ||
    e.country ||
    e.state_province ||
    e.year ||
    e.end_year ||
    e.start_year ||
    e.percentage_cgpa ||
    e.score ||
    e.specialization ||
    e.field_of_study ||
    e.major ||
    e.status ||
    e.grade_type ||
    e.backlogs ||
    e.notes
  );
}

export function experienceEntryHasData(e: ExperienceEntry | undefined): boolean {
  if (!e) return false;
  return !!(
    e.company ||
    e.role ||
    e.department ||
    e.employment_type ||
    e.city ||
    e.country ||
    e.state_province ||
    e.start_date ||
    e.description
  );
}

function mergeLastEducationIntoHistory(
  history: EducationEntry[],
  lastEducation?: string | null,
): EducationEntry[] {
  if (!lastEducation?.trim()) return history;
  const next = [...history];
  if (next.length === 0) return [{ level: lastEducation }];
  if (!next[0]?.level) next[0] = { ...next[0], level: lastEducation };
  return next;
}

/** Rebuild first education row from legacy client scalars when JSON history is empty. */
function educationHistoryFromClientScalars(lead: Partial<Lead>): EducationEntry[] {
  const level = lead.last_education?.trim();
  const institution = (lead as { institution_name?: string | null }).institution_name?.trim();
  const yearRaw = (lead as { year_of_passing?: string | null }).year_of_passing;
  const year = yearRaw != null ? formatPassingYearDisplay(String(yearRaw)) : undefined;
  const percentage = (lead as { percentage_cgpa?: string | null }).percentage_cgpa?.trim();
  if (!level && !institution && !year && !percentage) return [];
  return [
    {
      level: level || undefined,
      institution: institution || undefined,
      year: year ?? null,
      percentage_cgpa: percentage || undefined,
    },
  ];
}

function hydrateEnglishFromSections(
  lead: Partial<Lead>,
): Pick<
  LeadBackgroundState,
  "english_overall" | "english_test_date" | "english_test_expiry" | "english_sections" | "english_test_status"
> {
  const sections = (lead.english_sections ?? {}) as Record<string, unknown>;
  let byTest = hydrateScoresByTest({
    english_test: lead.english_test,
    english_overall: lead.english_overall,
    english_test_date: lead.english_test_date,
    english_test_expiry: lead.english_test_expiry,
    english_test_status: (lead.english_test_status as EnglishTestStatus | null | undefined) ?? null,
    english_sections: sections,
  });
  const active = scoresForTest(byTest, lead.english_test);
  const test = lead.english_test;
  if (test && test !== "None" && lead.english_test_status && !active.status) {
    byTest = {
      ...byTest,
      [test]: { ...active, status: lead.english_test_status as EnglishTestStatus },
    };
  }
  const activeEntry = scoresForTest(byTest, lead.english_test);
  const flatSections = sectionalScoresOnly(sections);
  const mergedSections: Record<string, unknown> = {
    ...flatSections,
    ...(Object.keys(byTest).length ? { [ENGLISH_SCORES_BY_TEST_KEY]: byTest } : {}),
  };
  return {
    english_test_status:
      (lead.english_test_status as EnglishTestStatus | null | undefined) ??
      (activeEntry.status as EnglishTestStatus | null | undefined) ??
      null,
    english_overall: lead.english_overall ?? activeEntry.overall ?? null,
    english_test_date: lead.english_test_date ?? activeEntry.test_date ?? null,
    english_test_expiry: lead.english_test_expiry ?? activeEntry.test_expiry ?? null,
    english_sections: mergedSections,
  };
}

export function leadToBackgroundState(lead: Partial<Lead>): LeadBackgroundState {
  const absorbed = absorbLegacyLanguageTests(
    normalizeLanguageTests(lead.language_tests),
    lead.other_tests,
  );
  let education_history = parseJsonArray<EducationEntry>(lead.education_history);
  if (!education_history.some(educationEntryHasData)) {
    education_history = educationHistoryFromClientScalars(lead);
  }
  education_history = mergeLastEducationIntoHistory(education_history, lead.last_education);
  const english = hydrateEnglishFromSections(lead);
  const base: LeadBackgroundState = {
    education_history,
    english_test: lead.english_test ?? null,
    ...english,
    other_tests: absorbed.other_tests,
    work_experience: parseJsonArray<ExperienceEntry>(lead.work_experience),
    language_tests: absorbed.language_tests,
  };
  const { attempts, active_attempt_ids } = parseTestAttemptsFromClient(
    lead as Partial<ClientRow>,
    [],
    { prehydratedBg: base },
  );
  return {
    ...base,
    attempts: [...attempts],
    active_attempt_ids: { ...active_attempt_ids },
  };
}

export function backgroundToClientShape(bg: LeadBackgroundState): Partial<ClientRow> {
  return {
    english_test: bg.english_test ?? undefined,
    english_test_status: bg.english_test_status ?? undefined,
    english_overall: bg.english_overall ?? undefined,
    english_test_date: bg.english_test_date ?? undefined,
    english_test_expiry: bg.english_test_expiry ?? undefined,
    english_sections: bg.english_sections,
    other_tests: bg.other_tests,
    language_tests: bg.language_tests,
  };
}

export function backgroundStateToLeadDraft(bg: LeadBackgroundState): LeadDraft {
  const clientShape = backgroundToClientShape(bg);
  const catalog = legacyTestCatalogFromClient(clientShape, []);
  const baseAttempts = bg.attempts?.length
    ? [...bg.attempts]
    : migrateLegacyToAttempts(clientShape, [], bg).attempts;
  const baseActive = { ...(bg.active_attempt_ids ?? {}) };
  const merged = mergeLegacyEditsIntoAttempts(baseAttempts, baseActive, catalog);
  const mirror = attemptsToLegacyMirror(merged.attempts, merged.active_attempt_ids);
  const storage = attemptsToStoragePayload(merged.attempts, merged.active_attempt_ids);

  return {
    education_history: bg.education_history ?? [],
    english_test: mirror.english_test ?? null,
    english_test_status: mirror.english_test_status ?? null,
    english_overall: mirror.english_overall ?? null,
    english_test_date: mirror.english_test_date ?? null,
    english_test_expiry: mirror.english_test_expiry ?? null,
    english_sections: mirror.english_sections ?? {},
    other_tests: mirror.other_tests ?? [],
    work_experience: bg.work_experience ?? [],
    language_tests: mirror.language_tests ?? EMPTY_LANGUAGE_TESTS,
    test_attempts: storage.test_attempts,
    active_attempt_ids: storage.active_attempt_ids,
  };
}

/** Keep §3 last_education dropdown aligned with first education entry. */
export function syncLastEducationFromBackground(
  bg: LeadBackgroundState,
  currentLastEducation?: string | null,
): { last_education?: string | null; last_education_other?: string | null } {
  const first = bg.education_history?.[0];
  if (first?.level) {
    return { last_education: first.level };
  }
  if (currentLastEducation) {
    return { last_education: currentLastEducation };
  }
  return {};
}

export function mergeBackgroundIntoEducationHistory(
  bg: LeadBackgroundState,
  lastEducation?: string | null,
): EducationEntry[] {
  const history = [...(bg.education_history ?? [])];
  if (lastEducation && !history[0]?.level) {
    if (history.length === 0) {
      history.push({ level: lastEducation });
    } else {
      history[0] = { ...history[0], level: lastEducation };
    }
  }
  return history;
}

const SECTION_LABEL: Record<string, string> = {
  listening: "L",
  reading: "R",
  writing: "W",
  speaking: "S",
  verbal: "Verbal",
  quant: "Quant",
  awa: "AWA",
  ir: "IR",
  math: "Math",
  ebrw: "EBRW",
};

export function englishTestEntryHasData(entry: EnglishTestScoreEntry | undefined): boolean {
  if (!entry) return false;
  if (entry.status === "scheduled" || entry.status === "taken" || entry.status === "waived") return true;
  if (entry.overall?.trim()) return true;
  if (entry.test_date || entry.test_expiry) return true;
  return Object.values(entry.sections ?? {}).some((v) => v?.trim());
}

export interface ScoreChip {
  label: string;
  value: string;
}

export interface EnglishTestDetailView {
  test: string;
  status?: string;
  overall?: string;
  testDate?: string;
  expiry?: string;
  sections: ScoreChip[];
}

export interface AcademicTestDetailView {
  type: string;
  overall?: string;
  testDate?: string;
  sections: ScoreChip[];
}

export interface LanguageTestDetailView {
  language: string;
  status?: string;
  cefr?: string;
  exam?: string;
  overall?: string;
  testDate?: string;
  expiry?: string;
  sections: ScoreChip[];
}

export interface EducationDetailView {
  title: string;
  details: string[];
  location?: string;
}

export interface ExperienceDetailView {
  title: string;
  dates?: string;
  location?: string;
  description?: string;
}

export interface BackgroundDetailView {
  english: EnglishTestDetailView[];
  academic: AcademicTestDetailView[];
  language: LanguageTestDetailView[];
  education: EducationDetailView[];
  experience: ExperienceDetailView[];
}

const ATTEMPT_STATUS_LABEL: Record<ProfileTestStatus, string> = {
  not_taken: "Not taken",
  planned: "Planned",
  scheduled: "Scheduled",
  result_awaited: "Result awaited",
  taken: "Taken",
  expired: "Expired",
  waived: "Waived",
};

function profileTestsFromBackground(bg: LeadBackgroundState): ProfileTests | null {
  if (!bg.attempts?.length) return null;
  return {
    attempts: bg.attempts,
    active_attempt_ids: bg.active_attempt_ids ?? {},
    active_english_test_id: legacyEnglishToTestId(bg.english_test),
    english: [],
    aptitude: [],
    language: [],
  };
}

function englishViewFromAttempt(attempt: TestAttempt): EnglishTestDetailView {
  const legacy = testIdToLegacyEnglish(attempt.test_id as ProfileEnglishTestId);
  return {
    test: testLabel(attempt.test_id),
    status: attempt.status ? ATTEMPT_STATUS_LABEL[attempt.status] : undefined,
    overall: attempt.overall_score?.trim() || undefined,
    testDate: attempt.test_date ?? undefined,
    expiry: attempt.expiry_date ?? undefined,
    sections: sectionChips(
      ENGLISH_SECTIONS[legacy] ?? Object.keys(attempt.sections ?? {}),
      attempt.sections,
    ),
  };
}

function academicViewFromAttempt(attempt: TestAttempt): AcademicTestDetailView {
  const legacyType = testIdToLegacyAptitude(attempt.test_id as ProfileAptitudeTestId);
  return {
    type: testLabel(attempt.test_id),
    overall: attempt.overall_score?.trim() || undefined,
    testDate: attempt.test_date ?? undefined,
    sections: sectionChips(
      OTHER_TEST_SECTIONS[legacyType] ?? Object.keys(attempt.sections ?? {}),
      attempt.sections,
    ),
  };
}

function languageViewFromAttempt(attempt: TestAttempt): LanguageTestDetailView {
  return {
    language: testLabel(attempt.test_id),
    status: attempt.status ? ATTEMPT_STATUS_LABEL[attempt.status] : undefined,
    cefr: attempt.cefr_level ?? undefined,
    exam: attempt.exam_type ?? undefined,
    overall: attempt.overall_score?.trim() || undefined,
    testDate: attempt.test_date ?? undefined,
    expiry: attempt.expiry_date ?? undefined,
    sections: sectionChips(
      attempt.exam_type ? (OTHER_TEST_SECTIONS[attempt.exam_type] ?? []) : [],
      attempt.sections,
    ),
  };
}

function activeAttemptDetailSlice(bg: LeadBackgroundState): Pick<
  BackgroundDetailView,
  "english" | "academic" | "language"
> | null {
  const tests = profileTestsFromBackground(bg);
  if (!tests) return null;
  const actives = listActiveAttemptsForSummary(tests);
  const english: EnglishTestDetailView[] = [];
  const academic: AcademicTestDetailView[] = [];
  const language: LanguageTestDetailView[] = [];
  for (const attempt of actives) {
    if (attempt.category === "english") english.push(englishViewFromAttempt(attempt));
    else if (attempt.category === "aptitude") academic.push(academicViewFromAttempt(attempt));
    else language.push(languageViewFromAttempt(attempt));
  }
  if (!english.length && !academic.length && !language.length) return null;
  return { english, academic, language };
}

function backgroundHasLegacyTestData(bg: LeadBackgroundState): boolean {
  const byTest = getEnglishTestsByType(bg);
  if (listEnglishTestNames(byTest).length > 0) return true;
  if ((bg.other_tests ?? []).some((t) => t.type)) return true;
  const lt = bg.language_tests ?? EMPTY_LANGUAGE_TESTS;
  if (languageBlockToView(lt.french).status || languageBlockToView(lt.german).status) return true;
  if (languageBlockToView(lt.french).cefr || languageBlockToView(lt.german).cefr) return true;
  return false;
}

function backgroundHasAttemptTestData(bg: LeadBackgroundState): boolean {
  return (bg.attempts ?? []).some((a) => !!a.status || !!a.overall_score || !!a.test_date);
}

/** After save, prefer local test payload when RPC did not persist attempts/legacy mirror yet. */
export function reconcileBackgroundAfterSave(
  local: LeadBackgroundState,
  fromDb: LeadBackgroundState,
): LeadBackgroundState {
  const localTests = backgroundHasAttemptTestData(local) || backgroundHasLegacyTestData(local);
  const dbTests = backgroundHasAttemptTestData(fromDb) || backgroundHasLegacyTestData(fromDb);
  if (!localTests || dbTests) return fromDb;
  return {
    ...fromDb,
    attempts: local.attempts,
    active_attempt_ids: local.active_attempt_ids,
    english_test: local.english_test,
    english_test_status: local.english_test_status,
    english_overall: local.english_overall,
    english_test_date: local.english_test_date,
    english_test_expiry: local.english_test_expiry,
    english_sections: local.english_sections,
    other_tests: local.other_tests,
    language_tests: local.language_tests,
    education_history:
      (local.education_history?.length ?? 0) > (fromDb.education_history?.length ?? 0)
        ? local.education_history
        : fromDb.education_history,
    work_experience:
      (local.work_experience?.length ?? 0) > (fromDb.work_experience?.length ?? 0)
        ? local.work_experience
        : fromDb.work_experience,
  };
}

function formatEnglishAttemptDetailLine(attempt: TestAttempt): string {
  const view = englishViewFromAttempt(attempt);
  const parts = [view.test];
  if (view.status) parts.push(view.status);
  if (view.overall) parts.push(`Overall ${view.overall}`);
  if (view.testDate) parts.push(`Test ${view.testDate}`);
  const sectionText = view.sections.map((s) => `${s.label} ${s.value}`).join(" · ");
  if (sectionText) parts.push(sectionText);
  return parts.join(" · ");
}

function formatAcademicAttemptDetailLine(attempt: TestAttempt): string {
  const view = academicViewFromAttempt(attempt);
  const parts = [view.type];
  if (view.overall) parts.push(`Overall ${view.overall}`);
  if (view.testDate) parts.push(`Test ${view.testDate}`);
  const sectionText = view.sections.map((s) => `${s.label} ${s.value}`).join(" · ");
  if (sectionText) parts.push(sectionText);
  return parts.join(" · ");
}

function formatLanguageAttemptDetailLine(attempt: TestAttempt): string {
  const view = languageViewFromAttempt(attempt);
  const parts = [view.language];
  if (view.status) parts.push(view.status);
  if (view.cefr) parts.push(view.cefr);
  if (view.exam) parts.push(view.exam);
  if (view.overall) parts.push(`Overall ${view.overall}`);
  const sectionText = view.sections.map((s) => `${s.label} ${s.value}`).join(" · ");
  if (sectionText) parts.push(sectionText);
  return parts.join(" · ");
}

function sectionChips(
  sectionKeys: string[],
  sections?: Record<string, string>,
): ScoreChip[] {
  return sectionKeys
    .map((k) => {
      const v = sections?.[k]?.trim();
      if (!v) return null;
      return { label: SECTION_LABEL[k] ?? k, value: v };
    })
    .filter(Boolean) as ScoreChip[];
}

export function getEnglishTestsByType(bg: LeadBackgroundState): EnglishScoresByTest {
  const fields = {
    english_test: bg.english_test,
    english_overall: bg.english_overall,
    english_test_date: bg.english_test_date,
    english_test_expiry: bg.english_test_expiry,
    english_sections: bg.english_sections as Record<string, unknown>,
  };
  let byTest = hydrateScoresByTest(fields);
  const test = bg.english_test;
  if (test && test !== "None") {
    const sections = sectionalScoresOnly(fields.english_sections);
    const hasActive =
      bg.english_overall ||
      bg.english_test_date ||
      bg.english_test_expiry ||
      Object.keys(sections).length > 0;
    if (hasActive) {
      const prev = byTest[test] ?? {};
      byTest = {
        ...byTest,
        [test]: {
          ...prev,
          status: bg.english_test_status ?? prev.status ?? null,
          overall: bg.english_overall ?? null,
          test_date: bg.english_test_date ?? null,
          test_expiry: bg.english_test_expiry ?? null,
          sections,
        },
      };
    }
  }
  return byTest;
}

export function formatEnglishTestDetail(
  testName: string,
  entry: EnglishTestScoreEntry,
  bg: LeadBackgroundState,
): string {
  const view = buildEnglishTestDetailView(testName, entry, bg);
  const parts = [view.test];
  if (view.status) parts.push(view.status);
  if (view.overall) parts.push(`Overall ${view.overall}`);
  if (view.testDate) parts.push(`Test ${view.testDate}`);
  if (view.expiry) parts.push(`Exp ${view.expiry}`);
  const sectionText = view.sections.map((s) => `${s.label} ${s.value}`).join(" · ");
  if (sectionText) parts.push(sectionText);
  return parts.join(" · ");
}

export function buildEnglishTestDetailView(
  testName: string,
  entry: EnglishTestScoreEntry,
  bg: LeadBackgroundState,
): EnglishTestDetailView {
  const isActive = testName === bg.english_test;
  const statusKey =
    entry.status ?? (isActive ? bg.english_test_status : null);
  return {
    test: testName,
    status: statusKey ? ENGLISH_TEST_STATUS_LABELS[statusKey as EnglishTestStatus] : undefined,
    overall: entry.overall?.trim() || undefined,
    testDate: entry.test_date ?? undefined,
    expiry: entry.test_expiry ?? undefined,
    sections: sectionChips(
      ENGLISH_SECTIONS[testName] ?? Object.keys(entry.sections ?? {}),
      entry.sections,
    ),
  };
}

function formatSectionScores(
  sectionKeys: string[],
  sections?: Record<string, string>,
): string {
  return sectionChips(sectionKeys, sections)
    .map((s) => `${s.label} ${s.value}`)
    .join(" · ");
}

function listEnglishTestNames(byTest: EnglishScoresByTest): string[] {
  const order = ["IELTS", "PTE", "TOEFL", "CELPIP", "Duolingo"];
  return [
    ...order.filter((t) => englishTestEntryHasData(byTest[t])),
    ...Object.keys(byTest).filter((t) => !order.includes(t) && englishTestEntryHasData(byTest[t])),
  ];
}

export function listEnglishTestDetails(bg: LeadBackgroundState): string[] {
  const tests = profileTestsFromBackground(bg);
  if (tests) {
    return listActiveAttemptsForSummary(tests)
      .filter((a) => a.category === "english")
      .map(formatEnglishAttemptDetailLine);
  }
  const byTest = getEnglishTestsByType(bg);
  const names = listEnglishTestNames(byTest);
  if (names.length) {
    return names.map((t) => formatEnglishTestDetail(t, byTest[t]!, bg));
  }
  if (bg.english_test_status === "waived") return ["Waived"];
  if (bg.english_test_status === "not_taken") return ["Not taken"];
  return [];
}

export function buildBackgroundDetailView(bg: LeadBackgroundState): BackgroundDetailView {
  const attemptSlice = activeAttemptDetailSlice(bg);
  if (attemptSlice) {
    return {
      ...attemptSlice,
      education: (bg.education_history ?? [])
        .filter(educationEntryHasData)
        .map(buildEducationDetailView),
      experience: (bg.work_experience ?? [])
        .filter(experienceEntryHasData)
        .map(buildExperienceDetailView),
    };
  }

  const byTest = getEnglishTestsByType(bg);
  const englishNames = listEnglishTestNames(byTest);
  let english = englishNames.map((t) => buildEnglishTestDetailView(t, byTest[t]!, bg));

  if (!english.length && bg.english_test_status === "waived") {
    english = [{ test: "English", status: "Waived", sections: [] }];
  } else if (!english.length && bg.english_test_status === "not_taken") {
    english = [{ test: "English", status: "Not taken", sections: [] }];
  }

  const lt = bg.language_tests ?? EMPTY_LANGUAGE_TESTS;
  const language: LanguageTestDetailView[] = [
    { language: "French", ...languageBlockToView(lt.french) },
    { language: "German", ...languageBlockToView(lt.german) },
  ].filter((b) => b.status || b.cefr || b.exam || b.overall || b.sections.length > 0);

  return {
    english,
    academic: (bg.other_tests ?? [])
      .filter((t) => t.type)
      .map((t) => ({
        type: t.type!,
        overall: t.score?.trim() || undefined,
        testDate: t.date ?? undefined,
        sections: sectionChips(
          OTHER_TEST_SECTIONS[t.type!] ?? Object.keys(t.sections ?? {}),
          t.sections,
        ),
      })),
    language,
    education: (bg.education_history ?? [])
      .filter(educationEntryHasData)
      .map(buildEducationDetailView),
    experience: (bg.work_experience ?? [])
      .filter(experienceEntryHasData)
      .map(buildExperienceDetailView),
  };
}

function languageBlockToView(
  block?: LanguageTestBlock | null,
): Omit<LanguageTestDetailView, "language"> {
  if (!block) return { sections: [] };
  return {
    status: block.status ? (LANGUAGE_STATUS_LABELS[block.status] ?? block.status) : undefined,
    cefr: block.cefr_level ?? undefined,
    exam: block.exam_type ?? undefined,
    overall: block.overall_score?.trim() || undefined,
    testDate: block.test_date ?? undefined,
    expiry: block.expiry_date ?? undefined,
    sections: sectionChips(
      block.exam_type ? (OTHER_TEST_SECTIONS[block.exam_type] ?? []) : [],
      block.sections,
    ),
  };
}

export function countBackgroundItems(bg: LeadBackgroundState): {
  english: number;
  academic: number;
  language: number;
  education: number;
  experience: number;
} {
  const view = buildBackgroundDetailView(bg);
  return {
    english: view.english.length,
    academic: view.academic.length,
    language: view.language.length,
    education: view.education.length,
    experience: view.experience.length,
  };
}

export function listAcademicTestDetails(bg: LeadBackgroundState): string[] {
  const tests = profileTestsFromBackground(bg);
  if (tests) {
    return listActiveAttemptsForSummary(tests)
      .filter((a) => a.category === "aptitude")
      .map(formatAcademicAttemptDetailLine);
  }
  return (bg.other_tests ?? [])
    .filter((t) => t.type)
    .map((t) => {
      const parts = [t.type!];
      if (t.score?.trim()) parts.push(`Overall ${t.score.trim()}`);
      if (t.date) parts.push(`Test ${t.date}`);
      const sectionText = formatSectionScores(
        OTHER_TEST_SECTIONS[t.type!] ?? Object.keys(t.sections ?? {}),
        t.sections,
      );
      if (sectionText) parts.push(sectionText);
      return parts.join(" · ");
    });
}

export function formatLanguageBlockDetail(label: string, block?: LanguageTestBlock | null): string | null {
  if (!block?.status && !block?.cefr_level && !block?.exam_type && !block?.overall_score) return null;
  const parts = [label];
  if (block.status) parts.push(LANGUAGE_STATUS_LABELS[block.status] ?? block.status);
  if (block.cefr_level) parts.push(block.cefr_level);
  if (block.exam_type) parts.push(block.exam_type);
  if (block.overall_score?.trim()) parts.push(`Overall ${block.overall_score.trim()}`);
  if (block.test_date) parts.push(`Test ${block.test_date}`);
  if (block.expiry_date) parts.push(`Exp ${block.expiry_date}`);
  const sectionKey = block.exam_type ? (OTHER_TEST_SECTIONS[block.exam_type] ?? []) : [];
  const sectionText = formatSectionScores(sectionKey, block.sections);
  if (sectionText) parts.push(sectionText);
  return parts.join(" · ");
}

export function listLanguageTestDetails(bg: LeadBackgroundState): string[] {
  const tests = profileTestsFromBackground(bg);
  if (tests) {
    return listActiveAttemptsForSummary(tests)
      .filter((a) => a.category === "language")
      .map(formatLanguageAttemptDetailLine);
  }
  const lt = bg.language_tests ?? EMPTY_LANGUAGE_TESTS;
  return [
    formatLanguageBlockDetail("French", lt.french),
    formatLanguageBlockDetail("German", lt.german),
  ].filter(Boolean) as string[];
}

export interface BackgroundDetailSections {
  english: string[];
  academic: string[];
  language: string[];
  education: string[];
  experience: string[];
}

export function buildBackgroundDetailSections(bg: LeadBackgroundState): BackgroundDetailSections {
  const view = buildBackgroundDetailView(bg);
  return {
    english: listEnglishTestDetails(bg),
    academic: listAcademicTestDetails(bg),
    language: listLanguageTestDetails(bg),
    education: view.education.map((e) => [e.title, ...e.details, e.location].filter(Boolean).join(" · ")),
    experience: view.experience.map((e) =>
      [e.title, e.dates, e.location, e.description].filter(Boolean).join(" · "),
    ),
  };
}

export function summarizeEnglishTests(bg: LeadBackgroundState): string {
  const tests = profileTestsFromBackground(bg);
  if (tests) {
    const lines = listActiveAttemptsForSummary(tests).map(formatActiveAttemptLine);
    if (lines.length) return lines.join(", ");
  }

  const view = buildBackgroundDetailView(bg);
  const parts = view.english.map((t) => {
    const score = t.overall ? ` ${t.overall}` : "";
    return `${t.test}${score}`;
  });
  view.academic.forEach((t) => {
    const score = t.overall ? ` ${t.overall}` : "";
    parts.push(`${t.type}${score}`);
  });
  if (!parts.length) {
    if (bg.english_test_status === "waived") return "Waived";
    if (bg.english_test_status === "not_taken") return "Not taken";
    return "Not added";
  }
  return parts.join(", ");
}

/** @deprecated use summarizeEnglishTests */
export const summarizeTests = summarizeEnglishTests;

export { summarizeLanguageTests };

export function formatPassingYearDisplay(year?: string | null): string | undefined {
  if (!year?.trim()) return undefined;
  const v = year.trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(v)) return v.slice(0, 4);
  if (/^\d{4}$/.test(v)) return v;
  const digits = v.replace(/\D/g, "");
  return digits.length >= 4 ? digits.slice(0, 4) : v;
}

/** clients.year_of_passing is a date column — store mid-year from a year string. */
export function yearOfPassingForDb(year?: string | null): string | null {
  const display = formatPassingYearDisplay(year);
  return display && /^\d{4}$/.test(display) ? `${display}-06-30` : null;
}

export function formatEducationLocation(e: EducationEntry): string | undefined {
  const parts = [e.city, e.state_province, e.country].filter(Boolean);
  return parts.length ? parts.join(", ") : undefined;
}

function formatEducationLevelTitle(level?: string | null): string {
  if (!level?.trim()) return "Qualification";
  return level
    .trim()
    .replace(/_/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

export function buildEducationDetailView(e: EducationEntry): EducationDetailView {
  const details: string[] = [];
  if (e.institution) details.push(e.institution);
  const fieldOfStudy = e.field_of_study ?? e.specialization;
  if (fieldOfStudy) details.push(fieldOfStudy);
  if (e.major) details.push(`Major: ${e.major}`);
  const startYear = formatPassingYearDisplay(e.start_year);
  const endYear = formatPassingYearDisplay(e.end_year ?? e.year);
  if (startYear && endYear) {
    details.push(`${startYear}–${endYear}`);
  } else if (startYear) {
    details.push(`Start ${startYear}`);
  } else if (endYear) {
    details.push(`Passed ${endYear}`);
  }
  if (e.status) details.push(`Status: ${e.status}`);
  if (e.grade_type) details.push(`Grade: ${e.grade_type}`);
  const rawScore = (e.score ?? e.percentage_cgpa ?? "").trim();
  if (rawScore) {
    details.push(/\d/.test(rawScore) && !rawScore.includes("%") ? `${rawScore}% / CGPA` : rawScore);
  }
  if (e.backlogs) details.push(`Backlogs: ${e.backlogs}`);
  if (e.notes?.trim()) details.push(e.notes.trim());
  return {
    title: formatEducationLevelTitle(e.level ?? e.qualification_type),
    details,
    location: formatEducationLocation(e),
  };
}

export function buildExperienceDetailView(e: ExperienceEntry): ExperienceDetailView {
  const dates = [e.start_date, e.currently_working ? "Present" : e.end_date].filter(Boolean).join(" – ");
  return {
    title: [e.role, e.company].filter(Boolean).join(" · ") || "Experience",
    dates: dates || undefined,
    location: formatEducationLocation(e),
    description: e.description?.trim() || undefined,
  };
}

export function formatEducationEntrySummary(e: EducationEntry): string {
  const view = buildEducationDetailView(e);
  return [view.title, ...view.details, view.location].filter(Boolean).join(" · ");
}

export function formatExperienceEntrySummary(e: ExperienceEntry): string {
  const dates = [e.start_date, e.currently_working ? "Present" : e.end_date].filter(Boolean).join(" – ");
  const main = [[e.role, e.company].filter(Boolean).join(" · "), e.city, e.state_province, e.country, dates]
    .filter(Boolean)
    .join(" · ");
  if (e.description?.trim()) {
    return main ? `${main} · ${e.description.trim()}` : e.description.trim();
  }
  return main;
}

export function summarizeEducation(bg: LeadBackgroundState): string {
  const rows = (bg.education_history ?? []).filter(educationEntryHasData);
  if (!rows.length) return "Not added";
  if (rows.length === 1) return formatEducationEntrySummary(rows[0]!) || "1 entry";
  return `${rows.length} entries`;
}

export function summarizeExperience(bg: LeadBackgroundState): string {
  const rows = (bg.work_experience ?? []).filter(experienceEntryHasData);
  if (!rows.length) return "Not added";
  if (rows.length === 1) return formatExperienceEntrySummary(rows[0]!) || "1 entry";
  return `${rows.length} entries`;
}

export function hasBackgroundData(bg: LeadBackgroundState): boolean {
  const view = buildBackgroundDetailView(bg);
  return (
    view.english.length > 0 ||
    view.academic.length > 0 ||
    view.language.length > 0 ||
    view.education.length > 0 ||
    view.experience.length > 0
  );
}
