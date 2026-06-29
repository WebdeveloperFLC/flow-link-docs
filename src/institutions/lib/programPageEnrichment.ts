export type { ParsedProgramPageFields } from "../../../supabase/functions/_shared/programPageParser";
export {
  OFFICIAL_PROGRAM_PAGE_CONFIDENCE,
  parseProgramPageHtml,
  parseAlgoliaProgramHit,
} from "../../../supabase/functions/_shared/programPageParser";

export type { EnrichmentMergeMode } from "../../../supabase/functions/_shared/programPageEnrichment";
export {
  OFFICIAL_PROGRAM_PAGE_CONFIDENCE as OFFICIAL_SOURCE_CONFIDENCE,
  mergeOfficialPageFields,
  buildStagingPatchFromEnrichment,
  mergeEnrichmentIntoPayload,
} from "../../../supabase/functions/_shared/programPageEnrichment";

import type { UpiCourseStaging } from "../types/upi";

export function patchRowsFromEnrichment(
  rows: UpiCourseStaging[],
  patches: Map<string, Partial<UpiCourseStaging>>,
): UpiCourseStaging[] {
  return rows.map((row) => {
    const patch = patches.get(row.id);
    return patch ? { ...row, ...patch } : row;
  });
}
