/** Maps service_library IDs to full Settle Abroad assessment (assessment_questions + CRS/Chancenkarte). */

export type SettleAbroadMapping = {
  country: "Canada" | "Germany";
  goal: string;
};

/**
 * Services using the comprehensive Settle Abroad questionnaire.
 * BOWP and other operational checklists stay on service_eligibility_questions.
 */
const LIBRARY_SETTLE_ABROAD: Record<string, SettleAbroadMapping> = {
  // Canada — full CRS / pathway assessment (all Canada questions load in AssessmentRun)
  "b2000001-0001-4000-8000-000000000011": { country: "Canada", goal: "visitor_visa" },
  "b2000001-0001-4000-8000-000000000012": { country: "Canada", goal: "family_sponsorship" },
  "b2000001-0001-4000-8000-000000000013": { country: "Canada", goal: "permanent_residence" },
  "b2000001-0001-4000-8000-000000000014": { country: "Canada", goal: "work_permit" },
  "b2000001-0001-4000-8000-000000000015": { country: "Canada", goal: "work_permit" },
  "b2000001-0001-4000-8000-000000000016": { country: "Canada", goal: "visitor_visa" },
  // 000000000017 BOWP → short service_eligibility checklist only

  // Germany — Chancenkarte engine + pathway-specific questions
  "b2000001-0001-4000-8000-000000000051": { country: "Germany", goal: "de_ausbildung" },
  "b2000001-0001-4000-8000-000000000052": { country: "Germany", goal: "de_chancenkarte" },
  "b2000001-0001-4000-8000-000000000053": { country: "Germany", goal: "de_chancenkarte" },
  "b2000001-0001-4000-8000-000000000054": { country: "Germany", goal: "de_chancenkarte" },
  "b2000001-0001-4000-8000-000000000055": { country: "Germany", goal: "de_job_seeker" },
  "b2000001-0001-4000-8000-000000000056": { country: "Germany", goal: "de_skilled_worker" },
  "b2000001-0001-4000-8000-000000000057": { country: "Germany", goal: "de_blue_card" },
  "b2000001-0001-4000-8000-000000000058": { country: "Germany", goal: "de_ausbildung" },
};

export function resolveSettleAbroadMapping(libraryId: string): SettleAbroadMapping | null {
  return LIBRARY_SETTLE_ABROAD[libraryId] ?? null;
}

export function usesSettleAbroadAssessment(libraryId: string): boolean {
  return libraryId in LIBRARY_SETTLE_ABROAD;
}

export function assessmentRunPath(sessionId: string, libraryId?: string | null): string {
  if (!libraryId) return `/assessment/run/${sessionId}`;
  return `/assessment/run/${sessionId}?from=service-library&library_id=${libraryId}`;
}
