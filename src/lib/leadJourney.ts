/** Shared options for warm/hot lead student journey fields. */

export const SPONSOR_OPTIONS = [
  { value: "self", label: "Self" },
  { value: "parents", label: "Parents" },
  { value: "spouse", label: "Spouse" },
  { value: "sibling", label: "Sibling" },
  { value: "relative", label: "Relative" },
  { value: "employer", label: "Employer" },
  { value: "education_loan", label: "Education Loan" },
  { value: "scholarship", label: "Scholarship" },
  { value: "other", label: "Other" },
] as const;

export const START_TIMELINE_OPTIONS = [
  { value: "immediately", label: "Immediately" },
  { value: "within_1_month", label: "Within 1 Month" },
  { value: "within_3_months", label: "Within 3 Months" },
  { value: "within_6_months", label: "Within 6 Months" },
  { value: "within_this_year", label: "Within This Year" },
  { value: "next_year", label: "Next Year" },
  { value: "not_decided", label: "Not Decided Yet" },
] as const;

export const HAS_BUDGET_OPTIONS = [
  { value: "yes", label: "Yes" },
  { value: "no", label: "No" },
  { value: "not_sure", label: "Not Sure" },
] as const;

export type SponsorValue = (typeof SPONSOR_OPTIONS)[number]["value"];
export type StartTimelineValue = (typeof START_TIMELINE_OPTIONS)[number]["value"];
export type HasBudgetValue = (typeof HAS_BUDGET_OPTIONS)[number]["value"];

export interface LeadJourneyFields {
  sponsor?: string | null;
  sponsor_other?: string | null;
  start_timeline?: string | null;
  has_budget?: string | null;
  budget_currency?: string | null;
  budget_min?: number | null;
  budget_max?: number | null;
}

export function sponsorLabel(value: string | null | undefined): string {
  if (!value) return "—";
  return SPONSOR_OPTIONS.find((o) => o.value === value)?.label ?? value;
}

export function startTimelineLabel(value: string | null | undefined): string {
  if (!value) return "—";
  return START_TIMELINE_OPTIONS.find((o) => o.value === value)?.label ?? value;
}

export function hasBudgetLabel(value: string | null | undefined): string {
  if (!value) return "—";
  return HAS_BUDGET_OPTIONS.find((o) => o.value === value)?.label ?? value;
}
