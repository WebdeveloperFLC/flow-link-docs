import { useMemo } from "react";
import { useEmp360Profile } from "../../context/Emp360ProfileContext";
import { useHrApprovals, useHrLeaveRequests } from "../../hooks/useHrRequests";
import { useEmp360SectionRange } from "../../hooks/useEmp360SectionRange";
import { Emp360LeaveHistoryTable } from "../../components/emp360/Emp360LeaveHistoryTable";
import { Emp360SectionDateFilter } from "../../components/emp360/Emp360SectionDateFilter";
import { leaveOverlapsRange } from "../../lib/emp360DateRange";

export default function HrEmp360LeaveHistoryPage() {
  const { employee, employees } = useEmp360Profile();
  const { from, to } = useEmp360SectionRange("leaveYear");
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
      <div className="card-h emp360-detail-panel-h">
        <h3>Leave history</h3>
      </div>
      <div className="emp360-detail-panel-filters">
        <Emp360SectionDateFilter kind="leaveYear" />
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
