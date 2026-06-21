import { Link } from "react-router-dom";
import type { AttendanceSummaryRow } from "../../lib/attendanceRegister";
import { emp360ProfilePath } from "../../lib/emp360Paths";

type Props = {
  rows: AttendanceSummaryRow[];
  profileSearch?: string;
};

export function AttendanceSummaryTable({ rows, profileSearch }: Props) {
  if (rows.length === 0) {
    return <div className="empty empty-sm">No employees match your filters.</div>;
  }

  const totals = {
    records: rows.reduce((s, r) => s + r.recordCount, 0),
    present: rows.reduce((s, r) => s + r.present, 0),
    absent: rows.reduce((s, r) => s + r.absent, 0),
    late: rows.reduce((s, r) => s + r.lateMarks, 0),
    leaves: rows.reduce((s, r) => s + r.leaves, 0),
    mispunches: rows.reduce((s, r) => s + r.mispunches, 0),
    working: rows.reduce((s, r) => s + r.workingDays, 0),
  };

  return (
    <div className="table-wrap">
      <table style={{ minWidth: 960 }}>
        <thead>
          <tr>
            <th>Employee</th>
            <th>Records</th>
            <th>Present</th>
            <th>Absent</th>
            <th>Late</th>
            <th>Half day</th>
            <th>Leaves</th>
            <th>Week off</th>
            <th>Mispunch</th>
            <th>Working days</th>
            <th>OT</th>
            <th>Working hours</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => {
            const otH = r.otMinutes
              ? `${Math.floor(r.otMinutes / 60)}h ${r.otMinutes % 60}m`
              : "—";
            return (
              <tr key={r.employeeId}>
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
                <td style={{ textAlign: "center" }}>{r.recordCount}</td>
                <td style={{ textAlign: "center" }}>{r.present}</td>
                <td style={{ textAlign: "center" }}>{r.absent}</td>
                <td style={{ textAlign: "center" }}>{r.lateMarks}</td>
                <td style={{ textAlign: "center" }}>{r.halfDays}</td>
                <td style={{ textAlign: "center" }}>{r.leaves}</td>
                <td style={{ textAlign: "center" }}>{r.weekOff}</td>
                <td style={{ textAlign: "center" }}>{r.mispunches}</td>
                <td style={{ textAlign: "center", fontWeight: 600 }}>{r.workingDays}</td>
                <td className="mono" style={{ fontSize: 11.5 }}>{otH}</td>
                <td className="mono" style={{ fontSize: 11.5 }}>{r.workingHours}</td>
              </tr>
            );
          })}
        </tbody>
        <tfoot>
          <tr className="attendance-summary-totals">
            <td className="strong">Totals ({rows.length} employees)</td>
            <td style={{ textAlign: "center" }}>{totals.records}</td>
            <td style={{ textAlign: "center" }}>{Math.round(totals.present * 10) / 10}</td>
            <td style={{ textAlign: "center" }}>{totals.absent}</td>
            <td style={{ textAlign: "center" }}>{totals.late}</td>
            <td />
            <td style={{ textAlign: "center" }}>{totals.leaves}</td>
            <td />
            <td style={{ textAlign: "center" }}>{totals.mispunches}</td>
            <td style={{ textAlign: "center", fontWeight: 700 }}>
              {Math.round(totals.working * 10) / 10}
            </td>
            <td />
            <td />
          </tr>
        </tfoot>
      </table>
    </div>
  );
}
