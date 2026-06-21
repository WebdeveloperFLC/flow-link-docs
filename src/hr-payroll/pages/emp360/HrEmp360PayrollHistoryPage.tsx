import { useMemo } from "react";
import { useEmp360Profile } from "../../context/Emp360ProfileContext";
import { useHrEmployeePayrollHistory } from "../../hooks/useHrPayroll";
import { useEmp360SectionRange } from "../../hooks/useEmp360SectionRange";
import { Emp360PayrollHistoryTable } from "../../components/emp360/Emp360PayrollHistoryTable";
import { Emp360SectionDateFilter } from "../../components/emp360/Emp360SectionDateFilter";
import { rangesOverlap } from "../../lib/emp360DateRange";

export default function HrEmp360PayrollHistoryPage() {
  const { employee, canExport } = useEmp360Profile();
  const { from, to } = useEmp360SectionRange("cycle");
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
      <div className="card-h emp360-detail-panel-h">
        <h3>Payroll history</h3>
      </div>
      <div className="emp360-detail-panel-filters">
        <Emp360SectionDateFilter kind="cycle" />
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
