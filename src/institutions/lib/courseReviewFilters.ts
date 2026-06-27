import type { UpiCourseStaging } from "../types/upi";
import { campusNamesFromRow } from "./courseDedup";
import { normalizeInstitutionName } from "./programSheetImport";

export type InstitutionSearchOption = {
  id: string;
  name: string;
  country_name?: string | null;
};

/** Escape user text for PostgREST ilike patterns. */
export function escapeIlikePattern(value: string): string {
  return value.replace(/\\/g, "\\\\").replace(/%/g, "\\%").replace(/_/g, "\\_");
}

/** Match institutions whose names contain every search token. */
export function resolveInstitutionIdsFromSearch(
  institutions: InstitutionSearchOption[],
  searchText: string,
): string[] {
  const tokens = searchText.trim().toLowerCase().split(/\s+/).filter(Boolean);
  if (!tokens.length) return [];
  return institutions
    .filter((i) => {
      const hay = i.name.toLowerCase();
      return tokens.every((t) => hay.includes(t));
    })
    .map((i) => i.id);
}

/** Institution filter: FK match or metadata institute_name match (import mismatch tolerance). */
export function rowMatchesInstitution(
  row: UpiCourseStaging,
  institutionId: string,
  institutionName: string | null | undefined,
): boolean {
  if (row.institution_id === institutionId) return true;
  const metaName = String((row.metadata as Record<string, unknown> | null)?.institute_name ?? "").trim();
  if (!metaName || !institutionName?.trim()) return false;
  return normalizeInstitutionName(metaName) === normalizeInstitutionName(institutionName);
}

export function mergeStagingRowsById(...lists: UpiCourseStaging[][]): UpiCourseStaging[] {
  const map = new Map<string, UpiCourseStaging>();
  for (const list of lists) {
    for (const row of list) {
      if (row?.id) map.set(row.id, row);
    }
  }
  return [...map.values()];
}

export function buildStagingSearchHaystack(
  row: UpiCourseStaging,
  ctx: {
    instName: (id: string | null) => string;
    instCountry: (id: string | null) => string | null;
    levelName: (id: string | null) => string;
    deliveryMode: (row: UpiCourseStaging) => string;
  },
): string {
  const meta = (row.metadata ?? {}) as Record<string, unknown>;
  const parts: (string | number | null | undefined)[] = [
    row.course_title,
    row.course_description,
    campusNamesFromRow(row).join(" "),
    row.campus_name,
    row.city,
    row.state_province,
    row.country_name,
    row.currency,
    row.gpa_requirement,
    row.source_url,
    row.source_identifier,
    row.review_status,
    row.ielts_overall,
    row.toefl_overall,
    row.pte_overall,
    row.duolingo_overall,
    ctx.deliveryMode(row),
    Array.isArray(row.intake_months) ? row.intake_months.join(" ") : "",
    row.is_pgwp_eligible === true ? "yes pgwp eligible" : row.is_pgwp_eligible === false ? "no pgwp" : "",
    ctx.instName(row.institution_id),
    ctx.instCountry(row.institution_id),
    ctx.levelName(row.program_level_id),
    String(meta.institute_name ?? ""),
    String(meta.program_level ?? ""),
    String(meta.field_of_study ?? ""),
    String(meta.study_area ?? ""),
    String(meta.discipline_area ?? ""),
    String(meta.program_code ?? ""),
    String(meta.program_type ?? ""),
    String(meta.program_delivery_mode ?? ""),
    String(meta.competitiveness ?? ""),
  ];
  try {
    parts.push(JSON.stringify(meta));
  } catch {
    /* ignore */
  }
  return parts
    .filter((v) => v !== null && v !== undefined && v !== "")
    .join(" ")
    .toLowerCase();
}

export function rowMatchesSearchTokens(row: UpiCourseStaging, tokens: string[], haystack: string): boolean {
  if (!tokens.length) return true;
  return tokens.every((t) => haystack.includes(t));
}
