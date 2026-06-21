import { useState } from "react";
import { Emp360MetricGrid, Emp360SummaryCard } from "./Emp360SummaryCard";
import { Emp360AttendanceDetailModal } from "./Emp360AttendanceDetailModal";
import { fmtDur } from "../../lib/attendanceMetrics";
import type { AttendanceRollup } from "../../lib/emp360Rollups";
import type { AttendanceRow, ShiftRow } from "../../lib/types";

type Props = {
  from: string;
  to: string;
  employeeName: string;
  rollup: AttendanceRollup | null;
  rows: AttendanceRow[];
  shift: ShiftRow | undefined;
};

export function Emp360AttendanceCard({
  from,
  to,
  employeeName,
  rollup,
  rows,
  shift,
}: Props) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <Emp360SummaryCard
        title="Attendance"
        action={
          <button type="button" className="btn btn-sm" onClick={() => setOpen(true)}>
            View attendance
          </button>
        }
      >
        <Emp360MetricGrid
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

      {shift && (
        <Emp360AttendanceDetailModal
          open={open}
          onClose={() => setOpen(false)}
          employeeName={employeeName}
          from={from}
          to={to}
          rows={rows}
          shift={shift}
        />
      )}
    </>
  );
}
