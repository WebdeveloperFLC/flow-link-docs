import { Link } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useHrEmployees } from "../../hooks/useHrEmployees";
import { useWtmHistory } from "../../hooks/useWtm";
import { fmtDur } from "../../lib/attendanceMetrics";

export default function WtmEssHistoryPage() {
  const { user } = useAuth();
  const { data: employees = [] } = useHrEmployees();
  const emp = employees.find((e) => e.staff_id === user?.id);
  const { data: rows = [], isLoading } = useWtmHistory(emp?.id, 90);

  if (!emp) {
    return (
      <div className="empty">
        <div className="ico">👤</div>
        Employee profile required. <Link to="/hr/me">Go to My Portal →</Link>
      </div>
    );
  }

  return (
    <div className="page-grid">
      <Link to="/hr/me" className="btn btn-sm">← Back to My Portal</Link>
      <div className="card">
        <div className="card-h">
          <h3>Attendance history</h3>
          <span className="muted">{emp.full_name}</span>
        </div>
        {isLoading ? (
          <div className="empty empty-sm">Loading attendance history…</div>
        ) : (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Clock in</th>
                  <th>Clock out</th>
                  <th>Working</th>
                  <th>Break</th>
                  <th>Status</th>
                  <th>Session</th>
                </tr>
              </thead>
              <tbody>
                {rows.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="muted">No attendance sessions yet.</td>
                  </tr>
                ) : (
                  rows.map((r) => (
                    <tr key={r.id}>
                      <td>{r.work_date}</td>
                      <td className="mono">{r.clock_in?.slice(0, 5) ?? "—"}</td>
                      <td className="mono">{r.clock_out?.slice(0, 5) ?? "—"}</td>
                      <td className="mono">{fmtDur(r.working_duration_min)}</td>
                      <td className="mono">{fmtDur(r.break_duration_min)}</td>
                      <td>{r.attendance_status}</td>
                      <td>{r.session_status}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
