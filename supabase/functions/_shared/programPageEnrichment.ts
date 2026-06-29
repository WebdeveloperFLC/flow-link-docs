import type { ParsedProgramPageFields } from "./programPageParser.ts";
import { OFFICIAL_PROGRAM_PAGE_CONFIDENCE } from "./programPageParser.ts";

export type EnrichmentMergeMode = "empty_only" | "refresh";

export { OFFICIAL_PROGRAM_PAGE_CONFIDENCE };

type StagingLike = Record<string, unknown>;

function isEmptyValue(value: unknown): boolean {
  if (value == null) return true;
  if (typeof value === "string") return value.trim() === "";
  if (Array.isArray(value)) return value.length === 0;
  return false;
}

function metaRecord(row: StagingLike): Record<string, unknown> {
  return (row.metadata as Record<string, unknown> | null) ?? {};
}

export function mergeOfficialPageFields<T extends StagingLike>(
  existing: T,
  parsed: ParsedProgramPageFields,
  mode: EnrichmentMergeMode,
  syncedAt: string,
): T {
  const next = { ...existing } as T;
  const meta = { ...metaRecord(next) };

  const setColumn = (key: string, value: unknown) => {
    if (value == null || value === "") return;
    const current = next[key];
    if (mode === "empty_only" && !isEmptyValue(current)) return;
    next[key] = value;
  };

  setColumn("campus_name", parsed.campus_name);
  setColumn("duration_value", parsed.duration_value);
  setColumn("duration_unit", parsed.duration_unit);
  setColumn("tuition_fee", parsed.tuition_fee);
  setColumn("currency", parsed.currency);
  setColumn("application_fee", parsed.application_fee);
  setColumn("ielts_overall", parsed.ielts_overall);
  setColumn("ielts_min_component", parsed.ielts_min_component);
  setColumn("pte_overall", parsed.pte_overall);
  setColumn("toefl_overall", parsed.toefl_overall);
  setColumn("duolingo_overall", parsed.duolingo_overall);
  setColumn("is_coop", parsed.is_coop);
  setColumn("is_pgwp_eligible", parsed.is_pgwp_eligible);
  setColumn("is_online", parsed.is_online);
  setColumn("course_description", parsed.course_description);

  if (parsed.intake_months?.length) {
    if (mode === "refresh" || isEmptyValue(next.intake_months)) next.intake_months = parsed.intake_months;
  }

  for (const [k, v] of Object.entries(parsed.metadata ?? {})) {
    if (v == null || v === "") continue;
    if (mode === "empty_only" && !isEmptyValue(meta[k])) continue;
    meta[k] = v;
  }

  meta.official_page_synced_at = syncedAt;
  meta.data_source = "official_program_page";
  next.metadata = meta;
  next.confidence_score = OFFICIAL_PROGRAM_PAGE_CONFIDENCE;
  next.source_last_updated = syncedAt.slice(0, 10);

  return next;
}

export function buildStagingPatchFromEnrichment(
  row: StagingLike,
  parsed: ParsedProgramPageFields,
  mode: EnrichmentMergeMode,
  syncedAt: string,
): Record<string, unknown> | null {
  const merged = mergeOfficialPageFields(row, parsed, mode, syncedAt);
  const patch: Record<string, unknown> = {};
  let changed = false;

  for (const key of [
    "campus_name",
    "duration_value",
    "duration_unit",
    "tuition_fee",
    "currency",
    "application_fee",
    "ielts_overall",
    "ielts_min_component",
    "pte_overall",
    "toefl_overall",
    "duolingo_overall",
    "is_coop",
    "is_pgwp_eligible",
    "is_online",
    "course_description",
    "intake_months",
    "confidence_score",
    "source_last_updated",
    "metadata",
  ]) {
    if (JSON.stringify(row[key]) !== JSON.stringify(merged[key])) {
      patch[key] = merged[key];
      changed = true;
    }
  }

  return changed ? patch : null;
}

export function mergeEnrichmentIntoPayload<T extends Record<string, unknown>>(
  payload: T,
  parsed: ParsedProgramPageFields,
  mode: EnrichmentMergeMode,
  syncedAt: string,
): T {
  return mergeOfficialPageFields(payload, parsed, mode, syncedAt);
}
