import { useMemo } from "react";
import { Link } from "react-router-dom";
import { useEmp360Profile } from "../../context/Emp360ProfileContext";
import { useHrEmployeePayrollHistory } from "../../hooks/useHrPayroll";
import { useHrAttendance } from "../../hooks/useHrAttendance";
import { useHrAuditLogs, useHrLeaveRequests, useHrTrainingRecords } from "../../hooks/useHrRequests";
import { useSalaryRevisions } from "../../hooks/useSalaryRevisions";
import { useEmployeeAssets } from "../../hooks/useEmployeeAssets";
import { useEmployeeShiftHistory } from "../../hooks/useEmployeeShiftHistory";
import { EmployeeAssetsDetailTable } from "../../components/employees/EmployeeAssetsDetailTable";
import { Emp360AttendanceCard } from "../../components/emp360/Emp360AttendanceCard";
import { Emp360LeaveSummaryCard } from "../../components/emp360/Emp360LeaveSummaryCard";
import { Emp360PayrollHistoryCard } from "../../components/emp360/Emp360PayrollHistoryCard";
import { Emp360TrainingCard } from "../../components/emp360/Emp360TrainingCard";
import { Emp360DocumentsCard } from "../../components/emp360/Emp360DocumentsCard";
import { Emp360EmployeeDetails } from "../../components/emp360/Emp360EmployeeDetails";
import { Emp360ActivityTimeline } from "../../components/emp360/Emp360ActivityTimeline";
import { rollupAttendance } from "../../lib/emp360Rollups";
import { employeeCurrency, formatMoney } from "../../lib/format";

export default function HrEmp360SummaryPage() {
  const {
    employee: emp,
    employees,
    shift,
    cycleFrom,
    cycleTo,
    cycleLabel,
    profileSearch,
  } = useEmp360Profile();

  const { data: payrollHistory = [] } = useHrEmployeePayrollHistory(emp.id);
  const { data: revisions = [] } = useSalaryRevisions(emp.id);
  const { data: att = [] } = useHrAttendance(emp.id, cycleFrom, cycleTo);
  const { data: allTraining = [] } = useHrTrainingRecords();
  const { data: allAudit = [] } = useHrAuditLogs();
  const { data: shiftHistory = [] } = useEmployeeShiftHistory({
    employeeId: emp.id,
    limit: 50,
  });
  const { data: employeeAssets = [], isLoading: assetsLoading } = useEmployeeAssets(emp.id);

  const training = useMemo(
    () => allTraining.filter((t) => t.employee_id === emp.id),
    [allTraining, emp.id],
  );

  const rollup = shift ? rollupAttendance(att, shift) : null;
  const currency = employeeCurrency(emp);
  const money = (n: number | null | undefined) => formatMoney(n ?? 0, currency);

  return (
    <>
      <div className="emp360-summary-grid">
        <Emp360AttendanceCard
          employeeId={emp.id}
          profileSearch={profileSearch}
          cycleLabel={cycleLabel}
          rollup={rollup}
        />
        <Emp360LeaveSummaryCard
          employee={emp}
          employeeId={emp.id}
          profileSearch={profileSearch}
        />
        <Emp360PayrollHistoryCard
          employee={emp}
          employeeId={emp.id}
          profileSearch={profileSearch}
          history={payrollHistory}
        />
        <Emp360TrainingCard
          employeeId={emp.id}
          profileSearch={profileSearch}
          records={training}
        />
        <Emp360DocumentsCard
          employee={emp}
          employeeId={emp.id}
          profileSearch={profileSearch}
        />
      </div>

      <Emp360EmployeeDetails emp={emp} employees={employees} />

      {revisions.length > 0 && (
        <div className="card emp360-section-card">
          <div className="card-h">
            <h3>Salary revisions</h3>
          </div>
          <div className="table-wrap emp360-table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Old</th>
                  <th>New</th>
                  <th>Remarks</th>
                </tr>
              </thead>
              <tbody>
                {revisions.map((rev) => (
                  <tr key={rev.id}>
                    <td>{rev.effective_date}</td>
                    <td className="mono">{money(rev.old_salary)}</td>
                    <td className="mono">{money(rev.new_salary)}</td>
                    <td className="muted">{rev.remarks ?? "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <div className="card emp360-section-card">
        <div className="card-h">
          <h3>Assets</h3>
          <Link to="/hr/employees" className="btn btn-sm">Edit in Employee Master →</Link>
        </div>
        {assetsLoading ? (
          <div className="empty empty-sm">Loading assets…</div>
        ) : (
          <div className="emp360-table-wrap">
            <EmployeeAssetsDetailTable assets={employeeAssets} />
          </div>
        )}
      </div>

      <Emp360ActivityTimeline
        employeeName={emp.full_name}
        employeeCode={emp.emp_code}
        shiftHistory={shiftHistory}
        auditLogs={allAudit}
      />
    </>
  );
}
