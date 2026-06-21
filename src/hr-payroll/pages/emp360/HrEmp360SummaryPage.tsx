import { useMemo } from "react";
import { Link } from "react-router-dom";
import { useEmp360Profile } from "../../context/Emp360ProfileContext";
import { useHrEmployeePayrollHistory } from "../../hooks/useHrPayroll";
import { useHrAttendance } from "../../hooks/useHrAttendance";
import { useHrLeaveRequests, useHrTrainingRecords } from "../../hooks/useHrRequests";
import { useSalaryRevisions } from "../../hooks/useSalaryRevisions";
import { useEmployeeAssets } from "../../hooks/useEmployeeAssets";
import { useEmployeeShiftHistory } from "../../hooks/useEmployeeShiftHistory";
import { InfoCard } from "../../components/ui/InfoCard";
import { EmployeeAssetsDetailTable } from "../../components/employees/EmployeeAssetsDetailTable";
import { Emp360AttendanceCard } from "../../components/emp360/Emp360AttendanceCard";
import { Emp360LeaveSummaryCard } from "../../components/emp360/Emp360LeaveSummaryCard";
import { Emp360PayrollHistoryCard } from "../../components/emp360/Emp360PayrollHistoryCard";
import { Emp360TrainingCard } from "../../components/emp360/Emp360TrainingCard";
import { Emp360DocumentsCard } from "../../components/emp360/Emp360DocumentsCard";
import { Emp360ActivityTimeline } from "../../components/emp360/Emp360ActivityTimeline";
import { rollupAttendance } from "../../lib/emp360Rollups";
import { formatSecurityChequeUploadedAt } from "../../lib/securityCheque";
import {
  employeeCurrency,
  formatMoney,
  parseEmergencyContacts,
  payrollCompanyLabel,
} from "../../lib/format";
import { employmentTypeLabel } from "../../lib/emp360Filters";

