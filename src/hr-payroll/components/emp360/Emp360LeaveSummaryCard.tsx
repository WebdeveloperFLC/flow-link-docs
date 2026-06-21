import { Link } from "react-router-dom";
import { Stat } from "../ui/Stat";
import { Emp360StatRow, Emp360SummaryCard } from "./Emp360SummaryCard";
import { useHrShifts } from "../../hooks/useHrShifts";
import { useHrLeaveBalances } from "../../hooks/useHrRequests";
import {
  balanceForType,
  displayLeaveBalances,
  leaveBalanceRemaining,
} from "../../lib/leavePolicy";
import { leaveOverlapsRange } from "../../lib/emp360DateRange";
import { emp360DetailPath } from "../../lib/emp360Paths";
import type { EmployeeRow, LeaveRequestRow } from "../../lib/types";

type Props = {
  employee: EmployeeRow;
  employeeId: string;
  profileSearch: string;
  from: string;
  to: string;
  leaves: LeaveRequestRow[];
};

function takenInRange(leaves: LeaveRequestRow[], from: string, to: string): number {
  return leaves
    .filter(
      (l) =>
        l.status === "Approved" &&
        leaveOverlapsRange(l.from_date, l.to_date, from, to),
    )
    .reduce((sum, l) => sum + Number(l.days), 0);
}

export function Emp360LeaveSummaryCard({
  employee,
  employeeId,
  profileSearch,
  from,
  to,
  leaves,
}: Props) {
  const { data: shifts = [] } = useHrShifts();
  const policyYear = new Date(to).getFullYear();
  const { data: balances = [], isLoading } = useHrLeaveBalances(employee.id, policyYear);
  const shift = shifts.find((s) => s.id === employee.shift_id);

  const rows = displayLeaveBalances(balances, employee.work_week, shift?.type);
  const casual = balanceForType(rows, "Casual Leave");
  const sick = balanceForType(rows, "Sick Leave");
  const casualRemaining = casual ? leaveBalanceRemaining(casual) : 0;
  const sickRemaining = sick ? leaveBalanceRemaining(sick) : 0;
  const earned = casual && sick ? Number(casual.accrued) + Number(sick.accrued) : 0;
  const remaining = casualRemaining + sickRemaining;
  const taken = takenInRange(leaves, from, to);

  return (
    <Emp360SummaryCard
      title="Leave summary"
      from={from}
      to={to}
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
        <div className="empty empty-sm">Loading balances…</div>
      ) : (
        <Emp360StatRow>
          <Stat variant="highlight" tone="green" lab="Casual leave" val={casualRemaining} meta="remaining" />
          <Stat variant="highlight" tone="cyan" lab="Sick leave" val={sickRemaining} meta="remaining" />
          <Stat variant="highlight" tone="blue" lab="Earned leave" val={earned} meta="accrued" />
          <Stat variant="highlight" tone="orange" lab="Taken" val={taken} meta="in period" />
          <Stat variant="highlight" tone="indigo" lab="Remaining" val={remaining} meta="total balance" />
        </Emp360StatRow>
      )}
    </Emp360SummaryCard>
  );
}
