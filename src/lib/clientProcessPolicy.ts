import type { PipelineProgressSnapshot } from "@/lib/clientServiceGuards";

/**
 * CRM policy: outstanding payment or pipeline progress must never block stages,
 * service edits, enrollment, or other client process. Payment reminders are OK.
 */
export const PAYMENT_NEVER_BLOCKS_PROCESS = true;

/** Service add/remove is never restricted by payment or pipeline stage. */
export function isServiceRemovalRestricted(
  _progress: PipelineProgressSnapshot | null | undefined,
): boolean {
  void _progress;
  return false;
}
