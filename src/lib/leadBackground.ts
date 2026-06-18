import type { EducationEntry, ExperienceEntry } from "@/lib/clientRegistration";
import type { EducationExperienceValue } from "@/components/clients/registration/EducationExperienceFields";
import type { Lead, LeadDraft } from "@/lib/leads";

export type EnglishTestStatus = "not_taken" | "scheduled" | "taken" | "waived";

export interface LeadBackgroundState extends EducationExperienceValue {
  english_test_status?: EnglishTestStatus | null;
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
};

export function leadToBackgroundState(lead: Partial<Lead>): LeadBackgroundState {
  return {
    education_history: (lead.education_history as EducationEntry[] | undefined) ?? [],
    english_test: lead.english_test ?? null,
    english_test_status: (lead.english_test_status as EnglishTestStatus | null | undefined) ?? null,
    english_overall: lead.english_overall ?? null,
    english_test_date: lead.english_test_date ?? null,
    english_test_expiry: lead.english_test_expiry ?? null,
    english_sections: (lead.english_sections as Record<string, string> | undefined) ?? {},
    other_tests: lead.other_tests ?? [],
    work_experience: (lead.work_experience as ExperienceEntry[] | undefined) ?? [],
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

export function summarizeTests(bg: LeadBackgroundState): string {
  const status = bg.english_test_status;
  if (status === "waived") return "Waived";
  if (status === "not_taken") return "Not taken";
  if (status === "scheduled") {
    const test = bg.english_test && bg.english_test !== "None" ? bg.english_test : "English test";
    return `Scheduled · ${test}`;
  }
  if (bg.english_test && bg.english_test !== "None") {
    if (bg.english_overall) return `${bg.english_test} ${bg.english_overall}`;
    if (status === "taken") return `${bg.english_test} (taken)`;
    return bg.english_test;
  }
  const otherCount = bg.other_tests?.filter((t) => t.type)?.length ?? 0;
  if (otherCount) return `${otherCount} other test${otherCount === 1 ? "" : "s"}`;
  return "Not added";
}

export function summarizeEducation(bg: LeadBackgroundState): string {
  const count = bg.education_history?.filter((e) => e.level || e.institution)?.length ?? 0;
  if (!count) return "Not added";
  return count === 1 ? "1 qualification" : `${count} qualifications`;
}

export function summarizeExperience(bg: LeadBackgroundState): string {
  const count = bg.work_experience?.filter((e) => e.company || e.role)?.length ?? 0;
  if (!count) return "Not added";
  return count === 1 ? "1 job" : `${count} jobs`;
}

export function hasBackgroundData(bg: LeadBackgroundState): boolean {
  return (
    summarizeTests(bg) !== "Not added" ||
    summarizeEducation(bg) !== "Not added" ||
    summarizeExperience(bg) !== "Not added"
  );
}
