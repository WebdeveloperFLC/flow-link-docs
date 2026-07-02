import type { PayrollLineRow } from "./types";

/**
 * HR-15 — Payroll validation gate.
 *
 * Pure, side-effect-free checks over computed payroll lines. Used by the Verify
 * page to *block* forward transitions (Process → Approve → Lock → Mark paid) and
 * bank-file export when a cycle contains hard data errors, so invalid amounts
 * cannot reach salary slips or the bank transfer file.
 *
 * "error"   → hard-stop (blocks the action unless an admin explicitly overrides).
 * "warning" → surfaced but does not block.
 *
 * Rules are deliberately conservative to avoid false positives on legitimate
 * edge cases (e.g. a genuinely zero-day cycle line).
 */

export type PayrollValidationSeverity = "error" | "warning";

export interface PayrollValidationIssue {
  lineId: string;
  employeeId: string;
  empCode: string;
  employeeName: string;
  field: string;
  message: string;
  severity: PayrollValidationSeverity;
}

export interface PayrollValidationResult {
  issues: PayrollValidationIssue[];
  errors: PayrollValidationIssue[];
  warnings: PayrollValidationIssue[];
  errorCount: number;
  warningCount: number;
  /** Lines with neither an error nor a warning. */
  okCount: number;
  totalLines: number;
  /** Number of distinct employees affected by at least one error. */
  employeesWithErrors: number;
  hasErrors: boolean;
  hasWarnings: boolean;
}

/** Tolerance for floating-point comparisons (1 paisa/cent). */
const EPS = 0.01;

const isBadNumber = (n: unknown): boolean =>
  typeof n !== "number" || !Number.isFinite(n);

const num = (n: number | null | undefined): number =>
  typeof n === "number" && Number.isFinite(n) ? n : 0;

function labelFor(line: PayrollLineRow): { empCode: string; employeeName: string } {
  return {
    empCode: line.employees?.emp_code ?? "—",
    employeeName: line.employees?.full_name ?? "Unknown employee",
  };
}

/** Validate a single payroll line. Returns 0+ issues. */
export function validatePayrollLine(line: PayrollLineRow): PayrollValidationIssue[] {
  const issues: PayrollValidationIssue[] = [];
  const { empCode, employeeName } = labelFor(line);
  const push = (
    field: string,
    message: string,
    severity: PayrollValidationSeverity,
  ) =>
    issues.push({
      lineId: line.id,
      employeeId: line.employee_id,
      empCode,
      employeeName,
      field,
      message,
      severity,
    });

  // --- Hard errors: not-a-number ---
  if (isBadNumber(line.net_salary)) {
    push("net_salary", "Net salary is not a valid number", "error");
  }
  if (isBadNumber(line.gross_earned)) {
    push("gross_earned", "Gross is not a valid number", "error");
  }
  if (isBadNumber(line.payable_days)) {
    push("payable_days", "Payable days is not a valid number", "error");
  }

  // --- Hard errors: out of range (only meaningful when the number is valid) ---
  if (!isBadNumber(line.payable_days) && line.payable_days < 0) {
    push("payable_days", `Negative payable days (${line.payable_days})`, "error");
  }
  if (!isBadNumber(line.gross_earned) && line.gross_earned < 0) {
    push("gross_earned", "Negative gross earned", "error");
  }
  if (!isBadNumber(line.net_salary) && line.net_salary < 0) {
    push("net_salary", "Negative net salary", "error");
  }

  // --- Hard error: net exceeds total earnings (implies a deduction/calc error) ---
  if (!isBadNumber(line.net_salary) && !isBadNumber(line.gross_earned)) {
    const earnings = num(line.gross_earned) + num(line.incentive) + num(line.bonus);
    if (line.net_salary > earnings + EPS) {
      push(
        "net_salary",
        "Net salary exceeds gross + incentive + bonus (deduction error)",
        "error",
      );
    }
  }

  // --- Warnings: earned days but nothing paid (likely, not certainly, wrong) ---
  const validPayable = !isBadNumber(line.payable_days) && line.payable_days > 0;
  if (validPayable && !isBadNumber(line.gross_earned) && line.gross_earned === 0) {
    push("gross_earned", "Zero gross despite payable days", "warning");
  } else if (
    validPayable &&
    !isBadNumber(line.gross_earned) &&
    line.gross_earned > 0 &&
    !isBadNumber(line.net_salary) &&
    line.net_salary === 0
  ) {
    // Earned something but net is zero → deductions consumed all earnings.
    push("net_salary", "Zero net salary despite gross earnings", "warning");
  }

  return issues;
}

/** Validate all lines for a cycle and roll up counts. */
export function validatePayrollLines(
  lines: readonly PayrollLineRow[],
): PayrollValidationResult {
  const issues: PayrollValidationIssue[] = [];
  const errorEmployees = new Set<string>();
  let okCount = 0;

  for (const line of lines) {
    const lineIssues = validatePayrollLine(line);
    if (lineIssues.length === 0) {
      okCount += 1;
    }
    for (const issue of lineIssues) {
      issues.push(issue);
      if (issue.severity === "error") errorEmployees.add(issue.employeeId);
    }
  }

  const errors = issues.filter((i) => i.severity === "error");
  const warnings = issues.filter((i) => i.severity === "warning");

  return {
    issues,
    errors,
    warnings,
    errorCount: errors.length,
    warningCount: warnings.length,
    okCount,
    totalLines: lines.length,
    employeesWithErrors: errorEmployees.size,
    hasErrors: errors.length > 0,
    hasWarnings: warnings.length > 0,
  };
}

/** Compact one-line summary, e.g. "142 OK · 3 warnings · 1 error". */
export function summarizePayrollValidation(result: PayrollValidationResult): string {
  const parts = [`${result.okCount} OK`];
  if (result.warningCount > 0) {
    parts.push(`${result.warningCount} warning${result.warningCount === 1 ? "" : "s"}`);
  }
  if (result.errorCount > 0) {
    parts.push(`${result.errorCount} error${result.errorCount === 1 ? "" : "s"}`);
  }
  return parts.join(" · ");
}
