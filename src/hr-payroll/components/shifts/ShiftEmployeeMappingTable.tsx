import { Link } from "react-router-dom";
import type { EmployeeRow } from "../../lib/types";

export function ShiftEmployeeMappingTable({
  employees,
  shiftsById,
  isLoading,
  shiftFilter,
}: {
  employees: EmployeeRow[];
  shiftsById: Record<string, { name: string; login_time?: string; logout_time?: string }>;
  isLoading?: boolean;
  shiftFilter: string;
}) {
  const mapped = employees
    .filter((e) => e.shift_id)
    .filter((e) => shiftFilter === "All" || e.shift_id === shiftFilter)
    .sort((a, b) => a.full_name.localeCompare(b.full_name));

  if (isLoading) {
    return <div className="empty">Loading employee mappings…</div>;
  }

  if (mapped.length === 0) {
    return (
      <div className="empty" style={{ padding: 16 }}>
        No employees assigned to {shiftFilter === "All" ? "any shift" : "this shift"}.
      </div>
    );
  }

  return (
    <div style={{ overflowX: "auto" }}>
      <table style={{ minWidth: 520, fontSize: 12.5 }}>
        <thead>
          <tr>
            <th>Employee</th>
            <th>Code</th>
            <th>Branch</th>
            <th>Shift</th>
            <th>Status</th>
            <th />
          </tr>
        </thead>
        <tbody>
          {mapped.map((e) => {
            const shift = e.shift_id ? shiftsById[e.shift_id] : null;
            const timing =
              shift
                ? `${shift.name} (${shift.login_time?.slice(0, 5) ?? "—"}–${shift.logout_time?.slice(0, 5) ?? "—"})`
                : "—";
            return (
              <tr key={e.id}>
                <td className="strong">{e.full_name}</td>
                <td className="mono">{e.emp_code}</td>
                <td>{e.branches?.name ?? "—"}</td>
                <td>{timing}</td>
                <td>{e.status}</td>
                <td>
                  <Link to={`/hr/employee/${e.id}`} className="btn btn-sm">
                    360 →
                  </Link>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
