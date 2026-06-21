import { useMemo } from "react";
import { useEmp360Profile } from "../../context/Emp360ProfileContext";
import { useHrApprovals, useHrLeaveRequests } from "../../hooks/useHrRequests";
import { Emp360LeaveHistoryTable } from "../../components/emp360/Emp360LeaveHistoryTable";
import { Emp360CardDateStrip } from "../../components/emp360/Emp360CardDateStrip";
import { leaveOverlapsRange } from "../../lib/emp360DateRange";

export default function HrEmp360LeaveHistoryPage() {
  const { employee, employees, from, to } = useEmp360Profile();
  const { data: allLeaves = [], isLoading } = useHrLeaveRequests();

  const leaves = useMemo(
    () => allLeaves.filter((l) => l.employee_id === employee.id),
    [allLeaves, employee.id],
  );
  const rangeLeaves = useMemo(
    () => leaves.filter((l) => leaveOverlapsRange(l.from_date, l.to_date, from, to)),
    [leaves, from, to],
  );
  const leaveIds = useMemo(() => leaves.map((l) => l.id), [leaves]);
  const { data: approvals = [] } = useHrApprovals("leave", leaveIds);

  return (
    <div className="card emp360-detail-panel">
      <div className="card-h">
        <h3>Leave history</h3>
        <Emp360CardDateStrip from={from} to={to} />
      </div>
      {isLoading ? (
        <div className="empty empty-sm">Loading leave requests…</div>
      ) : (
        <Emp360LeaveHistoryTable
          rows={rangeLeaves}
          approvals={approvals}
          employees={employees}
        />
      )}
    </div>
  );
}
