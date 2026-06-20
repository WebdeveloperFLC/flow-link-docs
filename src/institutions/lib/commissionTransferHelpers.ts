/**
 * Transfer event helpers — outcomes A–E; snapshots are never mutated.
 */

export type TransferOutcome =
  | "unchanged"
  | "amended"
  | "cancelled"
  | "replaced"
  | "under_review";

export type TransferEventStatus = "open" | "resolved" | "cancelled";

export interface TransferEventLike {
  id: string;
  source_student_commission_id: string;
  replacement_student_commission_id?: string | null;
  event_status: TransferEventStatus;
  outcome?: TransferOutcome | null;
}

export const TRANSFER_OUTCOMES: { value: TransferOutcome; label: string; description: string }[] = [
  { value: "unchanged", label: "Unchanged", description: "Transfer resolved; commission unchanged" },
  { value: "amended", label: "Amended", description: "Expected amount amended; snapshot preserved" },
  { value: "cancelled", label: "Cancelled", description: "Source commission cancelled" },
  { value: "replaced", label: "Replaced", description: "New commission row created for destination" },
  { value: "under_review", label: "Under review", description: "Hold remains until resolved" },
];

export function isTransferOpen(ev: TransferEventLike): boolean {
  return ev.event_status === "open" || ev.outcome === "under_review";
}

export function outcomeRequiresReplacement(outcome: TransferOutcome): boolean {
  return outcome === "replaced";
}

export function outcomeCancelsSource(outcome: TransferOutcome): boolean {
  return outcome === "cancelled" || outcome === "replaced";
}

/** Map three-axis statuses after transfer resolution (client display helper). */
export function lifecycleAfterTransfer(outcome: TransferOutcome): {
  eligibilityStatus?: string;
  claimStatus?: string;
} {
  switch (outcome) {
    case "cancelled":
    case "replaced":
      return { eligibilityStatus: "cancelled", claimStatus: "rejected" };
    case "amended":
    case "unchanged":
      return { claimStatus: "ready" };
    default:
      return {};
  }
}
