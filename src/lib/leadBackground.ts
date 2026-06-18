import type { EducationEntry, ExperienceEntry } from "@/lib/clientRegistration";
import type { EducationExperienceValue } from "@/components/clients/registration/EducationExperienceFields";
import type { Lead, LeadDraft } from "@/lib/leads";
import {
  ENGLISH_SCORES_BY_TEST_KEY,
  hydrateScoresByTest,
  scoresForTest,
  sectionalScoresOnly,
} from "@/lib/englishTestScores";
import {
  absorbLegacyLanguageTests,
  EMPTY_LANGUAGE_TESTS,
  normalizeLanguageTests,
  summarizeLanguageTests,
  type LanguageTestsValue,
} from "@/lib/languageTests";

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

export function summarizeEnglishTests(bg: LeadBackgroundState): string {
  const status = bg.english_test_status;
  const test = bg.english_test && bg.english_test !== "None" ? bg.english_test : null;
  const score = bg.english_overall?.trim() ? ` ${bg.english_overall.trim()}` : "";

  if (status === "waived") return "Waived";
  if (status === "not_taken") return "Not taken";
  if (status === "scheduled") {
    const label = test ?? "English";
    return score ? `Scheduled · ${label}${score}` : `Scheduled · ${label}`;
  }
  if (test) {
    if (score) return `${test}${score}`;
    if (status === "taken") return `${test} (taken)`;
    return test;
  }
  const academicCount = bg.other_tests?.filter((t) => t.type)?.length ?? 0;
  if (academicCount) return `${academicCount} academic`;
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
  return [[e.role, e.company].filter(Boolean).join(" · "), e.city, e.state_province, e.country, dates]
    .filter(Boolean)
    .join(" · ");
}

export function summarizeEducation(bg: LeadBackgroundState): string {
  const rows = (bg.education_history ?? []).filter(educationEntryHasData);
  if (!rows.length) return "Not added";
  if (rows.length === 1) {
    const detail = formatEducationEntrySummary(rows[0]!);
    return detail || "1 qualification";
  }
  return `${rows.length} qualifications`;
}

export function summarizeExperience(bg: LeadBackgroundState): string {
  const rows = (bg.work_experience ?? []).filter(experienceEntryHasData);
  if (!rows.length) return "Not added";
  if (rows.length === 1) {
    const detail = formatExperienceEntrySummary(rows[0]!);
    return detail || "1 job";
  }
  return `${rows.length} jobs`;
}

export function hasBackgroundData(bg: LeadBackgroundState): boolean {
  return (
    summarizeEnglishTests(bg) !== "Not added" ||
    summarizeLanguageTests(bg.language_tests ?? EMPTY_LANGUAGE_TESTS) !== "Not added" ||
    (bg.education_history ?? []).some(educationEntryHasData) ||
    (bg.work_experience ?? []).some(experienceEntryHasData)
  );
}
