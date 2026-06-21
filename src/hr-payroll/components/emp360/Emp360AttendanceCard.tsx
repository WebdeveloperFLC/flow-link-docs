import { Link } from "react-router-dom";
import { Stat } from "../ui/Stat";
import { Emp360StatRow, Emp360SummaryCard } from "./Emp360SummaryCard";
import { fmtDur } from "../../lib/attendanceMetrics";
import { emp360DetailPath } from "../../lib/emp360Paths";
import type { AttendanceRollup } from "../../lib/emp360Rollups";

type Props = {
  employeeId: string;
  profileSearch: string;
  from: string;
  to: string;
  rollup: AttendanceRollup | null;
};

export function Emp360AttendanceCard({
  employeeId,
  profileSearch,
  from,
  to,
  rollup,
}: Props) {
  return (
    <Emp360SummaryCard
      title="Attendance"
      from={from}
      to={to}
      action={
        <Link
          to={emp360DetailPath(employeeId, "attendance", profileSearch)}
          className="btn btn-sm"
        >
          View attendance
        </Link>
      }
    >
      <Emp360StatRow>
        <Stat variant="highlight" tone="green" lab="Present days" val={rollup?.present ?? "—"} />
        <Stat variant="highlight" tone="rose" lab="Absent days" val={rollup?.absent ?? "—"} />
        <Stat variant="highlight" tone="orange" lab="Half days" val={rollup?.halfDays ?? "—"} />
        <Stat variant="highlight" tone="gold" lab="Late marks" val={rollup?.lateMarks ?? "—"} />
        <Stat variant="highlight" tone="purple" lab="Mispunches" val={rollup?.mispunches ?? "—"} />
        <Stat
          variant="highlight"
          tone="blue"
          lab="Working hours"
          val={rollup ? fmtDur(rollup.workingMinutes) : "—"}
        />
      </Emp360StatRow>
    </Emp360SummaryCard>
  );
}
