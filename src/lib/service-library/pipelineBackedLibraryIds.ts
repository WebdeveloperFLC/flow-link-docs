/**
 * Service Library is primary — only these library IDs get stage pipelines and visa pickers.
 * Re-exported from auto-generated stagePipelineLibrarySlug.ts.
 */
import {
  LIBRARY_PIPELINE_SEED_SLUG,
  PIPELINE_BACKED_LIBRARY_IDS,
} from "@/lib/stagePipelineLibrarySlug";

export { LIBRARY_PIPELINE_SEED_SLUG, PIPELINE_BACKED_LIBRARY_IDS };

export function isPipelineBackedLibraryId(libraryId: string | null | undefined): boolean {
  if (!libraryId?.trim()) return false;
  return PIPELINE_BACKED_LIBRARY_IDS.has(libraryId.trim());
}
