import { statusLabel } from "@/lib/profile/testAttemptFormRules";
import { testLabel } from "@/lib/profile/profileTestCatalog";
import type { ProfileEducationRecord, ProfileExperienceRecord, TestAttempt } from "@/lib/profile/types";

function normalizeYearInput(year?: string | null): string {
  if (!year?.trim()) return "";
  const v = year.trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(v)) return v.slice(0, 4);
  return v.replace(/\D/g, "").slice(0, 4);
}

export function formatAttemptCardHeadline(attempt: TestAttempt, attemptIndex: number): string {
  return `${testLabel(attempt.test_id)} Attempt ${attemptIndex + 1}`;
}

export function formatAttemptCardPreview(attempt: TestAttempt): string {
  const parts: string[] = [];
  if (attempt.variant) parts.push(attempt.variant);
  if (attempt.ielts_test_type) parts.push(attempt.ielts_test_type);
  if (attempt.status) parts.push(statusLabel(attempt.status));
  if (attempt.test_date) parts.push(`Test Date: ${attempt.test_date}`);
  if (attempt.overall_score?.trim()) parts.push(`Overall: ${attempt.overall_score.trim()}`);
  else if (attempt.exam_type?.trim()) parts.push(attempt.exam_type.trim());
  return parts.join(" · ") || "New attempt";
}

export function educationCardPreview(
  record: ProfileEducationRecord,
  qualificationLabel?: string | null,
): string {
  const parts: string[] = [];
  const level = (qualificationLabel ?? record.qualification_type)?.trim();
  if (level) parts.push(level);
  if (record.institution_name?.trim()) parts.push(record.institution_name.trim());
  if (record.country?.trim()) parts.push(record.country.trim());
  const years = [normalizeYearInput(record.start_year), normalizeYearInput(record.end_year)]
    .filter(Boolean)
    .join(" – ");
  if (years) parts.push(years);
  if (record.score?.trim()) {
    const grade = record.grade_type?.trim();
    parts.push(grade ? `${grade} ${record.score.trim()}` : record.score.trim());
  }
  return parts.join(" · ") || "New education record";
}

export function experienceCardPreview(record: ProfileExperienceRecord): string {
  const parts: string[] = [];
  if (record.company?.trim()) parts.push(record.company.trim());
  if (record.designation?.trim()) parts.push(record.designation.trim());
  if (record.employment_type?.trim()) parts.push(record.employment_type.trim());
  const dates = record.currently_working
    ? [record.start_date, "Present"].filter(Boolean).join(" – ")
    : [record.start_date, record.end_date].filter(Boolean).join(" – ");
  if (dates) parts.push(dates);
  return parts.join(" · ") || "New experience record";
}
