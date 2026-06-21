import { Link } from "react-router-dom";
import { Emp360MetricList, Emp360SummaryCard } from "./Emp360SummaryCard";
import { fmtDur } from "../../lib/attendanceMetrics";
import { emp360DetailPath } from "../../lib/emp360Paths";
import type { AttendanceRollup } from "../../lib/emp360Rollups";

type Props = {
  employeeId: string;
  profileSearch: string;
  cycleLabel: string;
  rollup: AttendanceRollup | null;
};

export function Emp360AttendanceCard({
  employeeId,
  profileSearch,
  cycleLabel,
  rollup,
}: Props) {
  return (
    <Emp360SummaryCard
      title="Attendance"
      subtitle={`Current cycle · ${cycleLabel}`}
      action={
        <Link
          to={emp360DetailPath(employeeId, "attendance", profileSearch)}
          className="btn btn-sm"
        >
          View attendance
        </Link>
      }
    >
      <Emp360MetricList
        rows={[
          ["Present days", rollup?.present ?? "—"],
          ["Absent days", rollup?.absent ?? "—"],
          ["Half days", rollup?.halfDays ?? "—"],
          ["Late marks", rollup?.lateMarks ?? "—"],
          ["Mispunches", rollup?.mispunches ?? "—"],
          ["Working hours", rollup ? fmtDur(rollup.workingMinutes) : "—"],
        ]}
      />
    </Emp360SummaryCard>
  );
}
