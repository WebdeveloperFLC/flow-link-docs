import { supabase } from "@/integrations/supabase/client";
import { mergeEnrichmentIntoPayload, type EnrichmentMergeMode } from "./programPageEnrichment";
import type { UpiCourseStaging } from "../types/upi";

export type EnrichProgramPageItem = {
  id?: string;
  program_url: string;
  existing?: Record<string, unknown>;
};

export type EnrichProgramPageResult = {
  id: string | null;
  program_url: string;
  ok: boolean;
  error?: string;
  patch?: Record<string, unknown>;
  fields?: Record<string, unknown>;
  synced_at?: string;
};

export async function enrichProgramPages(
  items: EnrichProgramPageItem[],
  mode: EnrichmentMergeMode,
  applyToDb = false,
): Promise<{ results: EnrichProgramPageResult[]; updated: number; failed: number; error: string | null }> {
  if (!items.length) {
    return { results: [], updated: 0, failed: 0, error: null };
  }

  const { data, error } = await supabase.functions.invoke("upi-enrich-program-pages", {
    body: { items, mode, apply_to_db: applyToDb },
  });

  if (error) {
    return { results: [], updated: 0, failed: items.length, error: error.message };
  }

  const payload = data as { results?: EnrichProgramPageResult[]; updated?: number; failed?: number };
  return {
    results: payload.results ?? [],
    updated: payload.updated ?? 0,
    failed: payload.failed ?? 0,
    error: null,
  };
}

export function applyEnrichmentPatchesToPayload<T extends Record<string, unknown>>(
  payload: T,
  result: EnrichProgramPageResult,
): T {
  if (!result.ok || !result.patch) return payload;
  return { ...payload, ...result.patch } as T;
}

export function applyEnrichmentPatchesToRows(
  rows: UpiCourseStaging[],
  results: EnrichProgramPageResult[],
): UpiCourseStaging[] {
  const byId = new Map(results.filter((r) => r.id && r.patch).map((r) => [r.id!, r.patch!]));
  return rows.map((row) => {
    const patch = byId.get(row.id);
    return patch ? ({ ...row, ...patch } as UpiCourseStaging) : row;
  });
}

export function enrichPayloadFromPageResult<T extends Record<string, unknown>>(
  payload: T,
  parsed: Record<string, unknown>,
  mode: EnrichmentMergeMode,
  syncedAt: string,
): T {
  return mergeEnrichmentIntoPayload(payload, parsed as never, mode, syncedAt);
}
