import { StatusBadge } from "../../components/ui/StatusBadge";
import { printSalarySlip } from "../../lib/salarySlip";
import { employeeCurrency, formatMoney } from "../../lib/format";
import type { EmployeePayrollHistoryLine } from "../../hooks/useHrPayroll";
import type { EmployeeRow, PayrollCycleRow } from "../../lib/types";

function payrollDeductions(line: EmployeePayrollHistoryLine): number {
  return Math.max(0, Number(line.gross_earned) - Number(line.net_salary));
}

type Props = {
  employee: EmployeeRow;
  rows: EmployeePayrollHistoryLine[];
  canExport: boolean;
};

export function Emp360PayrollHistoryTable({ employee, rows, canExport }: Props) {
  const currency = employeeCurrency(employee);
  const money = (n: number) => formatMoney(n, currency);

  if (rows.length === 0) {
    return <div className="empty empty-sm">No payroll lines in this range.</div>;
  }

  return (
    <div className="table-wrap">
      <table>
        <thead>
          <tr>
            <th>Payroll cycle</th>
            <th>Gross salary</th>
            <th>Deductions</th>
            <th>Net salary</th>
            <th>Status</th>
            <th>Salary slip</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((pl) => {
            const cycle = pl.payroll_cycles;
            return (
              <tr key={pl.id}>
                <td className="strong">{cycle?.label ?? "—"}</td>
                <td className="mono">{money(pl.gross_earned)}</td>
                <td className="mono">{money(payrollDeductions(pl))}</td>
                <td className="mono">{money(pl.net_salary)}</td>
                <td>
                  {cycle?.status ? <StatusBadge status={cycle.status} /> : "—"}
                </td>
                <td>
                  {canExport && cycle ? (
                    <button
                      type="button"
                      className="btn btn-sm"
                      onClick={() =>
                        printSalarySlip(employee, pl, {
                          id: pl.cycle_id,
                          label: cycle.label,
                          status: cycle.status,
                          start_date: cycle.start_date,
                          end_date: cycle.end_date,
                          payroll_days: pl.payroll_days,
                        } as PayrollCycleRow)
                      }
                    >
                      ↓ Slip
                    </button>
                  ) : (
                    "—"
                  )}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
