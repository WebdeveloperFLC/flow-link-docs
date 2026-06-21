import { useMemo } from "react";
import { useEmp360Profile } from "../../context/Emp360ProfileContext";
import { useHrEmployeePayrollHistory } from "../../hooks/useHrPayroll";
import { Emp360PayrollHistoryTable } from "../../components/emp360/Emp360PayrollHistoryTable";
import { Emp360CardDateStrip } from "../../components/emp360/Emp360CardDateStrip";
import { rangesOverlap } from "../../lib/emp360DateRange";

export default function HrEmp360PayrollHistoryPage() {
  const { employee, from, to, canExport } = useEmp360Profile();
  const { data: history = [], isLoading } = useHrEmployeePayrollHistory(employee.id);

  const filtered = useMemo(
    () =>
      history.filter((pl) => {
        const cycle = pl.payroll_cycles;
        if (!cycle?.start_date || !cycle?.end_date) return true;
        return rangesOverlap(cycle.start_date, cycle.end_date, from, to);
      }),
    [history, from, to],
  );

  return (
    <div className="card emp360-detail-panel">
      <div className="card-h">
        <h3>Payroll history</h3>
        <Emp360CardDateStrip from={from} to={to} />
      </div>
      {isLoading ? (
        <div className="empty empty-sm">Loading payroll history…</div>
      ) : (
        <Emp360PayrollHistoryTable
          employee={employee}
          rows={filtered}
          canExport={canExport}
        />
      )}
    </div>
  );
}
