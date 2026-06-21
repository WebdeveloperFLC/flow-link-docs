import { useMemo, useState } from "react";
import { Link, useParams, useSearchParams } from "react-router-dom";
import { useHrAccess } from "../context/HrPayrollProvider";
import { useHrEmployees } from "../hooks/useHrEmployees";
import { splitShiftHours } from "../lib/shiftHours";
import { useHrEmployeePayrollHistory, useHrPayrollLine } from "../hooks/useHrPayroll";
import { useHrAttendance } from "../hooks/useHrAttendance";
import { useHrShifts } from "../hooks/useHrShifts";
import { useSalaryRevisions } from "../hooks/useSalaryRevisions";
import {
  useHrLeaveRequests,
  useHrTrainingRecords,
  useHrAuditLogs,
} from "../hooks/useHrRequests";
import { Stat } from "../components/ui/Stat";
import { InfoCard, MetricPanel, SectionCard } from "../components/ui/InfoCard";
import { StatusBadge } from "../components/ui/StatusBadge";
import { LeaveSummaryPanel } from "../components/leave/LeaveSummaryPanel";
import { EmployeeDocumentsPanel } from "../components/employees/EmployeeDocumentsPanel";
import { EmployeeAssetsDetailTable } from "../components/employees/EmployeeAssetsDetailTable";
import { ShiftHistoryTable } from "../components/shifts/ShiftHistoryTable";
import { EmployeeAvatar } from "../components/ui/EmployeeAvatar";
import { useEmployeeAssets } from "../hooks/useEmployeeAssets";
import { useEmployeeShiftHistory } from "../hooks/useEmployeeShiftHistory";
import { fmtDur } from "../lib/attendanceMetrics";
import { formatSecurityChequeUploadedAt } from "../lib/securityCheque";
import { printSalarySlip } from "../lib/salarySlip";
import {
  displayEmployeeName,
  employeeCurrency,
  employeeStatusLabel,
  formatMoney,
  parseEmergencyContacts,
  payrollCompanyLabel,
} from "../lib/format";
import { employmentTypeLabel, emp360FiltersToSearchParams, emp360FiltersFromSearchParams } from "../lib/emp360Filters";
import type { AttendanceRow, ShiftRow } from "../lib/types";

