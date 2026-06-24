import {
  buildPayableDaysBreakdown,
  buildStatutoryBreakdown,
  parseRollupSnapshot,
  payableDaysSteps,
  splitAttendanceDays,
  statutorySteps,
  type BreakdownStep,
} from "../../lib/payrollBreakdown";
import { employeeCurrency, formatMoney } from "../../lib/format";
import type { PayrollCycleRow, PayrollLineRow } from "../../lib/types";

const STEPS = ["Draft", "Processed", "Approved", "Locked", "Paid"] as const;

export function PayrollWorkflowStepper({ status }: { status: string }) {
  const idx = STEPS.indexOf(status as (typeof STEPS)[number]);
  const active = idx >= 0 ? idx : 0;

  return (
    <div className="payroll-workflow-stepper" role="list" aria-label="Payroll processing workflow">
      {STEPS.map((label, i) => {
        const done = i < active;
        const current = i === active;
        return (
          <div
            key={label}
            role="listitem"
            className={`payroll-wf-step${done ? " is-done" : ""}${current ? " is-current" : ""}`}
          >
            <span className="payroll-wf-dot">{done ? "✓" : i + 1}</span>
            <span className="payroll-wf-label">{label}</span>
            {i < STEPS.length - 1 && <span className="payroll-wf-line" aria-hidden />}
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
        <StepTable title="Payable days calculation" steps={payableDaysSteps(payable)} />
        <StepTable
          title="Salary & statutory deductions"
          steps={statutorySteps(statutory)}
          money={money}
        />
      </div>
      <div className="payroll-bd-formula">
        {payable.formulaMode === "earned" ? (
          <>
            <strong>Earned mode:</strong> Payable = Attendance earned − late ded − (UL×2) − sandwich −
            mispunch ded − unpaid training. Daily = monthly ÷ effective payroll days.
          </>
        ) : (
          <>
            <strong>Legacy mode:</strong> Payable = Payroll days − leaves + paid leaves + comp-off −
            late ded − (UL×2) − sandwich − mispunch ded − unpaid training.{" "}
            <strong>Gross</strong> = daily × payable. <strong>Net</strong> = gross + incentive +
            bonus − PF − ESIC − PT/TDS − other.
          </>
        )}
      </div>
    </div>
  );
}
