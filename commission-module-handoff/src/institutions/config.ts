/**
 * Institution module configuration.
 * All thresholds and feature flags live here — never hard-code in components.
 */

const env = (import.meta as any).env ?? {};

export const USE_MOCK_DATA: boolean =
  String(env.VITE_USE_MOCK_DATA ?? "false").toLowerCase() !== "false";

/**
 * Per-row delete buttons in agreements, commissions, promotions, documents, and
 * AI suggestions. Defaults off in production; set VITE_ALLOW_TEST_DELETIONS=true
 * (or VITE_USE_MOCK_DATA=true) only for local seed/testing.
 */
export const ALLOW_TEST_DELETIONS: boolean =
  String(env.VITE_ALLOW_TEST_DELETIONS ?? String(USE_MOCK_DATA)).toLowerCase() !== "false";

export const RENEWAL_THRESHOLDS_DAYS = [180, 120, 90, 60, 30, 7];

export const CONFIDENCE = {
  autoApprove: 90,
  needsReview: 60,
};

export const PIPELINE_POLL_MS = 4000;

export const DOC_KIND_TO_EXTRACTOR = {
  program_sheet: "upi-extract-programs-from-doc",
  agreement: "upi-analyze-agreement",
  commission_sheet: "upi-extract-commission-sheet",
  brochure: "upi-extract-programs-from-doc",
} as const;

export type DocKind = keyof typeof DOC_KIND_TO_EXTRACTOR;

/** Document kinds restricted to commission / accounting staff. */
export const CONFIDENTIAL_DOC_KINDS = [
  "agreement",
  "commission_sheet",
  "invoice_template",
  "renewal_document",
] as const;

export type ConfidentialDocKind = (typeof CONFIDENTIAL_DOC_KINDS)[number];

/** Source types that reference confidential uploaded documents. */
export const CONFIDENTIAL_SOURCE_TYPES = ["agreement", "commission_sheet"] as const;

export function isConfidentialDocKind(kind: string | null | undefined): boolean {
  return !!kind && (CONFIDENTIAL_DOC_KINDS as readonly string[]).includes(kind);
}

export const PIPELINE_STATES = [
  "uploaded",
  "processing",
  "extracted",
  "needs_review",
  "approved",
  "rejected",
  "failed",
] as const;

export type PipelineState = (typeof PIPELINE_STATES)[number];