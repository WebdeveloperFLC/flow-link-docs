/** Lightweight counselling summaries for Course Finder — no website duplication. */

export type CfCourseLike = {
  name: string;
  study_level: string;
  field_of_study: string;
  duration_months: number | null;
  tuition_fee: number | null;
  currency: string | null;
  application_fee?: number | null;
  intake_months: string[];
  intake_year: number | null;
  ielts_overall: number | null;
  pte_score: number | null;
  toefl_score: number | null;
  gpa_min: number | null;
  pgwp_eligible: boolean;
  coop_available: boolean;
  internship_included: boolean;
  scholarship_available: boolean;
  scholarship_info: string | null;
  description: string | null;
  career_outcomes: string | null;
  pr_visa_notes: string | null;
  apply_url: string | null;
  employability_score: number | null;
  visa_success_indicator: string | null;
};

export function formatDurationMonths(m: number | null): string {
  if (!m) return "—";
  if (m % 12 === 0) return `${m / 12} ${m / 12 === 1 ? "year" : "years"}`;
  return `${m} months`;
}

export function tuitionSummary(c: CfCourseLike): string {
  if (c.tuition_fee == null) return "See official tuition page";
  if (c.tuition_fee === 0) return "Tuition-free";
  return `${c.currency ?? ""} ${c.tuition_fee.toLocaleString()}`.trim();
}

export function admissionSummary(c: CfCourseLike): string {
  const parts: string[] = [];
  if (c.ielts_overall != null) parts.push(`IELTS ${c.ielts_overall}`);
  if (c.pte_score != null) parts.push(`PTE ${c.pte_score}`);
  if (c.toefl_score != null) parts.push(`TOEFL ${c.toefl_score}`);
  if (c.gpa_min != null) parts.push(`GPA ${c.gpa_min}`);
  if (c.application_fee != null) parts.push(`App fee ${c.application_fee}`);
  return parts.length ? parts.join(" · ") : "See official admission page";
}

export function intakeSummary(c: CfCourseLike): string {
  const months = c.intake_months?.length ? c.intake_months.join(", ") : "—";
  return c.intake_year ? `${months} (${c.intake_year})` : months;
}

export function aiSummaryFromCourse(c: CfCourseLike): string | null {
  const hint = c.description?.trim() || c.career_outcomes?.trim() || c.scholarship_info?.trim();
  if (!hint) return null;
  return hint.length > 220 ? `${hint.slice(0, 217)}…` : hint;
}

export function counsellorRatingLabel(c: CfCourseLike): string | null {
  if (c.employability_score != null) return `${Math.round(c.employability_score)}/100 employability`;
  return null;
}

export function visaTrendLabel(c: CfCourseLike): string | null {
  if (!c.visa_success_indicator) return null;
  const v = c.visa_success_indicator.toLowerCase();
  if (v === "high") return "High visa success trend";
  if (v === "medium") return "Moderate visa success trend";
  if (v === "low") return "Lower visa success trend";
  return `Visa trend: ${c.visa_success_indicator}`;
}
