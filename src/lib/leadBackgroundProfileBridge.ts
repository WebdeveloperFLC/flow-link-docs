import type { EducationEntry, ExperienceEntry } from "@/lib/clientRegistration";
import {
  backgroundToClientShape,
  formatPassingYearDisplay,
  type LeadBackgroundState,
} from "@/lib/leadBackground";
import { ensureEducationId, ensureExperienceId } from "@/lib/profile/profileRecordIds";
import { legacyEnglishToTestId } from "@/lib/profile/profileTestCatalog";
import {
  attemptsToLegacyMirror,
  buildProfileTests,
  deriveLegacyTestsFromAttempts,
} from "@/lib/profile/testAttempts";
import type {
  ProfileEducationRecord,
  ProfileExperienceRecord,
  ProfileTests,
  TestAttempt,
} from "@/lib/profile/types";

export function testsStateFromLeadBackground(bg: LeadBackgroundState): ProfileTests {
  if (bg.attempts?.length) {
    const legacy = deriveLegacyTestsFromAttempts(bg.attempts, bg.active_attempt_ids ?? {});
    return {
      attempts: [...bg.attempts],
      active_attempt_ids: { ...(bg.active_attempt_ids ?? {}) },
      ...legacy,
    };
  }
  return buildProfileTests(backgroundToClientShape(bg), []);
}

export function applyTestsPatchToLeadBackground(
  bg: LeadBackgroundState,
  patch: {
    attempts: TestAttempt[];
    active_attempt_ids: Partial<Record<string, string>>;
    active_english_test_id?: ProfileTests["active_english_test_id"];
  },
): LeadBackgroundState {
  const active_english_test_id =
    patch.active_english_test_id ?? legacyEnglishToTestId(bg.english_test);
  const mirror = attemptsToLegacyMirror(patch.attempts, patch.active_attempt_ids);
  return {
    ...bg,
    attempts: patch.attempts,
    active_attempt_ids: patch.active_attempt_ids,
    english_test: mirror.english_test ?? null,
    english_test_status: (mirror.english_test_status as LeadBackgroundState["english_test_status"]) ?? null,
    english_overall: mirror.english_overall ?? null,
    english_test_date: mirror.english_test_date ?? null,
    english_test_expiry: mirror.english_test_expiry ?? null,
    english_sections: mirror.english_sections ?? {},
    other_tests: mirror.other_tests ?? [],
    language_tests: mirror.language_tests ?? bg.language_tests,
  };
}

export function educationRecordsFromLeadBackground(bg: LeadBackgroundState): ProfileEducationRecord[] {
  return (bg.education_history ?? []).map((raw, index) => {
    const e = raw as EducationEntry & { id?: string };
    const id = ensureEducationId(e.id ?? `lead_${index}`);
    return {
      id,
      qualification_type: e.level?.trim() || null,
      institution_name: e.institution?.trim() || null,
      country: e.country?.trim() || null,
      state_province: e.state_province?.trim() || null,
      city: e.city?.trim() || null,
      field_of_study: e.specialization?.trim() || null,
      major: null,
      start_year: null,
      end_year: formatPassingYearDisplay(e.year) ?? null,
      status: null,
      grade_type: null,
      score: e.percentage_cgpa?.trim() || null,
      backlogs: null,
      notes: null,
      linked_documents: [],
    };
  });
}

export function experienceRecordsFromLeadBackground(bg: LeadBackgroundState): ProfileExperienceRecord[] {
  return (bg.work_experience ?? []).map((raw, index) => {
    const e = raw as ExperienceEntry & { id?: string };
    const id = ensureExperienceId(e.id ?? `lead_${index}`);
    return {
      id,
      company: e.company?.trim() || null,
      country: e.country?.trim() || null,
      state_province: e.state_province?.trim() || null,
      city: e.city?.trim() || null,
      designation: e.role?.trim() || null,
      department: null,
      employment_type: null,
      start_date: e.start_date ?? null,
      end_date: e.end_date ?? null,
      currently_working: !!e.currently_working,
      notes: e.description?.trim() || null,
      linked_documents: [],
    };
  });
}

export function applyEducationRecordsToLeadBackground(
  bg: LeadBackgroundState,
  records: readonly ProfileEducationRecord[],
): LeadBackgroundState {
  const education_history: EducationEntry[] = records.map((r) => ({
    id: r.id,
    level: r.qualification_type ?? undefined,
    institution: r.institution_name ?? undefined,
    country: r.country ?? undefined,
    state_province: r.state_province ?? undefined,
    city: r.city ?? undefined,
    specialization: r.field_of_study ?? r.major ?? undefined,
    year: r.end_year ?? undefined,
    percentage_cgpa: r.score ?? undefined,
  }));
  return { ...bg, education_history };
}

export function applyExperienceRecordsToLeadBackground(
  bg: LeadBackgroundState,
  records: readonly ProfileExperienceRecord[],
): LeadBackgroundState {
  const work_experience: ExperienceEntry[] = records.map((r) => ({
    id: r.id,
    company: r.company ?? undefined,
    role: r.designation ?? undefined,
    country: r.country ?? undefined,
    state_province: r.state_province ?? undefined,
    city: r.city ?? undefined,
    start_date: r.start_date ?? undefined,
    end_date: r.end_date ?? undefined,
    currently_working: r.currently_working,
    description: r.notes ?? undefined,
  }));
  return { ...bg, work_experience };
}
