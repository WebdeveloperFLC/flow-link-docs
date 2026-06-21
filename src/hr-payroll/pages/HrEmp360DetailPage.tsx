import { useMemo } from "react";
import { Link, useParams, useSearchParams } from "react-router-dom";
import { useHrAccess } from "../context/HrPayrollProvider";
import { useHrEmployees } from "../hooks/useHrEmployees";
import { useHrEmployeePayrollHistory } from "../hooks/useHrPayroll";
import { useHrAttendance } from "../hooks/useHrAttendance";
import { useHrShifts } from "../hooks/useHrShifts";
import { useSalaryRevisions } from "../hooks/useSalaryRevisions";
import {
  useHrApprovals,
  useHrLeaveRequests,
  useHrTrainingRecords,
} from "../hooks/useHrRequests";
import { InfoCard } from "../components/ui/InfoCard";
import { EmployeeAssetsDetailTable } from "../components/employees/EmployeeAssetsDetailTable";
import { EmployeeAvatar } from "../components/ui/EmployeeAvatar";
import { Emp360DateRangeBar } from "../components/emp360/Emp360DateRangeBar";
import { Emp360AttendanceCard } from "../components/emp360/Emp360AttendanceCard";
import { Emp360LeaveSummaryCard } from "../components/emp360/Emp360LeaveSummaryCard";
import { Emp360PayrollHistoryCard } from "../components/emp360/Emp360PayrollHistoryCard";
import { Emp360TrainingCard } from "../components/emp360/Emp360TrainingCard";
import { Emp360DocumentsCard } from "../components/emp360/Emp360DocumentsCard";
import { Emp360ActivityTimeline } from "../components/emp360/Emp360ActivityTimeline";
import { useEmployeeAssets } from "../hooks/useEmployeeAssets";
import { useEmployeeShiftHistory } from "../hooks/useEmployeeShiftHistory";
import { emp360RangeFromSearchParams } from "../lib/emp360DateRange";
import { rollupAttendance } from "../lib/emp360Rollups";
import { formatSecurityChequeUploadedAt } from "../lib/securityCheque";
import {
  displayEmployeeName,
  employeeCurrency,
  employeeStatusLabel,
  formatMoney,
  parseEmergencyContacts,
  payrollCompanyLabel,
} from "../lib/format";
import {
  employmentTypeLabel,
  emp360FiltersToSearchParams,
  emp360FiltersFromSearchParams,
} from "../lib/emp360Filters";

export default function HrEmp360DetailPage() {
  const { id } = useParams<{ id: string }>();
  const [searchParams] = useSearchParams();
  const { cycle, can } = useHrAccess();
  const {
    data: employees = [],
    isLoading: employeesLoading,
    isError: employeesError,
    error: employeesLoadError,
  } = useHrEmployees({ activeOnly: false });
  const { data: shifts = [] } = useHrShifts();

  const emp = employees.find((e) => e.id === id);
  const listFilters = useMemo(() => emp360FiltersFromSearchParams(searchParams), [searchParams]);
  const listQuery = emp360FiltersToSearchParams(listFilters).toString();
  const { from, to } = emp360RangeFromSearchParams(searchParams, cycle);
  const backHref = listQuery
    ? `/hr/employee?${emp360FiltersToSearchParams(listFilters).toString()}`
    : "/hr/employee";

  const shift = shifts.find((s) => s.id === emp?.shift_id) ?? shifts[0];
  const reportingManager = emp?.reporting_mgr_id
    ? employees.find((e) => e.id === emp.reporting_mgr_id)
    : null;

  const { data: payrollHistory = [] } = useHrEmployeePayrollHistory(emp?.id);
  const { data: revisions = [] } = useSalaryRevisions(emp?.id);
  const { data: att = [] } = useHrAttendance(emp?.id, from, to);
  const { data: allLeaves = [] } = useHrLeaveRequests();
  const { data: allTraining = [] } = useHrTrainingRecords();
  const { data: shiftHistory = [] } = useEmployeeShiftHistory({
    employeeId: emp?.id,
    limit: 50,
  });
  const { data: employeeAssets = [], isLoading: assetsLoading } = useEmployeeAssets(emp?.id);

  const leaves = useMemo(
    () => allLeaves.filter((l) => l.employee_id === emp?.id),
    [allLeaves, emp?.id],
  );
  const training = useMemo(
    () => allTraining.filter((t) => t.employee_id === emp?.id),
    [allTraining, emp?.id],
  );

  const leaveIds = useMemo(() => leaves.map((l) => l.id), [leaves]);
  const { data: approvals = [] } = useHrApprovals("leave", leaveIds);

  const rollup = shift ? rollupAttendance(att, shift) : null;
  const currency = employeeCurrency(emp);
  const money = (n: number | null | undefined) => formatMoney(n ?? 0, currency);

  const emergencyContacts = parseEmergencyContacts(emp?.emergency_contacts);

  if (employeesLoading) {
    return <div className="empty">Loading employee profile…</div>;
  }

  if (employeesError) {
    return (
      <div className="empty">
        <div className="ico">⚠</div>
        Could not load employees:{" "}
        {employeesLoadError instanceof Error ? employeesLoadError.message : "Request failed"}
      </div>
    );
  }

  if (!emp) {
    return (
      <div className="page-grid">
        <Link to={backHref} className="btn btn-sm emp360-back-btn">← Back to employee list</Link>
        <div className="empty">
          <div className="ico">👤</div>
          Employee not found or you do not have access.
        </div>
      </div>
    );
  }

  const cycleLabel = cycle?.label ?? "Current cycle";

  return (
    <div className="page-grid">
      <div className="emp360-detail-top">
        <Link to={backHref} className="btn btn-sm emp360-back-btn">← Back to employee list</Link>
      </div>

      <Emp360DateRangeBar from={from} to={to} cycleLabel={cycleLabel} />

      <div className="card ess-hero emp360-profile-hero">
        <div className="ess-hero-inner">
          <EmployeeAvatar name={emp.full_name} photoUrl={emp.photo_url} size={64} fontSize={22} />
          <div className="ess-hero-main">
            <div className="ess-hero-title">{displayEmployeeName(emp)}</div>
            <div className="ess-hero-sub mono">{emp.emp_code}</div>
            <div className="ess-hero-sub">
              {emp.designations?.name ?? emp.designation} · {emp.departments?.name ?? emp.department} ·{" "}
              {emp.branches?.name ?? "—"}
            </div>
            <div className="ess-hero-tags">
              <span className={`ess-status ess-status--${emp.status === "Confirmed" ? "good" : "mut"}`}>
                {employeeStatusLabel(emp.status)}
              </span>
              <span className="ess-chip">{employmentTypeLabel(emp)}</span>
              <span className="ess-chip">{emp.mobile ?? "—"}</span>
            </div>
          </div>
        </div>
      </div>

      <div className="emp360-summary-grid">
        <Emp360AttendanceCard
          from={from}
          to={to}
          employeeName={emp.full_name}
          rollup={rollup}
          rows={att}
          shift={shift}
        />
        <Emp360LeaveSummaryCard
          employee={emp}
          from={from}
          to={to}
          leaves={leaves}
          approvals={approvals}
          employees={employees}
        />
        <Emp360PayrollHistoryCard
          employee={emp}
          from={from}
          to={to}
          history={payrollHistory}
          canExport={can("export")}
        />
        <Emp360TrainingCard
          employeeName={emp.full_name}
          from={from}
          to={to}
          records={training}
        />
        <Emp360DocumentsCard employee={emp} />
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
    </div>
  );
}
