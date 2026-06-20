import type { QualificationLifecycleStatus } from "./types";
import { TERMINAL_QUALIFICATION_STATUSES } from "./types";

export function isTerminalQualificationStatus(status: QualificationLifecycleStatus): boolean {
  return TERMINAL_QUALIFICATION_STATUSES.includes(status);
}

export function isQualificationTransitionAllowed(
  from: QualificationLifecycleStatus,
  to: QualificationLifecycleStatus,
): boolean {
  if (isTerminalQualificationStatus(from)) return false;
  if (from === "DRAFT" && ["ACTIVE", "CANCELLED", "REFUSED"].includes(to)) return true;
  if (from === "ACTIVE" && ["ON_HOLD", "COMPLETED", "CANCELLED", "REFUSED"].includes(to)) {
    return true;
  }
  if (from === "ON_HOLD" && ["ACTIVE", "CANCELLED", "REFUSED"].includes(to)) return true;
  if (from === "COMPLETED" && to === "CLOSED") return true;
  return false;
}

export function availableQualificationTransitions(
  status: QualificationLifecycleStatus,
): QualificationLifecycleStatus[] {
  const all = [
    "DRAFT",
    "ACTIVE",
    "ON_HOLD",
    "COMPLETED",
    "CLOSED",
    "CANCELLED",
    "REFUSED",
  ] as const satisfies readonly QualificationLifecycleStatus[];
  return all.filter((to) => to !== status && isQualificationTransitionAllowed(status, to));
}

export function isQualificationEditable(status: QualificationLifecycleStatus): boolean {
  return !isTerminalQualificationStatus(status);
}
