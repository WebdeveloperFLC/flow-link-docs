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

function formatSectionScores(
  sectionKeys: string[],
  sections?: Record<string, string>,
): string {
  if (!sections) return "";
  const parts = sectionKeys
    .map((k) => {
      const v = sections[k];
      if (!v?.trim()) return null;
      const label = SECTION_LABEL[k] ?? k;
      return `${label} ${v}`;
    })
    .filter(Boolean);
  return parts.join(" · ");
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
  const parts: string[] = [testName];
  const isActive = testName === bg.english_test;
  if (isActive && bg.english_test_status) {
    parts.push(ENGLISH_TEST_STATUS_LABELS[bg.english_test_status]);
  }
  if (entry.overall?.trim()) parts.push(`Overall ${entry.overall.trim()}`);
  if (entry.test_date) parts.push(`Test ${entry.test_date}`);
  if (entry.test_expiry) parts.push(`Exp ${entry.test_expiry}`);
  const sectionText = formatSectionScores(
    ENGLISH_SECTIONS[testName] ?? Object.keys(entry.sections ?? {}),
    entry.sections,
  );
  if (sectionText) parts.push(sectionText);
  return parts.join(" · ");
}

export function listEnglishTestDetails(bg: LeadBackgroundState): string[] {
  const byTest = getEnglishTestsByType(bg);
  const order = ["IELTS", "PTE", "TOEFL", "CELPIP", "Duolingo"];
  const names = [
    ...order.filter((t) => byTest[t]),
    ...Object.keys(byTest).filter((t) => !order.includes(t)),
  ];
  if (names.length) {
    return names.map((t) => formatEnglishTestDetail(t, byTest[t]!, bg));
  }
  if (bg.english_test_status === "waived") return ["Waived"];
  if (bg.english_test_status === "not_taken") return ["Not taken"];
  return [];
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
  const lines = listEnglishTestDetails(bg);
  const academic = listAcademicTestDetails(bg);
  if (lines.length && academic.length) {
    return `${lines.join(" | ")} | ${academic.join(" | ")}`;
  }
  if (lines.length) return lines.join(" | ");
  if (academic.length) return academic.join(" | ");
  return "Not added";
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
  return rows.map(formatEducationEntrySummary).filter(Boolean).join("\n") || "Not added";
}

export function summarizeExperience(bg: LeadBackgroundState): string {
  const rows = (bg.work_experience ?? []).filter(experienceEntryHasData);
  if (!rows.length) return "Not added";
  return rows.map(formatExperienceEntrySummary).filter(Boolean).join("\n") || "Not added";
}

export function hasBackgroundData(bg: LeadBackgroundState): boolean {
  const sections = buildBackgroundDetailSections(bg);
  return (
    sections.english.length > 0 ||
    sections.academic.length > 0 ||
    sections.language.length > 0 ||
    sections.education.length > 0 ||
    sections.experience.length > 0
  );
}
