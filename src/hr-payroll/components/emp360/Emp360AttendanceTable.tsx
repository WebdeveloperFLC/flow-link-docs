import { StatusBadge } from "../../components/ui/StatusBadge";
import { dayMetrics, fmtDur } from "../../lib/attendanceMetrics";
import { shiftMetricsFromShift } from "../../lib/emp360Rollups";
import type { AttendanceRow, ShiftRow } from "../../lib/types";

type Props = {
  rows: AttendanceRow[];
  shift: ShiftRow;
};

export function Emp360AttendanceTable({ rows, shift }: Props) {
  const sw = shiftMetricsFromShift(shift);
  const sorted = [...rows].sort((a, b) => b.work_date.localeCompare(a.work_date));

  if (sorted.length === 0) {
    return <div className="empty empty-sm">No attendance records in this range.</div>;
  }

  return (
    <div className="table-wrap">
      <table>
        <thead>
          <tr>
            <th>Date</th>
            <th>Check in</th>
            <th>Break start</th>
            <th>Break end</th>
            <th>Check out</th>
            <th>Working hours</th>
            <th>Break duration</th>
            <th>Status</th>
          </tr>
        </thead>
        <tbody>
          {sorted.map((a) => {
            const dm = dayMetrics(a, sw);
            return (
              <tr key={a.id}>
                <td className="mono">{a.work_date}</td>
                <td className="mono">{a.check_in?.slice(0, 5) ?? "—"}</td>
                <td className="mono">{a.break_start?.slice(0, 5) ?? "—"}</td>
                <td className="mono">{a.break_end?.slice(0, 5) ?? "—"}</td>
                <td className="mono">{a.check_out?.slice(0, 5) ?? "—"}</td>
                <td className="mono">{fmtDur(dm.net)}</td>
                <td className="mono">{fmtDur(dm.breakMin)}</td>
                <td>
                  <StatusBadge status={a.status} />
                  {a.is_mispunch && <span className="tag" style={{ marginLeft: 4 }}>Mispunch</span>}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
