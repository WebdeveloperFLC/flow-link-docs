import type { ProcessingPolicy } from "../types/knowledgeSources";
import type { UpiSource } from "../types/upi";

/** URL-based source types — default to reference-only (no automatic crawl). */
export const URL_SOURCE_TYPES = new Set([
  "website_url",
  "listing_page",
  "scholarship_page",
  "tuition_page",
  "international_page",
  "sitemap",
  "api_endpoint",
  "json_feed",
]);

/** Document / upload source types — eligible for AI extraction. */
export const DOCUMENT_SOURCE_TYPES = new Set([
  "pdf_brochure",
  "excel_sheet",
  "csv_feed",
  "uploaded_email",
  "program_sheet",
  "brochure",
  "agreement",
  "commission_sheet",
  "promotion_campaign",
]);

type SourceLike = Pick<UpiSource, "source_type" | "metadata"> & {
  document_id?: string | null;
  url?: string | null;
  last_synced_at?: string | null;
};

function metaRecord(source: SourceLike): Record<string, unknown> {
  const m = source.metadata;
  return m && typeof m === "object" && !Array.isArray(m) ? (m as Record<string, unknown>) : {};
}

export function isUrlSourceType(sourceType: string): boolean {
  return URL_SOURCE_TYPES.has(sourceType);
}

export function isDocumentSourceType(sourceType: string): boolean {
  return DOCUMENT_SOURCE_TYPES.has(sourceType);
}

export function isDocumentLinkedSource(source: SourceLike): boolean {
  return Boolean(source.document_id) || isDocumentSourceType(source.source_type);
}

/** Default policy: URLs → reference only; uploaded/linked documents → extract once. */
export function defaultProcessingPolicy(source: SourceLike): ProcessingPolicy {
  if (isDocumentLinkedSource(source)) return "ai_extract_once";
  if (isUrlSourceType(source.source_type) || Boolean(source.url?.trim())) return "reference_only";
  return "manual_sync";
}

export function readProcessingPolicy(source: SourceLike): ProcessingPolicy {
  const stored = metaRecord(source).processing_policy;
  if (stored === "reference_only" || stored === "ai_extract_once" || stored === "manual_sync") {
    return stored;
  }
  return defaultProcessingPolicy(source);
}

export function hasAiExtractCompleted(source: SourceLike): boolean {
  const meta = metaRecord(source);
  if (meta.ai_extract_completed_at) return true;
  return readProcessingPolicy(source) === "ai_extract_once" && Boolean(source.last_synced_at);
}

/** Manual Sync now is allowed for these policies (when not already consumed for extract-once). */
export function canSyncNow(source: SourceLike): boolean {
  const policy = readProcessingPolicy(source);
  if (policy === "reference_only") return false;
  if (policy === "ai_extract_once" && hasAiExtractCompleted(source)) return false;
  return true;
}

export function shouldIncludeInSyncAll(source: SourceLike): boolean {
  return canSyncNow(source);
}

export function buildProcessingPolicyPatch(
  source: SourceLike,
  policy: ProcessingPolicy,
): Record<string, unknown> {
  return {
    ...metaRecord(source),
    processing_policy: policy,
  };
}

export function buildAiExtractCompletedPatch(source: SourceLike): Record<string, unknown> {
  return {
    ...metaRecord(source),
    ai_extract_completed_at: new Date().toISOString(),
  };
}

export function buildNewSourceMetadata(
  sourceType: string,
  opts: { documentId?: string | null; url?: string | null },
): Record<string, unknown> {
  const policy = defaultProcessingPolicy({
    source_type: sourceType,
    document_id: opts.documentId,
    url: opts.url,
    metadata: {},
  });
  return { processing_policy: policy };
}
