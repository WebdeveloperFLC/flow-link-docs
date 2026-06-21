import { useState } from "react";
import { Emp360MetricGrid, Emp360SummaryCard } from "./Emp360SummaryCard";
import { Emp360PayrollHistoryModal } from "./Emp360PayrollHistoryModal";
import { rangesOverlap } from "../../lib/emp360DateRange";
import { employeeCurrency, formatMoney } from "../../lib/format";
import type { EmployeePayrollHistoryLine } from "../../hooks/useHrPayroll";
import type { EmployeeRow } from "../../lib/types";

type Props = {
  employee: EmployeeRow;
  from: string;
  to: string;
  history: EmployeePayrollHistoryLine[];
  canExport: boolean;
};

function filterPayrollHistory(
  history: EmployeePayrollHistoryLine[],
  from: string,
  to: string,
): EmployeePayrollHistoryLine[] {
  return history.filter((pl) => {
    const cycle = pl.payroll_cycles;
    if (!cycle?.start_date || !cycle?.end_date) return true;
    return rangesOverlap(cycle.start_date, cycle.end_date, from, to);
  });
}

export function Emp360PayrollHistoryCard({
  employee,
  from,
  to,
  history,
  canExport,
}: Props) {
  const [open, setOpen] = useState(false);
  const currency = employeeCurrency(employee);
  const money = (n: number) => formatMoney(n, currency);
  const filtered = filterPayrollHistory(history, from, to);
  const latest = filtered[0];
  const cycleLabel = latest?.payroll_cycles?.label ?? "—";

  return (
    <>
      <Emp360SummaryCard
        title="Payroll history"
        action={
          <button type="button" className="btn btn-sm" onClick={() => setOpen(true)}>
            View payroll history
          </button>
        }
      >
        <Emp360MetricGrid
          rows={[
            ["Latest salary", latest ? money(latest.monthly_gross) : "—"],
            ["Net salary", latest ? money(latest.net_salary) : "—"],
            ["Currency", currency],
            ["Payroll cycle", cycleLabel],
          ]}
        />
      </Emp360SummaryCard>

      <Emp360PayrollHistoryModal
        open={open}
        onClose={() => setOpen(false)}
        employee={employee}
        from={from}
        to={to}
        rows={filtered}
        canExport={canExport}
      />
    </>
  );
}
