import {
  buildPayableDaysBreakdown,
  buildEmployerStatutoryBreakdown,
  buildStatutoryBreakdown,
  employerStatutorySteps,
  parseRollupSnapshot,
  payableDaysSteps,
  salaryProcessingSteps,
  splitAttendanceDays,
  statutorySteps,
  type BreakdownStep,
} from "../../lib/payrollBreakdown";
import { structureStepsFromLine } from "../../lib/payrollLineStructure";
import { employeeCurrency, formatMoney } from "../../lib/format";
import type { PayrollCycleRow, PayrollLineRow } from "../../lib/types";

export const PAYROLL_WORKFLOW_STEPS = [
  { status: "Draft", label: "Payable Days Review", hint: "Verify attendance → payable days" },
  { status: "Processed", label: "Salary Processed", hint: "Gross & statutory computed" },
  { status: "Approved", label: "HR Approved", hint: "Ready to lock" },
  { status: "Locked", label: "Locked", hint: "Snapshots frozen" },
  { status: "Paid", label: "Paid", hint: "Disbursement complete" },
] as const;

export function PayrollWorkflowStepper({ status }: { status: string }) {
  const idx = PAYROLL_WORKFLOW_STEPS.findIndex((s) => s.status === status);
  const active = idx >= 0 ? idx : 0;

  return (
    <div className="payroll-workflow-stepper" role="list" aria-label="Payroll processing workflow">
      {PAYROLL_WORKFLOW_STEPS.map((step, i) => {
        const done = i < active;
        const current = i === active;
        return (
          <div
            key={step.status}
            role="listitem"
            className={`payroll-wf-step${done ? " is-done" : ""}${current ? " is-current" : ""}`}
            title={step.hint}
          >
            <span className="payroll-wf-dot">{done ? "✓" : i + 1}</span>
            <span className="payroll-wf-label">{step.label}</span>
            {i < PAYROLL_WORKFLOW_STEPS.length - 1 && <span className="payroll-wf-line" aria-hidden />}
          </div>
        );
      })}
    </div>
  );
}

function StepTable({
  title,
  steps,
  money,
}: {
  title: string;
  steps: BreakdownStep[];
  money?: (n: number) => string;
}) {
  return (
    <div className="payroll-bd-section">
      <div className="payroll-bd-section-title">{title}</div>
      <table className="payroll-bd-table">
        <tbody>
          {steps.map((s) => {
            const display =
              typeof s.value === "number"
                ? money
                  ? money(s.value)
                  : String(s.value)
                : s.value;
            return (
              <tr key={s.label} className={s.tone ? `tone-${s.tone}` : undefined}>
                <td>
                  {s.label}
                  {s.hint && <div className="payroll-bd-hint">{s.hint}</div>}
                </td>
                <td>{display}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

export function PayrollBreakdownPanel({
  line,
  cycle,
  snapshot,
  attendanceSplit,
}: {
  line: PayrollLineRow;
  cycle: PayrollCycleRow;
  snapshot?: unknown;
  attendanceSplit?: ReturnType<typeof splitAttendanceDays> | null;
}) {
  const emp = line.employees;
  const parsed = parseRollupSnapshot(snapshot ?? line.input_snapshot);
  const payable = buildPayableDaysBreakdown(line, cycle, parsed, attendanceSplit);
  const statutory = buildStatutoryBreakdown(line, emp);
  const employer = buildEmployerStatutoryBreakdown(line, emp);
  const structureSteps: BreakdownStep[] = structureStepsFromLine(line).map((s) => ({
    label: s.label,
    value: s.value,
    tone:
      s.group === "deduct"
        ? "deduct"
        : s.group === "total" || s.group === "result"
          ? "result"
          : s.group === "add"
            ? "add"
            : "neutral",
  }));
  const cur = employeeCurrency(emp);
  const money = (n: number) => formatMoney(n, cur);

  return (
    <div className="payroll-breakdown-panel">
      {line.is_overridden && (
        <div className="payroll-bd-banner">
          Manual override applied — values below reflect applied inputs on this line.
        </div>
      )}
      <div className="payroll-bd-grid">
        <StepTable title="1. Salary payable days (attendance-driven)" steps={payableDaysSteps(payable)} />
        <StepTable title="2. Salary processing" steps={salaryProcessingSteps(line)} money={money} />
      </div>
      <div className="payroll-bd-grid">
        <StepTable title="3. Statutory deductions & net" steps={statutorySteps(statutory)} money={money} />
        {line.salary_structure_mode && structureSteps.length > 0 && (
          <StepTable
            title="Structure breakdown (from line — informational)"
            steps={structureSteps}
            money={money}
          />
        )}
      </div>
      {employer.show && (
        <StepTable
          title="Employer statutory contributions"
          steps={employerStatutorySteps(employer)}
          money={money}
        />
      )}
      <div className="payroll-bd-formula-hint muted" style={{ fontSize: 12, marginTop: -8 }}>
        Sequence: Attendance → Payable Days → Salary (monthly gross × payable) → Statutory → Net.
        Employer PF/ESIC are company cost — not deducted from employee net pay.
      </div>
      <div className="payroll-bd-formula">
        <strong>Net salary</strong> = {money(line.gross_earned)} + additions − deductions ={" "}
        <strong>{money(line.net_salary)}</strong>
      </div>
    </div>
  );
}
