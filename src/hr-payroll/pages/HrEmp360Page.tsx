import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { useHrAccess } from "../context/HrPayrollProvider";
import { useHrEmployees, useHrReferenceData } from "../hooks/useHrEmployees";
import { splitShiftHours } from "../lib/shiftHours";
import { useHrEmployeePayrollHistory, useHrPayrollLine } from "../hooks/useHrPayroll";
import { useHrAttendance } from "../hooks/useHrAttendance";
import { useHrShifts } from "../hooks/useHrShifts";
import { useSalaryRevisions } from "../hooks/useSalaryRevisions";
import {
  useHrLeaveRequests,
  useHrCompoffRequests,
  useHrTrainingRecords,
  useHrAuditLogs,
} from "../hooks/useHrRequests";
import { Stat } from "../components/ui/Stat";
import { EmployeeCard } from "../components/ui/EmployeeCard";
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
  employeeStatusBadgeClass,
  employeeStatusLabel,
  formatMoney,
  parseEmergencyContacts,
  payrollCompanyLabel,
} from "../lib/format";
import type { AttendanceRow, EmployeeRow, ShiftRow } from "../lib/types";

const COUNTRY_OPTIONS = [
  { value: "All", label: "All countries" },
  { value: "IN", label: "India" },
  { value: "CA", label: "Canada" },
];

function employmentTypeLabel(emp: EmployeeRow) {
  return emp.employment_type?.trim() || emp.hr_employee_categories?.label || "—";
}

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

