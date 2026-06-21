import type { ApplicationLifecycleStatus } from "./types";
import { TERMINAL_APPLICATION_LIFECYCLE_STATUSES } from "./types";

export function isTerminalApplicationStatus(status: ApplicationLifecycleStatus): boolean {
  return TERMINAL_APPLICATION_LIFECYCLE_STATUSES.includes(status);
}

export function isApplicationTransitionAllowed(
  from: ApplicationLifecycleStatus,
  to: ApplicationLifecycleStatus,
): boolean {
  if (isTerminalApplicationStatus(from)) return false;
  if (from === "DRAFT" && ["ACTIVE", "CANCELLED", "REFUSED"].includes(to)) return true;
  if (from === "ACTIVE" && ["ON_HOLD", "COMPLETED", "CANCELLED", "REFUSED"].includes(to)) {
    return true;
  }
  if (from === "ON_HOLD" && ["ACTIVE", "CANCELLED", "REFUSED"].includes(to)) return true;
  if (from === "COMPLETED" && to === "CLOSED") return true;
  return false;
}

export function availableApplicationTransitions(
  status: ApplicationLifecycleStatus,
): ApplicationLifecycleStatus[] {
  const all = [
    "DRAFT",
    "ACTIVE",
    "ON_HOLD",
    "COMPLETED",
    "CLOSED",
    "CANCELLED",
    "REFUSED",
  ] as const satisfies readonly ApplicationLifecycleStatus[];
  return all.filter((to) => to !== status && isApplicationTransitionAllowed(status, to));
}

export function isApplicationEditable(status: ApplicationLifecycleStatus): boolean {
  return !isTerminalApplicationStatus(status);
}
