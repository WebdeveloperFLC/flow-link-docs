import { useState } from "react";
import { Emp360MetricGrid, Emp360SummaryCard } from "./Emp360SummaryCard";
import { Emp360LeaveHistoryModal } from "./Emp360LeaveHistoryModal";
import { balanceForType, leaveBalanceRemaining } from "../../lib/leavePolicy";
import { leaveOverlapsRange } from "../../lib/emp360DateRange";
import { useHrLeaveBalances } from "../../hooks/useHrRequests";
import type { ApprovalRow, EmployeeRow, LeaveRequestRow } from "../../lib/types";

type Props = {
  employee: EmployeeRow;
  from: string;
  to: string;
  leaves: LeaveRequestRow[];
  approvals: ApprovalRow[];
  employees: EmployeeRow[];
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
  from,
  to,
  leaves,
  approvals,
  employees,
}: Props) {
  const [open, setOpen] = useState(false);
  const policyYear = new Date(to).getFullYear();
  const { data: balances = [] } = useHrLeaveBalances(employee.id, policyYear);

  const casual = balanceForType(balances, "Casual Leave");
  const sick = balanceForType(balances, "Sick Leave");
  const casualRemaining = casual ? leaveBalanceRemaining(casual) : "—";
  const sickRemaining = sick ? leaveBalanceRemaining(sick) : "—";
  const earned =
    casual && sick
      ? Number(casual.accrued) + Number(sick.accrued)
      : casual
        ? Number(casual.accrued)
        : sick
          ? Number(sick.accrued)
          : "—";
  const remaining =
    casual && sick
      ? leaveBalanceRemaining(casual) + leaveBalanceRemaining(sick)
      : casual
        ? leaveBalanceRemaining(casual)
        : sick
          ? leaveBalanceRemaining(sick)
          : "—";

  const rangeLeaves = leaves.filter((l) =>
    leaveOverlapsRange(l.from_date, l.to_date, from, to),
  );
  const taken = takenInRange(leaves, from, to);

  return (
    <>
      <Emp360SummaryCard
        title="Leave summary"
        action={
          <button type="button" className="btn btn-sm" onClick={() => setOpen(true)}>
            View leave history
          </button>
        }
      >
        <Emp360MetricGrid
          rows={[
            ["Casual leave", casualRemaining],
            ["Sick leave", sickRemaining],
            ["Earned leave", earned],
            ["Taken", taken],
            ["Remaining", remaining],
          ]}
        />
      </Emp360SummaryCard>

      <Emp360LeaveHistoryModal
        open={open}
        onClose={() => setOpen(false)}
        employeeName={employee.full_name}
        from={from}
        to={to}
        rows={rangeLeaves}
        approvals={approvals}
        employees={employees}
      />
    </>
  );
}
