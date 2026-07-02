import type { AuditLogRow } from "./types";

/**
 * HR-19 — payroll cycle audit trail.
 *
 * Pure extraction of the payroll lifecycle events for a single cycle from the
 * existing `audit_log` rows (written by `hrAudit` on Process/Approve/Lock/Paid and
 * on validation overrides). No new storage — this just surfaces what is already
 * recorded, so who-did-what-and-when is visible on the cycle instead of buried in
 * the global audit log.
 */

/** Audit actions that belong to the payroll lifecycle. */
const PAYROLL_ACTION_PREFIX = "Payroll ";

/**
 * Return the payroll audit entries for `cycleLabel`, oldest first.
 * Matches both plain targets (e.g. "June 2026") and composite targets written by
 * the validation override (e.g. "June 2026 · Lock payroll · 1 error(s)").
 */
export function filterCyclePayrollAudit(
  logs: readonly AuditLogRow[],
  cycleLabel: string,
): AuditLogRow[] {
  const label = cycleLabel.trim();
  if (!label) return [];
  return logs
    .filter((l) => {
      if (!l.action.startsWith(PAYROLL_ACTION_PREFIX)) return false;
      const t = (l.target ?? "").trim();
      return t === label || t.startsWith(`${label} ·`);
    })
    .slice()
    .sort((a, b) => a.created_at.localeCompare(b.created_at));
}
