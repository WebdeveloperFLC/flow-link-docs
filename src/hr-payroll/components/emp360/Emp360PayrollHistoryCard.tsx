import { Link } from "react-router-dom";
import { Emp360MetricList, Emp360SummaryCard } from "./Emp360SummaryCard";
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
      subtitle="Latest payroll record"
      action={
        <Link
          to={emp360DetailPath(employeeId, "payroll", profileSearch)}
          className="btn btn-sm"
        >
          View payroll history
        </Link>
      }
    >
      <Emp360MetricList
        rows={[
          ["Latest salary", latest ? money(latest.monthly_gross) : "—"],
          ["Net salary", latest ? money(latest.net_salary) : "—"],
          ["Currency", currency],
          ["Payroll cycle", cycleLabel],
        ]}
      />
    </Emp360SummaryCard>
  );
}
