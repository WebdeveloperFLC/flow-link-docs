/**
 * Institution module configuration.
 * All thresholds and feature flags live here — never hard-code in components.
 */

const env = (import.meta as any).env ?? {};

export const USE_MOCK_DATA: boolean =
  String(env.VITE_USE_MOCK_DATA ?? "true").toLowerCase() !== "false";

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
  brochure: "upi-detect-promotions",
} as const;

export type DocKind = keyof typeof DOC_KIND_TO_EXTRACTOR;

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