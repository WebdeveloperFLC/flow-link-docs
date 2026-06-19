import { testLabel } from "@/lib/profile/profileTestCatalog";
import { getTestsCompletionBuckets, attemptCompletionWeight } from "@/lib/profile/testAttemptCompletion";
import { listActiveAttemptsForSummary } from "@/lib/profile/testAttemptSummary";
import type {
  ProfileCompletionResult,
  ProfileCompletionSection,
  ProfileEducationRecord,
  ProfileExperienceRecord,
  ProfileSectionId,
  ProfileViewModel,
} from "@/lib/profile/types";

function filledStr(v: string | null | undefined): boolean {
  return !!(v && String(v).trim());
}

function percent(filled: number, total: number): number {
  if (total <= 0) return 0;
  return Math.round((filled / total) * 100);
}

const IDENTITY_KEYS: (keyof ProfileViewModel["identity"])[] = [
  "date_of_birth",
  "gender",
  "nationality",
  "place_of_birth",
  "marital_status",
  "spouse_name",
  "passport_number",
  "passport_country",
  "passport_issue_date",
  "passport_expiry",
];

const CONTACT_KEYS: (keyof ProfileViewModel["contact"])[] = [
  "phone_primary",
  "phone_alt",
  "email_primary",
  "email_alt",
  "address_line1",
  "address_city",
  "address_state",
  "address_country",
  "address_postal",
  "emergency_contact_name",
  "emergency_contact_phone",
];

function countIdentity(vm: ProfileViewModel): ProfileCompletionSection {
  const total = IDENTITY_KEYS.length;
  const filled = IDENTITY_KEYS.filter((k) => filledStr(vm.identity[k])).length;
  return { section: "identity", filled, total, percent: percent(filled, total) };
}

function countContact(vm: ProfileViewModel): ProfileCompletionSection {
  const total = CONTACT_KEYS.length;
  const filled = CONTACT_KEYS.filter((k) => filledStr(vm.contact[k])).length;
  return { section: "contact", filled, total, percent: percent(filled, total) };
}

function countTests(vm: ProfileViewModel): ProfileCompletionSection {
  const buckets = getTestsCompletionBuckets(vm.tests);
  const weights = [buckets.english, buckets.aptitude, buckets.language].map((a) =>
    a ? attemptCompletionWeight(a) : 0,
  );
  const filled = weights.reduce((sum, w) => sum + w, 0);
  const total = 3;
  return { section: "tests", filled, total, percent: percent(filled, total) };
}

function educationRecordScore(e: ProfileEducationRecord): number {
  const keys: (keyof ProfileEducationRecord)[] = [
    "qualification_type",
    "institution_name",
    "country",
    "end_year",
    "score",
  ];
  const filled = keys.filter((k) => filledStr(e[k] as string | null)).length;
  return filled / keys.length;
}

function countEducation(vm: ProfileViewModel): ProfileCompletionSection {
  if (vm.education.length === 0) {
    return { section: "education", filled: 0, total: 1, percent: 0 };
  }
  const scores = vm.education.map(educationRecordScore);
  const avg = scores.reduce((a, b) => a + b, 0) / scores.length;
  return { section: "education", filled: Math.round(avg * 5), total: 5, percent: Math.round(avg * 100) };
}

function experienceRecordScore(e: ProfileExperienceRecord): number {
  const keys: (keyof ProfileExperienceRecord)[] = ["company", "designation", "start_date", "country"];
  const filled = keys.filter((k) => filledStr(e[k] as string | null)).length;
  return filled / keys.length;
}

function countExperience(vm: ProfileViewModel): ProfileCompletionSection {
  if (vm.experience.length === 0) {
    return { section: "experience", filled: 0, total: 1, percent: 0 };
  }
  const scores = vm.experience.map(experienceRecordScore);
  const avg = scores.reduce((a, b) => a + b, 0) / scores.length;
  return { section: "experience", filled: Math.round(avg * 4), total: 4, percent: Math.round(avg * 100) };
}

function missingRequiredDocuments(vm: ProfileViewModel): string[] {
  const missing: string[] = [];

  for (const attempt of listActiveAttemptsForSummary(vm.tests)) {
    if (attempt.status === "taken" && attempt.linked_documents.length === 0) {
      missing.push(`${testLabel(attempt.test_id)}: score report or TRF`);
    }
  }
  for (const edu of vm.education) {
    const hasTranscript = edu.linked_documents.some((d) => d.slot === "transcript" || d.slot === "degree_certificate");
    if (edu.qualification_type && !hasTranscript) {
      missing.push(`Education ${edu.institution_name ?? edu.id}: transcript or degree`);
    }
  }
  for (const exp of vm.experience) {
    const hasLetter = exp.linked_documents.some((d) => d.slot === "experience_letter");
    if (exp.company && !hasLetter) {
      missing.push(`Experience ${exp.company}: experience letter`);
    }
  }

  return missing.slice(0, 10);
}

/**
 * Pure completion engine — all profile badges derive from ProfileViewModel only.
 */
export function computeCompletion(vm: ProfileViewModel): ProfileCompletionResult {
  const sections = [
    countIdentity(vm),
    countContact(vm),
    countTests(vm),
    countEducation(vm),
    countExperience(vm),
  ];
  const filled = sections.reduce((s, x) => s + x.filled, 0);
  const total = sections.reduce((s, x) => s + x.total, 0);
  return {
    overall: { filled, total, percent: percent(filled, total) },
    sections,
    missingRequiredDocuments: missingRequiredDocuments(vm),
  };
}

export function completionForSection(
  vm: ProfileViewModel,
  section: ProfileSectionId,
): ProfileCompletionSection {
  return computeCompletion(vm).sections.find((s) => s.section === section)!;
}
