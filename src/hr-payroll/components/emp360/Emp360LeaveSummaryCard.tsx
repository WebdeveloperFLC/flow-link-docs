import { Link } from "react-router-dom";
import { Emp360MetricList, Emp360SummaryCard } from "./Emp360SummaryCard";
import { useHrShifts } from "../../hooks/useHrShifts";
import { useHrLeaveBalances } from "../../hooks/useHrRequests";
import {
  balanceForType,
  displayLeaveBalances,
  leaveBalanceRemaining,
} from "../../lib/leavePolicy";
import { emp360DetailPath } from "../../lib/emp360Paths";
import type { EmployeeRow } from "../../lib/types";

type Props = {
  employee: EmployeeRow;
  employeeId: string;
  profileSearch: string;
};

export function Emp360LeaveSummaryCard({
  employee,
  employeeId,
  profileSearch,
}: Props) {
  const { data: shifts = [] } = useHrShifts();
  const policyYear = new Date().getFullYear();
  const { data: balances = [], isLoading } = useHrLeaveBalances(employee.id, policyYear);
  const shift = shifts.find((s) => s.id === employee.shift_id);

  const rows = displayLeaveBalances(balances, employee.work_week, shift?.type);
  const casual = balanceForType(rows, "Casual Leave");
  const sick = balanceForType(rows, "Sick Leave");
  const casualRemaining = casual ? leaveBalanceRemaining(casual) : 0;
  const sickRemaining = sick ? leaveBalanceRemaining(sick) : 0;
  const earned = casual && sick ? Number(casual.accrued) + Number(sick.accrued) : 0;
  const taken = casual && sick ? Number(casual.taken) + Number(sick.taken) : 0;
  const remaining = casualRemaining + sickRemaining;

  return (
    <Emp360SummaryCard
      title="Leave summary"
      subtitle={`Policy year · ${policyYear}`}
      action={
        <Link
          to={emp360DetailPath(employeeId, "leaves", profileSearch)}
          className="btn btn-sm"
        >
          View leave history
        </Link>
      }
    >
      {isLoading ? (
        <p className="muted emp360-metric-loading">Loading balances…</p>
      ) : (
        <Emp360MetricList
          rows={[
            ["Casual leave", `${casualRemaining} remaining`],
            ["Sick leave", `${sickRemaining} remaining`],
            ["Earned leave", `${earned} accrued`],
            ["Taken", `${taken} YTD`],
            ["Remaining", remaining],
          ]}
        />
      )}
    </Emp360SummaryCard>
  );
}
