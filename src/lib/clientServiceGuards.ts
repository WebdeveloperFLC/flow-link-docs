/** Stages where the application is still being set up — service removal allowed. */
const EARLY_STAGE_KEYS = new Set(["enrolled", "payment_pending"]);

export type PipelineProgressSnapshot = {
  pipeline_id?: string | null;
  progress_percent?: number | null;
  stage_order?: number | null;
  stage_key?: string | null;
};

/** True when the active pipeline has moved past initial enrollment / fee setup. */
export function isActiveApplicationInProgress(progress: PipelineProgressSnapshot | null | undefined): boolean {
  if (!progress?.pipeline_id) return false;
  const order = progress.stage_order ?? 1;
  if (order > 1) return true;
  if ((progress.progress_percent ?? 0) > 0) return true;
  const key = progress.stage_key?.trim().toLowerCase();
  if (key && !EARLY_STAGE_KEYS.has(key)) return true;
  return false;
}

export function serviceRemovalBlockedMessage(progress: PipelineProgressSnapshot): string {
  const order = progress.stage_order ?? "?";
  const total = progress.progress_percent ?? 0;
  return `This application is in progress (stage ${order}, ${total}% complete). Removing services is restricted — contact an admin if this was a test file.`;
}
