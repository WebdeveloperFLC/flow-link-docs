/**
 * HR-13 — payroll pipeline guidance.
 *
 * Pure mapping from a cycle status to the "where am I / what's next" guidance shown
 * on the Verify page, so the Process → Approve → Lock → Paid pipeline is explicit
 * and discoverable rather than implied by which button happens to be visible.
 *
 * Kept in sync with PAYROLL_WORKFLOW_STEPS (PayrollBreakdownPanel) but defined here
 * to avoid a component→lib import.
 */

export interface WorkflowGuide {
  /** Human label for the current stage. */
  currentLabel: string;
  /** The exact next action button label, or null at the terminal state. */
  nextActionLabel: string | null;
  /** Short description of what the next action does. */
  nextHint: string | null;
  /** Whether the next action is irreversible (Lock / Mark paid). */
  nextIrreversible: boolean;
  isTerminal: boolean;
}

export function payrollWorkflowGuide(status: string): WorkflowGuide {
  switch (status) {
    case "Draft":
      return {
        currentLabel: "Payable Days Review",
        nextActionLabel: "Process salary",
        nextHint: "Compute gross & statutory from attendance",
        nextIrreversible: false,
        isTerminal: false,
      };
    case "Processed":
      return {
        currentLabel: "Salary Processed",
        nextActionLabel: "Approve",
        nextHint: "Review the register, then approve for locking",
        nextIrreversible: false,
        isTerminal: false,
      };
    case "Approved":
      return {
        currentLabel: "HR Approved",
        nextActionLabel: "Lock payroll",
        nextHint: "Freeze snapshots — cannot be undone",
        nextIrreversible: true,
        isTerminal: false,
      };
    case "Locked":
      return {
        currentLabel: "Locked",
        nextActionLabel: "Mark paid",
        nextHint: "Confirm disbursement — cannot be undone",
        nextIrreversible: true,
        isTerminal: false,
      };
    case "Paid":
      return {
        currentLabel: "Paid",
        nextActionLabel: null,
        nextHint: "Disbursement complete",
        nextIrreversible: false,
        isTerminal: true,
      };
    default:
      return {
        currentLabel: status || "Draft",
        nextActionLabel: "Process salary",
        nextHint: "Compute gross & statutory from attendance",
        nextIrreversible: false,
        isTerminal: false,
      };
  }
}
