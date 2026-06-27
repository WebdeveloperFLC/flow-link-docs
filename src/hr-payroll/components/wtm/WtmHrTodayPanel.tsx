import { useMemo } from "react";
import { Link } from "react-router-dom";
import { useHrEmployees } from "../../hooks/useHrEmployees";
import { useWtmTodaySessions } from "../../hooks/useWtm";
import { todayIso } from "../../lib/attendanceMetrics";
import { WTM_SESSION_STATUS_LABEL } from "../../lib/wtmTypes";

export function WtmHrTodayPanel() {
  const today = todayIso();
  const { data: employees = [] } = useHrEmployees();
  const { data: sessions = [], isLoading } = useWtmTodaySessions(today);

  const empMap = useMemo(() => new Map(employees.map((e) => [e.id, e])), [employees]);

  const working = sessions.filter((s) => s.session_status === "Working");
  const onBreak = sessions.filter((s) => s.session_status === "On Break");
  const notClockedIn = employees.filter(
    (e) =>
      e.status !== "Resigned" &&
      e.status !== "Terminated" &&
      !sessions.some((s) => s.employee_id === e.id && s.clock_in),
  );

  return (
    <div className="card">
      <div className="card-h">
        <h3>Today&apos;s workforce time</h3>
        <span className="muted">{today}</span>
      </div>

      <div className="grid g4" style={{ marginBottom: 16 }}>
        <div className="ess-stat-tile">
          <div className="ess-stat-tile-label">Working now</div>
          <div className="ess-stat-tile-val">{working.length}</div>
        </div>
        <div className="ess-stat-tile">
          <div className="ess-stat-tile-label">On break</div>
          <div className="ess-stat-tile-val">{onBreak.length}</div>
        </div>
        <div className="ess-stat-tile">
          <div className="ess-stat-tile-label">Not clocked in</div>
          <div className="ess-stat-tile-val">{notClockedIn.length}</div>
        </div>
        <div className="ess-stat-tile">
          <div className="ess-stat-tile-label">Sessions today</div>
          <div className="ess-stat-tile-val">{sessions.length}</div>
        </div>
      </div>

      {isLoading ? (
        <div className="empty empty-sm">Loading sessions…</div>
      ) : (
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Employee</th>
                <th>Clock in</th>
                <th>Clock out</th>
                <th>Session status</th>
                <th>Attendance</th>
              </tr>
            </thead>
            <tbody>
              {sessions.length === 0 ? (
                <tr>
                  <td colSpan={5} className="muted">No attendance sessions for today yet.</td>
                </tr>
              ) : (
                sessions.map((s) => {
                  const emp = empMap.get(s.employee_id);
                  return (
                    <tr key={s.id}>
                      <td>
                        {emp ? (
                          <Link to={`/hr/employee/${emp.id}`}>{emp.full_name}</Link>
                        ) : (
                          s.employee_id.slice(0, 8)
                        )}
                      </td>
                      <td className="mono">{s.clock_in?.slice(0, 5) ?? "—"}</td>
                      <td className="mono">{s.clock_out?.slice(0, 5) ?? "—"}</td>
                      <td>{WTM_SESSION_STATUS_LABEL[s.session_status]}</td>
                      <td>{s.attendance_status}</td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
