import type { PipelineProgressSnapshot } from "@/lib/clientServiceGuards";

/**
 * CRM policy: outstanding payment must never block stages, enrollment, or portal access.
 * Reminders are OK; hard stops on process are not.
 *
 * Exception (LOCKED): collected payment **blocks service removal** — see
 * SERVICE_MANAGEMENT_AND_DELETION_RULES.md and clientServiceRemoval.ts.
 */
export const PAYMENT_NEVER_BLOCKS_PROCESS = true;

/** Service add/remove is never restricted by pipeline stage. Payment may block removal only. */
export function isServiceRemovalRestricted(
  _progress: PipelineProgressSnapshot | null | undefined,
): boolean {
  void _progress;
  return false;
}
