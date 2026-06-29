/**
 * Transaction lifecycle locking — posted records are never edited.
 */
import type { TransactionLockState } from "../types/statuses";

const ORDER: TransactionLockState[] = [
  "draft",
  "submitted",
  "locked",
  "approved",
  "posted",
  "reconciled",
  "closed",
];

export function lockStateIndex(s: TransactionLockState): number {
  return ORDER.indexOf(s);
}

export function canTransitionLock(from: TransactionLockState, to: TransactionLockState): boolean {
  const fi = lockStateIndex(from);
  const ti = lockStateIndex(to);
  if (fi < 0 || ti < 0) return false;
  // Allow forward progression; reject backward except draft reset before submit.
  if (to === "draft" && from === "draft") return true;
  if (ti < fi) return false;
  return ti === fi + 1 || ti === fi;
}

export function isImmutableLockState(s: TransactionLockState): boolean {
  return lockStateIndex(s) >= lockStateIndex("posted");
}

export function assertEditableLockState(s: TransactionLockState, action: string): void {
  if (isImmutableLockState(s)) {
    throw new Error(`Transaction is ${s} and cannot be ${action}. Use reversal workflow.`);
  }
}

export function initialLockStateOnRecord(): TransactionLockState {
  return "submitted";
}

export function lockStateAfterVerification(): TransactionLockState {
  return "locked";
}

export function lockStateAfterJournalApproval(): TransactionLockState {
  return "approved";
}

export function lockStateAfterPost(): TransactionLockState {
  return "posted";
}
