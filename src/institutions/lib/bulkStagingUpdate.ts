import { supabase } from "@/integrations/supabase/client";
import {
  buildStagingPatchForRow,
  type BulkApplyMode,
  type ProgramBulkFieldId,
} from "./bulkProgramFields";
import type { UpiCourseStaging } from "../types/upi";

export type BulkStagingUpdateResult = {
  updated: number;
  requested: number;
};

/** Single bulk UPDATE on `upi_courses_staging` for the given row ids. */
export async function bulkUpdateStagingCourses(
  ids: string[],
  patch: Partial<UpiCourseStaging>,
): Promise<{ result: BulkStagingUpdateResult; error: string | null }> {
  if (!ids.length) {
    return { result: { updated: 0, requested: 0 }, error: null };
  }

  const { error, count } = await supabase
    .from("upi_courses_staging")
    .update(patch as Record<string, unknown>)
    .in("id", ids)
    .select("id", { count: "exact", head: true });

  if (error) {
    return { result: { updated: 0, requested: ids.length }, error: error.message };
  }

  return {
    result: { updated: count ?? ids.length, requested: ids.length },
    error: null,
  };
}

export type PgwpBulkValue = "eligible" | "not_eligible" | "unknown";

export function pgwpBulkValueToField(value: PgwpBulkValue): boolean | null {
  if (value === "eligible") return true;
  if (value === "not_eligible") return false;
  return null;
}

export function patchRowsPgwpStatus(
  rows: UpiCourseStaging[],
  ids: string[],
  value: PgwpBulkValue,
): UpiCourseStaging[] {
  const idSet = new Set(ids);
  const isPgwpEligible = pgwpBulkValueToField(value);
  return rows.map((row) => (idSet.has(row.id) ? { ...row, is_pgwp_eligible: isPgwpEligible } : row));
}

/** Apply field patches in grouped bulk UPDATEs (one query per unique patch shape). */
export async function bulkApplyProgramFieldPatches(
  targets: UpiCourseStaging[],
  targetIds: string[],
  values: Partial<Record<ProgramBulkFieldId, unknown>>,
  fieldIds: ProgramBulkFieldId[],
  mode: BulkApplyMode,
): Promise<{ result: BulkStagingUpdateResult; error: string | null }> {
  if (!targetIds.length) {
    return { result: { updated: 0, requested: 0 }, error: null };
  }

  const idSet = new Set(targetIds);
  const groups = new Map<string, { ids: string[]; patch: Partial<UpiCourseStaging> }>();

  for (const row of targets) {
    if (!idSet.has(row.id)) continue;
    const patch = buildStagingPatchForRow(row, values, fieldIds, mode);
    if (!patch || !Object.keys(patch).length) continue;
    const key = JSON.stringify(patch);
    const group = groups.get(key);
    if (group) group.ids.push(row.id);
    else groups.set(key, { ids: [row.id], patch });
  }

  if (!groups.size) {
    return { result: { updated: 0, requested: targetIds.length }, error: null };
  }

  let updated = 0;
  for (const { ids, patch } of groups.values()) {
    const { result, error } = await bulkUpdateStagingCourses(ids, patch);
    if (error) {
      return { result: { updated, requested: targetIds.length }, error };
    }
    updated += result.updated;
  }

  return { result: { updated, requested: targetIds.length }, error: null };
}
