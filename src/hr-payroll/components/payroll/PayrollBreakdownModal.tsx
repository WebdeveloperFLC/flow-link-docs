import { useEffect, useState } from "react";
import { ModalShell } from "../ui/ModalShell";
import { useHrAttendance } from "../../hooks/useHrAttendance";
import { rpcRollupInputs } from "../../hooks/useHrPayroll";
import { splitAttendanceDays } from "../../lib/payrollBreakdown";
import type { PayrollCycleRow, PayrollLineRow } from "../../lib/types";
import { PayrollBreakdownPanel } from "./PayrollBreakdownPanel";

export function PayrollBreakdownModal({
  line,
  cycle,
  onClose,
}: {
  line: PayrollLineRow;
  cycle: PayrollCycleRow;
  onClose: () => void;
}) {
  const [rollup, setRollup] = useState<unknown>(line.input_snapshot ?? null);
  const [loading, setLoading] = useState(!line.input_snapshot);

  const { data: att = [] } = useHrAttendance(line.employee_id, cycle.start_date, cycle.end_date);
  const attendanceSplit = att.length ? splitAttendanceDays(att) : null;

  useEffect(() => {
    if (line.input_snapshot) {
      setRollup(line.input_snapshot);
      setLoading(false);
      return;
    }
    let cancelled = false;
    setLoading(true);
    void rpcRollupInputs(line.employee_id, cycle.id)
      .then((d) => {
        if (!cancelled) setRollup(d);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [line.employee_id, line.input_snapshot, cycle.id]);

  const name = line.employees?.full_name ?? "Employee";

  return (
    <ModalShell
      title={`Payroll breakdown — ${name}`}
      wide
      onClose={onClose}
      footer={
        <button type="button" className="btn btn-primary" onClick={onClose}>
          Close
        </button>
      }
    >
      {loading ? (
        <div className="empty">Loading attendance roll-up…</div>
      ) : (
        <PayrollBreakdownPanel
          line={line}
          cycle={cycle}
          snapshot={rollup}
          attendanceSplit={attendanceSplit}
        />
      )}
    </ModalShell>
  );
}
