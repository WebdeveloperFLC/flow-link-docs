import { useEmp360Profile } from "../../context/Emp360ProfileContext";
import { useHrAttendance } from "../../hooks/useHrAttendance";
import { Emp360AttendanceTable } from "../../components/emp360/Emp360AttendanceTable";
import { Emp360CardDateStrip } from "../../components/emp360/Emp360CardDateStrip";

export default function HrEmp360AttendancePage() {
  const { employee, shift, from, to } = useEmp360Profile();
  const { data: rows = [], isLoading } = useHrAttendance(employee.id, from, to);

  if (!shift) {
    return <div className="empty empty-sm">No shift assigned to this employee.</div>;
  }

  return (
    <div className="card emp360-detail-panel">
      <div className="card-h">
        <h3>Attendance detail</h3>
        <Emp360CardDateStrip from={from} to={to} />
      </div>
      {isLoading ? (
        <div className="empty empty-sm">Loading attendance…</div>
      ) : (
        <Emp360AttendanceTable rows={rows} shift={shift} />
      )}
    </div>
  );
}
