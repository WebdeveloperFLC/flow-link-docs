import type { EducationEntry, ExperienceEntry } from "@/lib/clientRegistration";
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
import { ENGLISH_SECTIONS, OTHER_TEST_SECTIONS } from "@/lib/testSections";

export type EnglishTestStatus = "not_taken" | "scheduled" | "taken" | "waived";

export interface LeadBackgroundState extends EducationExperienceValue {
  english_test_status?: EnglishTestStatus | null;
  language_tests?: LanguageTestsValue;
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
    e.percentage_cgpa ||
    e.specialization
  );
}

export function experienceEntryHasData(e: ExperienceEntry | undefined): boolean {
  if (!e) return false;
  return !!(e.company || e.role || e.city || e.country || e.state_province || e.start_date || e.description);
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

function hydrateEnglishFromSections(
  lead: Partial<Lead>,
): Pick<
  LeadBackgroundState,
  "english_overall" | "english_test_date" | "english_test_expiry" | "english_sections"
> {
  const sections = (lead.english_sections ?? {}) as Record<string, unknown>;
  const byTest = hydrateScoresByTest({
    english_test: lead.english_test,
    english_overall: lead.english_overall,
    english_test_date: lead.english_test_date,
    english_test_expiry: lead.english_test_expiry,
    english_sections: sections,
  });
  const active = scoresForTest(byTest, lead.english_test);
  const flatSections = sectionalScoresOnly(sections);
  const mergedSections: Record<string, unknown> = {
    ...flatSections,
    ...(Object.keys(byTest).length ? { [ENGLISH_SCORES_BY_TEST_KEY]: byTest } : {}),
  };
  return {
    english_overall: lead.english_overall ?? active.overall ?? null,
    english_test_date: lead.english_test_date ?? active.test_date ?? null,
    english_test_expiry: lead.english_test_expiry ?? active.test_expiry ?? null,
    english_sections: mergedSections,
  };
}

export function leadToBackgroundState(lead: Partial<Lead>): LeadBackgroundState {
  const absorbed = absorbLegacyLanguageTests(
    normalizeLanguageTests(lead.language_tests),
    lead.other_tests,
  );
  const education_history = mergeLastEducationIntoHistory(
    parseJsonArray<EducationEntry>(lead.education_history),
    lead.last_education,
  );
  const english = hydrateEnglishFromSections(lead);
  return {
    education_history,
    english_test: lead.english_test ?? null,
    english_test_status: (lead.english_test_status as EnglishTestStatus | null | undefined) ?? null,
    ...english,
    other_tests: absorbed.other_tests,
    work_experience: parseJsonArray<ExperienceEntry>(lead.work_experience),
    language_tests: absorbed.language_tests,
  };
}

export function backgroundStateToLeadDraft(bg: LeadBackgroundState): LeadDraft {
  return {
    education_history: bg.education_history ?? [],
    english_test: bg.english_test ?? null,
    english_test_status: bg.english_test_status ?? null,
    english_overall: bg.english_overall ?? null,
    english_test_date: bg.english_test_date ?? null,
    english_test_expiry: bg.english_test_expiry ?? null,
    english_sections: bg.english_sections ?? {},
    other_tests: bg.other_tests ?? [],
    work_experience: bg.work_experience ?? [],
    language_tests: bg.language_tests ?? EMPTY_LANGUAGE_TESTS,
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

function englishTestEntryHasData(entry: EnglishTestScoreEntry | undefined): boolean {
  if (!entry) return false;
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

export interface BackgroundDetailView {
  english: EnglishTestDetailView[];
  academic: AcademicTestDetailView[];
  language: LanguageTestDetailView[];
  education: string[];
  experience: string[];
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
      byTest = {
        ...byTest,
        [test]: {
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
  return {
    test: testName,
    status: isActive && bg.english_test_status
      ? ENGLISH_TEST_STATUS_LABELS[bg.english_test_status]
      : undefined,
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
      .map(formatEducationEntrySummary)
      .filter(Boolean),
    experience: (bg.work_experience ?? [])
      .filter(experienceEntryHasData)
      .map(formatExperienceEntrySummary)
      .filter(Boolean),
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
  return {
    english: listEnglishTestDetails(bg),
    academic: listAcademicTestDetails(bg),
    language: listLanguageTestDetails(bg),
    education: (bg.education_history ?? [])
      .filter(educationEntryHasData)
      .map(formatEducationEntrySummary)
      .filter(Boolean),
    experience: (bg.work_experience ?? [])
      .filter(experienceEntryHasData)
      .map(formatExperienceEntrySummary)
      .filter(Boolean),
  };
}

export function summarizeEnglishTests(bg: LeadBackgroundState): string {
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

export function formatEducationEntrySummary(e: EducationEntry): string {
  return [e.level, e.institution, e.specialization, e.city, e.state_province, e.country, e.year, e.percentage_cgpa]
    .filter(Boolean)
    .join(" · ");
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
