/**
 * HR-14 — payroll readiness checklist.
 *
 * Pure derivation of the "are we ready to advance this cycle?" checklist shown in
 * the confirmation dialog. Kept separate from the component for unit testing.
 *
 * States: "ok" (green), "warn" (amber — proceed with caution), "error" (red —
 * would be blocked by the HR-15 gate), "info" (neutral fact).
 */

export type ReadinessState = "ok" | "warn" | "error" | "info";

export interface ReadinessItem {
  key: string;
  label: string;
  state: ReadinessState;
  detail: string;
}

export interface PayrollReadinessInput {
  /** Payroll lines present for the cycle (register rows). */
  lineCount: number;
  overriddenCount: number;
  errorCount: number;
  warningCount: number;
  /** Employees considered for the bank file. */
  bankTotal: number;
  /** Employees missing required bank details. */
  bankMissing: number;
  /** Pending attendance exceptions (late + mispunch). */
  pendingAttendance: number;
  /** Pending leave + comp-off approvals. */
  pendingLeave: number;
}

export function buildPayrollReadiness(i: PayrollReadinessInput): ReadinessItem[] {
  return [
    i.pendingAttendance === 0
      ? { key: "attendance", label: "Attendance finalized", state: "ok", detail: "No pending exceptions" }
      : {
          key: "attendance",
          label: "Attendance finalized",
          state: "warn",
          detail: `${i.pendingAttendance} attendance exception(s) pending`,
        },
    i.pendingLeave === 0
      ? { key: "leave", label: "Leave approvals completed", state: "ok", detail: "No pending approvals" }
      : {
          key: "leave",
          label: "Leave approvals completed",
          state: "warn",
          detail: `${i.pendingLeave} pending approval(s)`,
        },
    i.errorCount > 0
      ? { key: "validation", label: "Validation passed", state: "error", detail: `${i.errorCount} error(s)` }
      : i.warningCount > 0
        ? { key: "validation", label: "Validation passed", state: "warn", detail: `${i.warningCount} warning(s)` }
        : { key: "validation", label: "Validation passed", state: "ok", detail: "No errors or warnings" },
    i.bankTotal === 0
      ? { key: "bank", label: "Bank details ready", state: "info", detail: "No bank rows to check" }
      : i.bankMissing > 0
        ? {
            key: "bank",
            label: "Bank details ready",
            state: "warn",
            detail: `${i.bankMissing} of ${i.bankTotal} missing bank details`,
          }
        : { key: "bank", label: "Bank details ready", state: "ok", detail: `All ${i.bankTotal} have bank details` },
    i.lineCount > 0
      ? { key: "register", label: "Register generated", state: "ok", detail: `${i.lineCount} employee line(s)` }
      : { key: "register", label: "Register generated", state: "warn", detail: "No payroll lines — rebuild register" },
    {
      key: "overrides",
      label: "Manual overrides",
      state: i.overriddenCount > 0 ? "info" : "ok",
      detail: i.overriddenCount > 0 ? `${i.overriddenCount} overridden line(s)` : "None",
    },
    {
      key: "warnings",
      label: "Warnings",
      state: i.warningCount > 0 ? "warn" : "ok",
      detail: i.warningCount > 0 ? `${i.warningCount} warning(s)` : "None",
    },
  ];
}
