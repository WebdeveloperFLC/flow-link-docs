import { Link } from "react-router-dom";
import { Stat } from "../ui/Stat";
import { Emp360StatRow, Emp360SummaryCard } from "./Emp360SummaryCard";
import { employeeCurrency, formatMoney } from "../../lib/format";
import { emp360DetailPath } from "../../lib/emp360Paths";
import type { EmployeePayrollHistoryLine } from "../../hooks/useHrPayroll";
import type { EmployeeRow } from "../../lib/types";

type Props = {
  employee: EmployeeRow;
  employeeId: string;
  profileSearch: string;
  history: EmployeePayrollHistoryLine[];
};

export function Emp360PayrollHistoryCard({
  employee,
  employeeId,
  profileSearch,
  history,
}: Props) {
  const currency = employeeCurrency(employee);
  const money = (n: number) => formatMoney(n, currency);
  const latest = history[0];
  const cycleLabel = latest?.payroll_cycles?.label ?? "—";

  return (
    <Emp360SummaryCard
      title="Payroll history"
      action={
        <Link
          to={emp360DetailPath(employeeId, "payroll", profileSearch)}
          className="btn btn-sm"
        >
          View payroll history
        </Link>
      }
    >
      <p className="muted emp360-card-summary-hint">Latest payroll record</p>
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
