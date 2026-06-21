import { Link } from "react-router-dom";
import type { EmployeeShiftHistoryRow } from "../../lib/types";

function formatShiftTiming(row: EmployeeShiftHistoryRow) {
  const s = row.shifts;
  if (!s) return "—";
  const login = s.login_time?.slice(0, 5) ?? "—";
  const logout = s.logout_time?.slice(0, 5) ?? "—";
  return `${s.name} (${login}–${logout})`;
}

export function ShiftHistoryTable({
  rows,
  isLoading,
  emptyLabel = "No shift history recorded.",
  showEmployeeLink = true,
}: {
  rows: EmployeeShiftHistoryRow[];
  isLoading?: boolean;
  emptyLabel?: string;
  showEmployeeLink?: boolean;
}) {
  if (isLoading) {
    return <div className="empty">Loading shift history…</div>;
  }

  if (rows.length === 0) {
    return <div className="empty" style={{ padding: 16 }}>{emptyLabel}</div>;
  }

  return (
    <div style={{ overflowX: "auto" }}>
      <table style={{ minWidth: 640, fontSize: 12.5 }}>
        <thead>
          <tr>
            {showEmployeeLink && <th>Employee</th>}
            <th>Shift</th>
            <th>Effective from</th>
            <th>Effective to</th>
            <th>Reason</th>
            <th>Recorded</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.id}>
              {showEmployeeLink && (
                <td>
                  <div className="strong">{row.employees?.full_name ?? "—"}</div>
                  <div className="muted mono" style={{ fontSize: 11 }}>
                    {showEmployeeLink && row.employee_id ? (
                      <Link to={`/hr/employee/${row.employee_id}`}>
                        {row.employees?.emp_code ?? "—"}
                      </Link>
                    ) : (
                      row.employees?.emp_code ?? "—"
                    )}
                  </div>
                </td>
              )}
              <td>{formatShiftTiming(row)}</td>
              <td className="mono">{row.effective_from}</td>
              <td className="mono">{row.effective_to ?? "Current"}</td>
              <td className="muted" style={{ maxWidth: 220 }}>
                {row.change_reason ?? "—"}
              </td>
              <td className="mono muted" style={{ fontSize: 11 }}>
                {new Date(row.created_at).toLocaleDateString("en-IN", {
                  day: "2-digit",
                  month: "short",
                  year: "numeric",
                })}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
