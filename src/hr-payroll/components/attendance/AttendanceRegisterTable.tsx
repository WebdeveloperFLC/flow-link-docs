import { Link } from "react-router-dom";
import { StatusBadge } from "../ui/StatusBadge";
import { fmtDur } from "../../lib/attendanceMetrics";
import type { AttendanceRegisterRow } from "../../lib/attendanceRegister";
import { emp360ProfilePath } from "../../lib/emp360Paths";

type Props = {
  rows: AttendanceRegisterRow[];
  profileSearch?: string;
};

export function AttendanceRegisterTable({ rows, profileSearch }: Props) {
  if (rows.length === 0) {
    return <div className="empty empty-sm">No attendance records match your filters.</div>;
  }

  return (
    <div className="table-wrap">
      <table style={{ minWidth: 1080 }}>
        <thead>
          <tr>
            <th>Employee</th>
            <th>Date</th>
            <th>Check in</th>
            <th>Check out</th>
            <th>Break start</th>
            <th>Break end</th>
            <th>Net hours</th>
            <th>Break</th>
            <th>Status</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.attendanceId}>
              <td>
                <Link
                  to={emp360ProfilePath(r.employeeId, profileSearch)}
                  className="strong attendance-emp-link"
                >
                  {r.fullName}
                </Link>
                <div className="muted mono" style={{ fontSize: 11 }}>
                  {r.empCode}
                  {r.branchName ? ` · ${r.branchName}` : ""}
                </div>
              </td>
              <td className="mono">{r.workDate}</td>
              <td className="mono">{r.checkIn ?? "—"}</td>
              <td className="mono">{r.checkOut ?? "—"}</td>
              <td className="mono">{r.breakStart ?? "—"}</td>
              <td className="mono">{r.breakEnd ?? "—"}</td>
              <td className="mono">{fmtDur(r.netMinutes)}</td>
              <td className="mono">{fmtDur(r.breakMinutes)}</td>
              <td>
                <StatusBadge status={r.status} />
                {r.isMispunch && (
                  <span className="tag" style={{ marginLeft: 4 }}>Mispunch</span>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
