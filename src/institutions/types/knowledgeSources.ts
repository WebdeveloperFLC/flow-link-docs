/** How a knowledge source may be processed — stored in source.metadata.processing_policy */
export type ProcessingPolicy = "reference_only" | "ai_extract_once" | "manual_sync";

export const PROCESSING_POLICIES: ProcessingPolicy[] = [
  "reference_only",
  "ai_extract_once",
  "manual_sync",
];

export const PROCESSING_POLICY_LABELS: Record<ProcessingPolicy, string> = {
  reference_only: "Reference Only",
  ai_extract_once: "AI Extract Once",
  manual_sync: "Manual Sync",
};

export const PROCESSING_POLICY_HINTS: Record<ProcessingPolicy, string> = {
  reference_only: "Stored as a counselling link — never crawled or extracted automatically.",
  ai_extract_once: "AI runs once when the source is added or first synced, then stays reference-only.",
  manual_sync: "No automatic extraction — use Sync now when you want AI to process this source.",
};