export default function HrEmp360SummaryPage() {
  const {
    employee: emp,
    employees,
    shift,
    from,
    to,
    profileSearch,
  } = useEmp360Profile();

  const reportingManager = emp.reporting_mgr_id
    ? employees.find((e) => e.id === emp.reporting_mgr_id)
    : null;

  const { data: payrollHistory = [] } = useHrEmployeePayrollHistory(emp.id);
  const { data: revisions = [] } = useSalaryRevisions(emp.id);
  const { data: att = [] } = useHrAttendance(emp.id, from, to);
  const { data: allLeaves = [] } = useHrLeaveRequests();
  const { data: allTraining = [] } = useHrTrainingRecords();
  const { data: shiftHistory = [] } = useEmployeeShiftHistory({
    employeeId: emp.id,
    limit: 50,
  });
  const { data: employeeAssets = [], isLoading: assetsLoading } = useEmployeeAssets(emp.id);

  const leaves = useMemo(
    () => allLeaves.filter((l) => l.employee_id === emp.id),
    [allLeaves, emp.id],
  );
  const training = useMemo(
    () => allTraining.filter((t) => t.employee_id === emp.id),
    [allTraining, emp.id],
  );

  const rollup = shift ? rollupAttendance(att, shift) : null;
  const currency = employeeCurrency(emp);
  const money = (n: number | null | undefined) => formatMoney(n ?? 0, currency);
  const emergencyContacts = parseEmergencyContacts(emp.emergency_contacts);

  return (
    <>
      <div className="emp360-summary-grid">
        <Emp360AttendanceCard
          employeeId={emp.id}
          profileSearch={profileSearch}
          from={from}
          to={to}
          rollup={rollup}
        />
        <Emp360LeaveSummaryCard
          employee={emp}
          employeeId={emp.id}
          profileSearch={profileSearch}
          from={from}
          to={to}
          leaves={leaves}
        />
        <Emp360PayrollHistoryCard
          employee={emp}
          employeeId={emp.id}
          profileSearch={profileSearch}
          from={from}
          to={to}
          history={payrollHistory}
        />
        <Emp360TrainingCard
          employeeId={emp.id}
          profileSearch={profileSearch}
          from={from}
          to={to}
          records={training}
        />
        <Emp360DocumentsCard
          employee={emp}
          employeeId={emp.id}
          profileSearch={profileSearch}
        />
      </div>

      <Emp360ActivityTimeline
        from={from}
        to={to}
        attendance={att}
        leaves={leaves}
        payroll={payrollHistory}
        training={training}
        shiftHistory={shiftHistory}
      />

      <div className="grid g2">
        <InfoCard
          title="Personal information"
          rows={[
            ["Full name", emp.full_name],
            ["Email", emp.email],
            ["Mobile", emp.mobile],
            ["Nationality", emp.nationality],
            ["Marital status", emp.marital_status],
            ["Blood group", emp.blood_group],
            ["Date of birth", emp.dob],
            ...emergencyContacts
              .filter((c) => c.name || c.phone)
              .flatMap((c, i) => [
                [`Emergency ${i + 1}`, `${c.name} · ${c.phone} (${c.relation})`],
              ] as [string, string][]),
          ]}
        />
        <InfoCard
          title="Employment information"
          rows={[
            ["Department", emp.departments?.name ?? emp.department],
            ["Designation", emp.designations?.name ?? emp.designation],
            [
              "Reporting manager",
              reportingManager
                ? `${reportingManager.full_name} (${reportingManager.emp_code})`
                : null,
            ],
            ["Date of joining", emp.date_of_joining],
            [
              "Probation",
              [emp.probation_start_date, emp.probation_end_date].filter(Boolean).join(" – ") || null,
            ],
            ["Notice period", emp.notice_period],
            ["Employee status", emp.status],
            ["Employee category", emp.hr_employee_categories?.label],
            ["Employment type", employmentTypeLabel(emp)],
            ["Payroll company", emp.companies ? payrollCompanyLabel(emp.companies) : null],
            ["Payroll country", emp.payroll_country ?? "IN"],
            ["Salary currency", currency],
            ["Branch", emp.branches?.name],
            [
              "Shift",
              emp.shifts
                ? `${emp.shifts.name} (${emp.shifts.login_time?.slice(0, 5)}–${emp.shifts.logout_time?.slice(0, 5)})`
                : null,
            ],
          ]}
        />
      </div>

      <div className="grid g2">
        <InfoCard
          title="Exit information"
          rows={[
            ["Exit date", emp.exit_date],
            ["Exit reason", emp.exit_reason],
            ["Rehire eligible", emp.rehire_eligible ? "Yes" : emp.exit_date ? "No" : null],
          ]}
        />
        <InfoCard
          title="Bank information"
          rows={[
            ["Bank", emp.bank_name],
            ["Account number", emp.bank_account_number],
            ["IFSC", emp.bank_ifsc],
            ["Verification", emp.bank_verified ? "Verified" : "Pending"],
            ...(emp.bank_verified
              ? [
                  ["Verified by", emp.bank_verified_by],
                  ["Verified at", formatSecurityChequeUploadedAt(emp.bank_verified_at)],
                ]
              : []),
          ]}
        />
      </div>

      <InfoCard
        title="Salary information"
        rows={[
          ["Monthly gross", money(emp.monthly_gross)],
          ["Basic", money(emp.basic)],
          ["HRA", money(emp.hra)],
          ["Other deductions/mo", emp.other_deductions ? money(emp.other_deductions) : "—"],
          ["PF number", emp.pf_number],
          ["UAN", emp.uan],
          ["ESIC", emp.esic_number],
        ]}
      />

      {revisions.length > 0 && (
        <div className="card">
          <div className="card-h">
            <h3>Salary revisions</h3>
          </div>
          <div className="table-wrap">
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

      <div className="card">
        <div className="card-h">
          <h3>Assets</h3>
          <Link to="/hr/employees" className="btn btn-sm">Edit in Employee Master →</Link>
        </div>
        {assetsLoading ? (
          <div className="empty empty-sm">Loading assets…</div>
        ) : (
          <EmployeeAssetsDetailTable assets={employeeAssets} />
        )}
      </div>
    </>
  );
}
