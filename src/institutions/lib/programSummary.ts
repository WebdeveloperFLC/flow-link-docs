import type { UpiCourseStaging } from "../types/upi";
import { campusNamesFromRow } from "./courseDedup";
import type { ProgramGroupSummary } from "./programGroups";
import type { OfficialResourceLinks } from "../types/officialResources";
import { officialResourcesFromStagingRow } from "./officialResources";

export type ProgramSummary = {
  programName: string;
  qualification: string;
  studyArea: string;
  durationLabel: string;
  pgwp: boolean | null;
  coop: boolean | null;
  internship: boolean | null;
  tuitionSummary: string;
  admissionSummary: string;
  intakeSummary: string;
  aiSummary: string | null;
  futureLinkNotes: string | null;
  officialResources: OfficialResourceLinks;
  offeringCount: number;
};

export type AvailabilityOffering = {
  id: string;
  campuses: string[];
  intakes: string[];
  deliveryMode: string;
  notes: string | null;
  reviewStatus: string;
};

function metaStr(row: UpiCourseStaging, key: string): string | null {
  const v = (row.metadata as Record<string, unknown> | null)?.[key];
  return v != null && String(v).trim() ? String(v).trim() : null;
}

function formatDuration(row: UpiCourseStaging): string {
  if (row.duration_value == null) return "—";
  return `${row.duration_value} ${row.duration_unit ?? "months"}`;
}

function tuitionSummaryFromRows(rows: UpiCourseStaging[]): string {
  const fees = rows
    .map((r) => (r.tuition_fee != null ? `${r.tuition_fee} ${r.currency ?? ""}`.trim() : null))
    .filter(Boolean) as string[];
  if (!fees.length) return "See official tuition page";
  const uniq = [...new Set(fees)];
  return uniq.length === 1 ? uniq[0] : `${uniq[0]} (+${uniq.length - 1} variants)`;
}

function admissionSummaryFromRow(row: UpiCourseStaging): string {
  const parts: string[] = [];
  if (row.ielts_overall != null) parts.push(`IELTS ${row.ielts_overall}`);
  if (row.pte_overall != null) parts.push(`PTE ${row.pte_overall}`);
  if (row.toefl_overall != null) parts.push(`TOEFL ${row.toefl_overall}`);
  if (row.gpa_requirement) parts.push(`GPA ${row.gpa_requirement}`);
  if (row.application_fee != null) parts.push(`App fee ${row.application_fee} ${row.currency ?? ""}`.trim());
  return parts.length ? parts.join(" · ") : "See official admission page";
}

function intakeSummaryFromRows(rows: UpiCourseStaging[]): string {
  const set = new Set<string>();
  for (const r of rows) {
    if (Array.isArray(r.intake_months)) r.intake_months.forEach((m) => set.add(String(m)));
  }
  const list = [...set].sort();
  return list.length ? list.join(", ") : "—";
}

export function buildProgramSummaryFromOfferings(
  rows: UpiCourseStaging[],
  group: ProgramGroupSummary | null,
  levelName: (id: string | null) => string,
): ProgramSummary | null {
  if (!rows.length) return null;
  const primary = rows.reduce((best, r) => {
    if (!best) return r;
    if (r.review_status === "published" && best.review_status !== "published") return r;
    return (r.course_title?.length ?? 0) > (best.course_title?.length ?? 0) ? r : best;
  }, rows[0]);

  const studyArea =
    metaStr(primary, "study_area") ??
    metaStr(primary, "field_of_study") ??
    metaStr(primary, "discipline_area") ??
    "—";

  const resources = officialResourcesFromStagingRow(primary);
  for (const r of rows) {
    const extra = officialResourcesFromStagingRow(r);
    resources.programUrl ??= extra.programUrl;
    resources.admissionUrl ??= extra.admissionUrl;
    resources.tuitionUrl ??= extra.tuitionUrl;
    resources.scholarshipUrl ??= extra.scholarshipUrl;
    resources.brochureUrl ??= extra.brochureUrl;
  }

  const coop = rows.some((r) => r.is_coop === true) ? true : rows.every((r) => r.is_coop === false) ? false : null;
  const pgwp = rows.some((r) => r.is_pgwp_eligible === true)
    ? true
    : rows.every((r) => r.is_pgwp_eligible === false)
      ? false
      : null;

  return {
    programName: group?.title ?? primary.course_title ?? "Untitled program",
    qualification: levelName(primary.program_level_id),
    studyArea,
    durationLabel: formatDuration(primary),
    pgwp,
    coop,
    internship: rows.some((r) => metaStr(r, "internship_included") === "true" || r.is_coop === true) || null,
    tuitionSummary: tuitionSummaryFromRows(rows),
    admissionSummary: admissionSummaryFromRow(primary),
    intakeSummary: intakeSummaryFromRows(rows),
    aiSummary: metaStr(primary, "ai_summary") ?? primary.review_notes,
    futureLinkNotes: primary.review_notes,
    officialResources: resources,
    offeringCount: rows.length,
  };
}

export function buildAvailabilityFromOfferings(rows: UpiCourseStaging[]): AvailabilityOffering[] {
  return rows.map((r) => {
    const m = r.metadata as Record<string, unknown> | null;
    const delivery =
      String(m?.program_delivery_mode ?? (r.is_online ? "Online" : r.is_part_time ? "Part-time" : "On-campus")).trim() ||
      "—";
    return {
      id: r.id,
      campuses: campusNamesFromRow(r),
      intakes: Array.isArray(r.intake_months) ? r.intake_months.map(String) : [],
      deliveryMode: delivery,
      notes: r.review_notes,
      reviewStatus: r.review_status,
    };
  });
}