export default function HrEmp360Page() {
  const { id: routeId } = useParams<{ id?: string }>();
  const navigate = useNavigate();
  const { cycle, can } = useHrAccess();
  const {
    data: employees = [],
    isLoading: employeesLoading,
    isError: employeesError,
    error: employeesLoadError,
  } = useHrEmployees({ activeOnly: false });
  const { data: ref } = useHrReferenceData();
  const { data: shifts = [] } = useHrShifts();

  const [countryFilter, setCountryFilter] = useState("All");
  const [branchFilter, setBranchFilter] = useState("All");
  const [companyFilter, setCompanyFilter] = useState("All");
  const [departmentFilter, setDepartmentFilter] = useState("All");
  const [designationFilter, setDesignationFilter] = useState("All");
  const [employmentFilter, setEmploymentFilter] = useState("All");
  const [search, setSearch] = useState("");
  const [summaryYear, setSummaryYear] = useState(() => new Date().getFullYear());

  const empId = routeId ?? "";
  const emp = employees.find((e) => e.id === empId);

  const employmentTypes = useMemo(() => {
    const set = new Set<string>();
    for (const e of employees) {
      const label = employmentTypeLabel(e);
      if (label && label !== "—") set.add(label);
    }
    return [...set].sort();
  }, [employees]);

  const filteredEmployees = useMemo(() => {
    const q = search.trim().toLowerCase();
    return employees.filter((e) => {
      if (countryFilter !== "All" && (e.payroll_country ?? "IN").toUpperCase() !== countryFilter) {
        return false;
      }
      if (branchFilter !== "All" && e.branch_id !== branchFilter) return false;
      if (companyFilter !== "All" && e.company_id !== companyFilter) return false;
      if (departmentFilter !== "All" && e.department_id !== departmentFilter) return false;
      if (designationFilter !== "All" && e.designation_id !== designationFilter) return false;
      if (employmentFilter !== "All" && employmentTypeLabel(e) !== employmentFilter) return false;
      if (!q) return true;
      return (
        e.full_name.toLowerCase().includes(q) ||
        e.emp_code.toLowerCase().includes(q) ||
        (e.email ?? "").toLowerCase().includes(q) ||
        (e.mobile ?? "").includes(q)
      );
    });
  }, [
    employees,
    countryFilter,
    branchFilter,
    companyFilter,
    departmentFilter,
    designationFilter,
    employmentFilter,
    search,
  ]);

  useEffect(() => {
    if (!routeId && filteredEmployees.length > 0 && !empId) {
      navigate(`/hr/employee/${filteredEmployees[0].id}`, { replace: true });
    }
  }, [routeId, filteredEmployees, empId, navigate]);

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

  const selectEmployee = (id: string) => {
    navigate(`/hr/employee/${id}`);
  };

  if (employeesLoading) {
    return <div className="empty">Loading employees…</div>;
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

  if (!employees.length) {
    return (
      <div className="empty">
        <div className="ico">👤</div>
        No employees found. Add employees in Employee Master or check HR database access.
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
      <div className="card card-wash">
        <div className="filter-bar">
          <label className="fld">
            <span className="l">Country</span>
            <select className="input" value={countryFilter} onChange={(e) => setCountryFilter(e.target.value)}>
              {COUNTRY_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </select>
          </label>
          <label className="fld">
            <span className="l">Branch</span>
            <select className="input" value={branchFilter} onChange={(e) => setBranchFilter(e.target.value)}>
              <option value="All">All branches</option>
              {(ref?.branches ?? []).map((b) => (
                <option key={b.id} value={b.id}>{b.name}</option>
              ))}
            </select>
          </label>
          <label className="fld">
            <span className="l">Payroll company</span>
            <select className="input" value={companyFilter} onChange={(e) => setCompanyFilter(e.target.value)}>
              <option value="All">All companies</option>
              {(ref?.companies ?? []).map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </label>
          <label className="fld">
            <span className="l">Department</span>
            <select className="input" value={departmentFilter} onChange={(e) => setDepartmentFilter(e.target.value)}>
              <option value="All">All departments</option>
              {(ref?.departments ?? []).map((d) => (
                <option key={d.id} value={d.id}>{d.name}</option>
              ))}
            </select>
          </label>
          <label className="fld">
            <span className="l">Designation</span>
            <select className="input" value={designationFilter} onChange={(e) => setDesignationFilter(e.target.value)}>
              <option value="All">All designations</option>
              {(ref?.designations ?? []).map((d) => (
                <option key={d.id} value={d.id}>{d.name}</option>
              ))}
            </select>
          </label>
          <label className="fld">
            <span className="l">Employment type</span>
            <select className="input" value={employmentFilter} onChange={(e) => setEmploymentFilter(e.target.value)}>
              <option value="All">All types</option>
              {employmentTypes.map((t) => (
                <option key={t} value={t}>{t}</option>
              ))}
            </select>
          </label>
          <label className="fld">
            <span className="l">Search employee</span>
            <input
              className="input"
              placeholder="Name, ID, email, mobile…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </label>
        </div>
        <div className="showing-count">
          Showing {filteredEmployees.length} employee{filteredEmployees.length === 1 ? "" : "s"}
        </div>
      </div>

      <div className="emp-card-grid">
        {filteredEmployees.map((e) => (
          <EmployeeCard
            key={e.id}
            employee={e}
            selected={e.id === empId}
            onSelect={() => selectEmployee(e.id)}
          />
        ))}
      </div>

      {!emp && filteredEmployees.length > 0 && (
        <div className="empty">Select an employee card to view profile.</div>
      )}

      {emp && (
        <>
          <SectionCard title="Profile summary">
            <div className="profile-banner">
              <EmployeeAvatar name={emp.full_name} photoUrl={emp.photo_url} size={56} fontSize={19} />
              <div>
                <div className="profile-name">{displayEmployeeName(emp)}</div>
                <div className="profile-sub">
                  {emp.emp_code} · {emp.designations?.name ?? emp.designation} ·{" "}
                  {emp.departments?.name ?? emp.department}
                </div>
                <div className="muted">{emp.mobile} · {emp.email}</div>
                <div className="row-flex">
                  <span className={`badge ${employeeStatusBadgeClass(emp.status)}`}>
                    {employeeStatusLabel(emp.status)}
                  </span>
                  <span className="tag">{emp.branches?.name ?? "—"}</span>
                  <span className="tag">{employmentTypeLabel(emp)}</span>
                </div>
              </div>
            </div>
            <div className="divider" />
            <div className="info-grid">
              {[
                ["Nationality", emp.nationality],
                ["Marital status", emp.marital_status],
                ["Blood group", emp.blood_group],
                ["Date of birth", emp.dob],
                ...emergencyContacts
                  .filter((c) => c.name || c.phone)
                  .flatMap((c, i) => [
                    [`Emergency ${i + 1}`, `${c.name} · ${c.phone} (${c.relation})`],
                  ] as [string, string][]),
              ].map(([k, v]) => (
                <div key={k}>
                  <div className="info-field-label">{k}</div>
                  <div className="info-field-value">{v?.trim() ? v : "—"}</div>
                </div>
              ))}
            </div>
          </SectionCard>

          <InfoCard
            title="Employment summary"
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
              ["Exit date", emp.exit_date],
              ["Exit reason", emp.exit_reason],
              [
                "Rehire eligible",
                emp.rehire_eligible ? "Yes" : emp.exit_date ? "No" : null,
              ],
            ]}
          />

          <div>
            <h3 className="section-title">Attendance KPIs · {cycleLabel}</h3>
            <div className="grid g4">
              <Stat lab="Present days" val={ru?.present ?? "—"} meta={cycleLabel} color="var(--good)" variant="highlight" />
              <Stat lab="Absent days" val={ru?.absent ?? "—"} meta={cycleLabel} color="var(--rose)" variant="highlight" />
              <Stat lab="Late marks" val={ru?.lateMarks ?? r.late_count} meta={cycleLabel} color="var(--clay)" variant="highlight" />
              <Stat lab="Net pay" val={money(r.net_salary)} meta={`${r.payable_days}d payable`} color="var(--moss)" variant="highlight" />
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

          <div>
            <h3 className="section-title">Payroll summary</h3>
            <div className="grid g2">
              <InfoCard
                title="Salary & bank"
                rows={[
                  ["Monthly gross", money(emp.monthly_gross)],
                  ["Basic", money(emp.basic)],
                  ["HRA", money(emp.hra)],
                  ["Other deductions/mo", emp.other_deductions ? money(emp.other_deductions) : "—"],
                  ["Bank", emp.bank_name],
                  ["Account", emp.bank_account_number],
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
            </div>
          </div>

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
              action={
                <Link to="/hr/employees" className="btn btn-sm">Edit in Employee Master →</Link>
              }
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
        </>
      )}
    </div>
  );
}
