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
      action={
        <Link
          to={emp360DetailPath(employeeId, "leaves", profileSearch)}
          className="btn btn-sm"
        >
          View leave history
        </Link>
      }
    >
      <p className="muted emp360-card-summary-hint">Policy year · {policyYear}</p>
      {isLoading ? (
        <div className="empty empty-sm">Loading balances…</div>
      ) : (
        <Emp360StatRow>
          <Stat variant="highlight" tone="green" lab="Casual leave" val={casualRemaining} meta="remaining" />
          <Stat variant="highlight" tone="cyan" lab="Sick leave" val={sickRemaining} meta="remaining" />
          <Stat variant="highlight" tone="blue" lab="Earned leave" val={earned} meta="accrued" />
          <Stat variant="highlight" tone="orange" lab="Taken" val={taken} meta="YTD" />
          <Stat variant="highlight" tone="indigo" lab="Remaining" val={remaining} meta="total balance" />
        </Emp360StatRow>
      )}
    </Emp360SummaryCard>
  );
}
