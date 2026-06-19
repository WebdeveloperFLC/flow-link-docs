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

function str(v: unknown): string | null {
  if (v == null) return null;
  const s = String(v).trim();
  return s.length ? s : null;
}

function opt(v: string | null | undefined): string | undefined {
  const s = v?.trim();
  return s ? s : undefined;
}

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
    const e = raw as EducationEntry;
    const id = ensureEducationId(e.id ?? `lead_${index}`);
    const endYear =
      str(e.end_year) ?? (e.year != null ? formatPassingYearDisplay(e.year) : null);
    return {
      id,
      qualification_type: str(e.qualification_type) ?? str(e.level),
      institution_name: str(e.institution_name) ?? str(e.institution),
      country: str(e.country),
      state_province: str(e.state_province),
      city: str(e.city),
      field_of_study: str(e.field_of_study) ?? str(e.specialization),
      major: str(e.major),
      start_year: str(e.start_year),
      end_year: endYear,
      status: str(e.status),
      grade_type: str(e.grade_type),
      score: str(e.score) ?? str(e.percentage_cgpa),
      backlogs: str(e.backlogs),
      notes: str(e.notes),
      linked_documents: [],
    };
  });
}

export function experienceRecordsFromLeadBackground(bg: LeadBackgroundState): ProfileExperienceRecord[] {
  return (bg.work_experience ?? []).map((raw, index) => {
    const e = raw as ExperienceEntry & { id?: string; designation?: string };
    const id = ensureExperienceId(e.id ?? `lead_${index}`);
    return {
      id,
      company: e.company?.trim() || null,
      country: e.country?.trim() || null,
      state_province: e.state_province?.trim() || null,
      city: e.city?.trim() || null,
      designation: e.role?.trim() || e.designation?.trim() || null,
      department: e.department?.trim() || null,
      employment_type: e.employment_type?.trim() || null,
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
  const education_history: EducationEntry[] = records.map((r) => {
    const level = opt(r.qualification_type);
    const institution = opt(r.institution_name);
    const fieldOfStudy = opt(r.field_of_study);
    const major = opt(r.major);
    const endYear = opt(r.end_year);
    const score = opt(r.score);
    const entry: EducationEntry = { id: r.id };
    if (level) {
      entry.level = level;
      entry.qualification_type = level;
    }
    if (institution) {
      entry.institution = institution;
      entry.institution_name = institution;
    }
    if (opt(r.country)) entry.country = opt(r.country);
    if (opt(r.state_province)) entry.state_province = opt(r.state_province);
    if (opt(r.city)) entry.city = opt(r.city);
    if (fieldOfStudy) {
      entry.specialization = fieldOfStudy;
      entry.field_of_study = fieldOfStudy;
    }
    if (major) entry.major = major;
    if (opt(r.start_year)) entry.start_year = opt(r.start_year);
    if (endYear) {
      entry.end_year = endYear;
      entry.year = endYear;
    }
    if (opt(r.status)) entry.status = opt(r.status);
    if (opt(r.grade_type)) entry.grade_type = opt(r.grade_type);
    if (score) {
      entry.score = score;
      entry.percentage_cgpa = score;
    }
    if (opt(r.backlogs)) entry.backlogs = opt(r.backlogs);
    if (opt(r.notes)) entry.notes = opt(r.notes);
    return entry;
  });
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
    department: r.department ?? undefined,
    employment_type: r.employment_type ?? undefined,
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