function rollupAtt(att: AttendanceRow[], shift: ShiftRow) {
  let working = 0;
  let leaves = 0;
  let wOff = 0;
  let otMin = 0;
  let present = 0;
  let absent = 0;
  let lateMarks = 0;
  const sw = {
    login: shift.login_time.slice(0, 5),
    logout: shift.logout_time.slice(0, 5),
    breakDur: shift.break_min ?? 45,
  };
  for (const a of att) {
    if (a.status === "Absent") absent++;
    if (a.status === "Late") lateMarks++;
    if (a.status === "Half Day") present += 0.5;
    else if (["Present", "Late"].includes(a.status)) present++;

    if (a.status === "Week Off" || a.status === "Holiday") {
      wOff++;
      continue;
    }
    if (a.status === "Leave" || a.status === "Sick Leave") {
      leaves++;
      continue;
    }
    if (a.status === "Half Day") working += 0.5;
    else if (a.status === "Present") working++;
    if (a.check_in && a.check_out) {
      const split = splitShiftHours(a.check_in, a.check_out, a.break_min, sw);
      otMin += split.otMin;
    }
  }
  return {
    working: Math.round(working * 10) / 10,
    leaves,
    wOff,
    otMin,
    present: Math.round(present * 10) / 10,
    absent,
    lateMarks,
  };
}

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
  const [summaryYear, setSummaryYear] = useState(() => new Date().getFullYear());

  const emp = employees.find((e) => e.id === id);
  const listFilters = useMemo(() => emp360FiltersFromSearchParams(searchParams), [searchParams]);
  const listQuery = emp360FiltersToSearchParams(listFilters).toString();
  const backHref = listQuery ? `/hr/employee?${listQuery}` : "/hr/employee";

  const shift = shifts.find((s) => s.id === emp?.shift_id) ?? shifts[0];
  const reportingManager = emp?.reporting_mgr_id
    ? employees.find((e) => e.id === emp.reporting_mgr_id)
    : null;

  const { data: line } = useHrPayrollLine(emp?.id, cycle?.id);
  const { data: payrollHistory = [] } = useHrEmployeePayrollHistory(emp?.id);
  const { data: revisions = [] } = useSalaryRevisions(emp?.id);
  const { data: att = [] } = useHrAttendance(emp?.id, cycle?.start_date, cycle?.end_date);
  const { data: allLeaves = [] } = useHrLeaveRequests();
  const { data: allTraining = [] } = useHrTrainingRecords();
  const { data: allAudit = [] } = useHrAuditLogs();
  const { data: shiftHistory = [], isLoading: shiftHistoryLoading } = useEmployeeShiftHistory({
    employeeId: emp?.id,
    limit: 50,
  });
  const { data: employeeAssets = [], isLoading: assetsLoading } = useEmployeeAssets(emp?.id);

  const ru = shift && att.length ? rollupAtt(att, shift) : null;
  const currency = employeeCurrency(emp);
  const money = (n: number | null | undefined) => formatMoney(n ?? 0, currency);

  const leaves = useMemo(
    () => allLeaves.filter((l) => l.employee_id === emp?.id),
    [allLeaves, emp?.id],
  );
  const training = useMemo(
    () => allTraining.filter((t) => t.employee_id === emp?.id),
    [allTraining, emp?.id],
  );
  const activeTraining = useMemo(
    () => training.filter((t) => t.status === "In Progress" || t.status === "Extended"),
    [training],
  );
  const trainingHistory = useMemo(
    () => training.filter((t) => t.status !== "In Progress" && t.status !== "Extended"),
    [training],
  );
  const audit = useMemo(
    () =>
      allAudit.filter(
        (a) =>
          (a.target ?? "").includes(emp?.full_name ?? "") ||
          (a.target ?? "").includes(emp?.emp_code ?? ""),
      ),
    [allAudit, emp?.full_name, emp?.emp_code],
  );

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

  const r = line ?? {
    late_count: 0,
    late_deduction: 0,
    mispunch_count: 0,
    mispunch_deduction: 0,
    paid_leaves: 0,
    comp_off: 0,
    sandwich_count: 0,
    ul_count: 0,
    gross_earned: 0,
    pf_employee: 0,
    esic_employee: 0,
    payable_days: 0,
    net_salary: 0,
  };

  const cycleLabel = cycle?.label ?? "Current cycle";

  return (
    <div className="page-grid">
      <div className="emp360-detail-top">
        <Link to={backHref} className="btn btn-sm emp360-back-btn">← Back to employee list</Link>
      </div>

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

      <div>
        <h3 className="section-title">Attendance KPIs · {cycleLabel}</h3>
        <div className="grid g4">
          <Stat variant="highlight" tone="green" lab="Present days" val={ru?.present ?? "—"} meta={cycleLabel} />
          <Stat variant="highlight" tone="rose" lab="Absent days" val={ru?.absent ?? "—"} meta={cycleLabel} />
          <Stat variant="highlight" tone="orange" lab="Late marks" val={ru?.lateMarks ?? r.late_count} meta={cycleLabel} />
          <Stat variant="highlight" tone="blue" lab="Net pay" val={money(r.net_salary)} meta={`${r.payable_days}d payable`} />
        </div>
        <div className="grid g4">
          <MetricPanel
            title={`Attendance · ${cycleLabel}`}
            rows={[
              ["Working", ru?.working ?? "—"],
              ["Leaves", ru?.leaves ?? 0],
              ["Week offs", ru?.wOff ?? "—"],
              ["Shift OT", ru ? fmtDur(ru.otMin) : "—"],
            ]}
          />
          <MetricPanel
            title={`Late & mispunch · ${cycleLabel}`}
            rows={[
              ["Late (payroll)", r.late_count],
              ["Late ded", `${r.late_deduction}d`],
              ["Mispunch", r.mispunch_count],
              ["Mis ded", `${r.mispunch_deduction}d`],
            ]}
          />
          <MetricPanel
            title={`Leave & comp-off · ${cycleLabel}`}
            rows={[
              ["Paid lv", r.paid_leaves],
              ["Comp-off", r.comp_off],
              ["Sandwich", r.sandwich_count],
              ["UL", r.ul_count],
            ]}
          />
          <MetricPanel
            title={`Payroll detail · ${cycleLabel}`}
            highlight
            rows={[
              ["Gross", money(r.gross_earned)],
              ["PF/ESIC", money(r.pf_employee + r.esic_employee)],
              ["Payable", `${r.payable_days}d`],
              ["Net", money(r.net_salary)],
            ]}
          />
        </div>
      </div>

      <div>
        <h3 className="section-title">Leave summary</h3>
        <LeaveSummaryPanel
          employeeId={emp.id}
          year={summaryYear}
          onEmployeeChange={() => undefined}
          onYearChange={setSummaryYear}
          showEmployeePicker={false}
        />
        {leaves.length > 0 && (
          <div className="card">
            <div className="card-h">
              <h3>Recent leave requests</h3>
              <Link to="/hr/leave" className="btn btn-sm">Open leave →</Link>
            </div>
            {leaves.slice(0, 6).map((l) => (
              <div key={l.id} className="list-row">
                <span>
                  {l.type} · {l.from_date}
                  {l.to_date && l.to_date !== l.from_date ? ` → ${l.to_date}` : ""}
                </span>
                <StatusBadge status={l.status} />
              </div>
            ))}
          </div>
        )}
      </div>

      <SectionCard
        title="Payroll history"
        action={
          line && cycle && can("export") ? (
            <button
              type="button"
              className="btn btn-sm"
              onClick={() => printSalarySlip(emp, line, cycle)}
            >
              ↓ Salary slip
            </button>
          ) : undefined
        }
      >
        {payrollHistory.length === 0 ? (
          <div className="empty empty-sm">No payroll lines recorded.</div>
        ) : (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Cycle</th>
                  <th>Status</th>
                  <th>Payable</th>
                  <th>Net</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {payrollHistory.map((pl) => (
                  <tr key={pl.id}>
                    <td className="strong">{pl.payroll_cycles?.label ?? "—"}</td>
                    <td>
                      {pl.payroll_cycles?.status ? (
                        <StatusBadge status={pl.payroll_cycles.status} />
                      ) : (
                        "—"
                      )}
                    </td>
                    <td className="mono">{pl.payable_days}d</td>
                    <td className="mono">{money(pl.net_salary)}</td>
                    <td>
                      {pl.payroll_cycles && (
                        <Link to={`/hr/payroll/verify/${pl.cycle_id}`} className="btn btn-sm">
                          View
                        </Link>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        {revisions.length > 0 && (
          <>
            <div className="sec-label">Salary revisions</div>
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
          </>
        )}
      </SectionCard>

      <SectionCard title="Documents">
        <EmployeeDocumentsPanel emp={emp} />
      </SectionCard>

      <div className="grid g2">
        <SectionCard title="Training">
          {activeTraining.length === 0 && trainingHistory.length === 0 ? (
            <div className="empty empty-sm">No training records.</div>
          ) : (
            <>
              {activeTraining.map((t) => (
                <div key={t.id} className="list-row">
                  <span>{t.type} (active)</span>
                  <StatusBadge status={t.status} />
                </div>
              ))}
              {trainingHistory.slice(0, 6).map((t) => (
                <div key={t.id} className="list-row">
                  <span>{t.type}</span>
                  <StatusBadge status={t.status} />
                </div>
              ))}
            </>
          )}
          <Link to="/hr/training" className="btn btn-sm">Training module →</Link>
        </SectionCard>

        <SectionCard
          title="Assets"
          action={<Link to="/hr/employees" className="btn btn-sm">Edit in Employee Master →</Link>}
        >
          {assetsLoading ? (
            <div className="empty empty-sm">Loading assets…</div>
          ) : (
            <EmployeeAssetsDetailTable assets={employeeAssets} />
          )}
        </SectionCard>
      </div>

      <SectionCard
        title="Shift history"
        action={<Link to="/hr/config/shifts" className="btn btn-sm">Shift management →</Link>}
      >
        <ShiftHistoryTable
          rows={shiftHistory}
          isLoading={shiftHistoryLoading}
          showEmployeeLink={false}
          emptyLabel="No shift changes recorded for this employee."
        />
      </SectionCard>

      <SectionCard title="Activity timeline">
        {audit.length === 0 ? (
          <div className="empty empty-sm">No recent activity</div>
        ) : (
          audit.slice(0, 10).map((a) => (
            <div key={a.id} className="list-row">
              <span className="mono muted">
                {new Date(a.created_at).toLocaleDateString("en-IN", {
                  day: "2-digit",
                  month: "short",
                })}
              </span>
              <span>{a.action}</span>
            </div>
          ))
        )}
      </SectionCard>
    </div>
  );
}
