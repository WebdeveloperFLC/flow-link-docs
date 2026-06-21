import { useEmp360Profile } from "../../context/Emp360ProfileContext";
import { useHrAttendance } from "../../hooks/useHrAttendance";
import { useEmp360SectionRange } from "../../hooks/useEmp360SectionRange";
import { Emp360AttendanceTable } from "../../components/emp360/Emp360AttendanceTable";
import { Emp360SectionDateFilter } from "../../components/emp360/Emp360SectionDateFilter";

export default function HrEmp360AttendancePage() {
  const { employee, shift } = useEmp360Profile();
  const { from, to } = useEmp360SectionRange("cycle");
  const { data: rows = [], isLoading } = useHrAttendance(employee.id, from, to);

  if (!shift) {
    return <div className="empty empty-sm">No shift assigned to this employee.</div>;
  }

  return (
    <div className="card emp360-detail-panel">
      <div className="card-h emp360-detail-panel-h">
        <h3>Attendance detail</h3>
      </div>
      <div className="emp360-detail-panel-filters">
        <Emp360SectionDateFilter kind="cycle" />
      </div>
      {isLoading ? (
        <div className="empty empty-sm">Loading attendance…</div>
      ) : (
        <Emp360AttendanceTable rows={rows} shift={shift} />
      )}
    </div>
  );
}
