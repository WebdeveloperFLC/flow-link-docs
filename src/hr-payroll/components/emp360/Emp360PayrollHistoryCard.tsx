import { Link } from "react-router-dom";
import { Stat } from "../ui/Stat";
import { Emp360StatRow, Emp360SummaryCard } from "./Emp360SummaryCard";
import { rangesOverlap } from "../../lib/emp360DateRange";
import { employeeCurrency, formatMoney } from "../../lib/format";
import { emp360DetailPath } from "../../lib/emp360Paths";
import type { EmployeePayrollHistoryLine } from "../../hooks/useHrPayroll";
import type { EmployeeRow } from "../../lib/types";

type Props = {
  employee: EmployeeRow;
  employeeId: string;
  profileSearch: string;
  from: string;
  to: string;
  history: EmployeePayrollHistoryLine[];
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
  employeeId,
  profileSearch,
  from,
  to,
  history,
}: Props) {
  const currency = employeeCurrency(employee);
  const money = (n: number) => formatMoney(n, currency);
  const filtered = filterPayrollHistory(history, from, to);
  const latest = filtered[0];
  const cycleLabel = latest?.payroll_cycles?.label ?? "—";

  return (
    <Emp360SummaryCard
      title="Payroll history"
      from={from}
      to={to}
      action={
        <Link
          to={emp360DetailPath(employeeId, "payroll", profileSearch)}
          className="btn btn-sm"
        >
          View payroll history
        </Link>
      }
    >
      <Emp360StatRow>
        <Stat
          variant="highlight"
          tone="blue"
          lab="Latest salary"
          val={latest ? money(latest.monthly_gross) : "—"}
        />
        <Stat
          variant="highlight"
          tone="green"
          lab="Net salary"
          val={latest ? money(latest.net_salary) : "—"}
        />
        <Stat variant="highlight" tone="purple" lab="Currency" val={currency} />
        <Stat variant="highlight" tone="gold" lab="Payroll cycle" val={cycleLabel} />
      </Emp360StatRow>
    </Emp360SummaryCard>
  );
}
