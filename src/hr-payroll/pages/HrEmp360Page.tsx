import { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { useHrAccess } from "../context/HrPayrollProvider";
import { useHrEmployees } from "../hooks/useHrEmployees";
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
import { EmployeeSeg } from "../components/ui/EmployeeSeg";
import { Stat } from "../components/ui/Stat";
import { StatusBadge } from "../components/ui/StatusBadge";
import { LeaveSummaryPanel } from "../components/leave/LeaveSummaryPanel";
import { EmployeeDocumentsPanel } from "../components/employees/EmployeeDocumentsPanel";
import { EmployeeAssetsDetailTable } from "../components/employees/EmployeeAssetsDetailTable";
import { ShiftHistoryTable } from "../components/shifts/ShiftHistoryTable";
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
  initials,
  parseEmergencyContacts,
  payrollCompanyLabel,
} from "../lib/format";
import type { AttendanceRow, ShiftRow } from "../lib/types";

function SumCard({
  title,
  rows,
  hl,
}: {
  title: string;
  rows: [string, string | number][];
  hl?: boolean;
}) {
  return (
    <div
      className="card"
      style={hl ? { background: "#eef5ff", borderColor: "#cfe1f7" } : undefined}
    >
      <div
        style={{
          fontSize: 11,
          letterSpacing: 0.6,
          textTransform: "uppercase",
          color: "var(--mut)",
          fontWeight: 600,
          marginBottom: 9,
        }}
      >
        {title}
      </div>
      {rows.map(([k, v]) => (
        <div
          key={k}
          style={{
            display: "flex",
            justifyContent: "space-between",
            padding: "4px 0",
            fontSize: 13,
          }}
        >
          <span style={{ color: "var(--ink-soft)" }}>{k}</span>
          <span className="mono" style={{ fontWeight: 500 }}>
            {v}
          </span>
        </div>
      ))}
    </div>
  );
}

function InfoCard({
  title,
  rows,
}: {
  title: string;
  rows: [string, string | null | undefined][];
}) {
  return (
    <div className="card">
      <div className="card-h">
        <h3>{title}</h3>
      </div>
      <div className="grid g2" style={{ gap: "10px 20px" }}>
        {rows.map(([k, v]) => (
          <div key={k}>
            <div style={{ fontSize: 11, color: "var(--mut)", fontWeight: 600 }}>{k}</div>
            <div style={{ fontSize: 13.5, marginTop: 3 }}>{v?.trim() ? v : "—"}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

function rollupAtt(att: AttendanceRow[], shift: ShiftRow) {
  let working = 0;
  let leaves = 0;
  let wOff = 0;
  let otMin = 0;
  let offShiftMin = 0;
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
      offShiftMin += split.offShiftMin;
    }
  }
  return {
    working: Math.round(working * 10) / 10,
    leaves,
    wOff,
    otMin,
    offShiftMin,
    present: Math.round(present * 10) / 10,
    absent,
    lateMarks,
  };
}

export default function HrEmp360Page() {
  const { id: routeId } = useParams<{ id?: string }>();
  const { cycle, can } = useHrAccess();
  const {
    data: employees = [],
    isLoading: employeesLoading,
    isError: employeesError,
    error: employeesLoadError,
  } = useHrEmployees({ activeOnly: false });
  const { data: shifts = [] } = useHrShifts();
  const [empId, setEmpId] = useState("");
  const [summaryYear, setSummaryYear] = useState(() => new Date().getFullYear());

  useEffect(() => {
    if (routeId) setEmpId(routeId);
    else if (!empId && employees[1]) setEmpId(employees[1].id);
    else if (!empId && employees[0]) setEmpId(employees[0].id);
  }, [routeId, empId, employees]);

  const emp = employees.find((e) => e.id === empId) ?? employees[0];
  const shift = shifts.find((s) => s.id === emp?.shift_id) ?? shifts[0];
  const reportingManager = emp?.reporting_mgr_id
    ? employees.find((e) => e.id === emp.reporting_mgr_id)
    : null;

  const { data: line } = useHrPayrollLine(emp?.id, cycle?.id);
  const { data: payrollHistory = [] } = useHrEmployeePayrollHistory(emp?.id);
  const { data: revisions = [] } = useSalaryRevisions(emp?.id);
  const { data: att = [] } = useHrAttendance(emp?.id, cycle?.start_date, cycle?.end_date);
  const { data: allLeaves = [] } = useHrLeaveRequests();
  const { data: allCompoff = [] } = useHrCompoffRequests();
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
  const compoff = useMemo(
    () => allCompoff.filter((c) => c.employee_id === emp?.id),
    [allCompoff, emp?.id],
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

  if (!emp) {
    return <div className="empty">Select an employee to view profile.</div>;
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
    <div className="grid" style={{ gap: 18 }}>
      <div className="card-h" style={{ marginBottom: 0 }}>
        <label className="fld" style={{ minWidth: 280, flex: 1 }}>
          <span className="l">Employee</span>
          <select
            className="input"
            value={emp.id}
            onChange={(e) => setEmpId(e.target.value)}
          >
            {employees.map((e) => (
              <option key={e.id} value={e.id}>
                {e.full_name} ({e.emp_code}) — {employeeStatusLabel(e.status)}
              </option>
            ))}
          </select>
        </label>
      </div>
      <EmployeeSeg employees={employees} selectedId={emp.id} onSelect={setEmpId} />

      <div className="card" style={{ display: "flex", gap: 16, alignItems: "center", flexWrap: "wrap" }}>
        <div className="avatar" style={{ width: 52, height: 52, fontSize: 17 }}>
          {initials(emp.full_name)}
        </div>
        <div style={{ flex: 1, minWidth: 200 }}>
          <div className="serif" style={{ fontSize: 20, fontWeight: 600 }}>
            {displayEmployeeName(emp)}
          </div>
          <div style={{ fontSize: 13, color: "var(--ink-soft)" }}>
            {emp.emp_code} · {emp.designations?.name ?? emp.designation} · {emp.departments?.name ?? emp.department}
          </div>
          <div className="muted" style={{ fontSize: 12, marginTop: 3 }}>
            {emp.mobile} · {emp.email}
          </div>
        </div>
        <span className={`badge ${employeeStatusBadgeClass(emp.status)}`}>
          {employeeStatusLabel(emp.status)}
        </span>
      </div>

      <div className="grid g2">
        <InfoCard
          title="Personal information"
          rows={[
            ["Employee ID", emp.emp_code],
            ["Full name", displayEmployeeName(emp)],
            ["Mobile", emp.mobile],
            ["Email", emp.email],
            ["Nationality", emp.nationality],
            ["Marital status", emp.marital_status],
            ["Blood group", emp.blood_group],
            ...emergencyContacts
              .filter((c) => c.name || c.phone)
              .flatMap((c, i) => [
                [`Emergency contact ${i + 1}`, `${c.name} · ${c.phone} (${c.relation})`],
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
              reportingManager ? `${reportingManager.full_name} (${reportingManager.emp_code})` : null,
            ],
            ["Date of joining", emp.date_of_joining],
            [
              "Probation",
              [emp.probation_start_date, emp.probation_end_date].filter(Boolean).join(" – ") || null,
            ],
            ["Notice period", emp.notice_period],
            ["Employee status", emp.status],
            ["Employee category", emp.hr_employee_categories?.label],
            [
              "Payroll company",
              emp.companies ? payrollCompanyLabel(emp.companies) : null,
            ],
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

      {(emp.exit_date || emp.exit_reason || emp.rehire_eligible) && (
        <InfoCard
          title="Exit information"
          rows={[
            ["Exit date", emp.exit_date],
            ["Exit reason", emp.exit_reason],
            ["Rehire eligible", emp.rehire_eligible ? "Yes" : emp.exit_date ? "No" : null],
          ]}
        />
      )}

      <div className="card">
        <div className="card-h">
          <h3>Shift assignment history</h3>
          <Link to="/hr/config/shifts" className="btn btn-sm">
            Shift management →
          </Link>
        </div>
        <ShiftHistoryTable
          rows={shiftHistory}
          isLoading={shiftHistoryLoading}
          showEmployeeLink={false}
          emptyLabel="No shift changes recorded for this employee."
        />
      </div>

      <div className="grid g2">
        <InfoCard
          title="Bank information"
          rows={[
            ["Account holder", emp.bank_holder_name],
            ["Bank", emp.bank_name],
            ["Account number", emp.bank_account_number],
            ["IFSC", emp.bank_ifsc],
            ["Branch name", emp.bank_branch],
            ["Account type", emp.bank_account_type],
            ["Verification status", emp.bank_verified ? "Verified" : "Pending"],
            ...(emp.bank_verified
              ? [
                  ["Verified by", emp.bank_verified_by],
                  ["Verification date", formatSecurityChequeUploadedAt(emp.bank_verified_at)],
                ]
              : []),
          ]}
        />
        <div className="card">
          <div className="card-h">
            <h3 style={{ fontSize: 15 }}>Salary information</h3>
            <span className="tag muted">{currency}</span>
          </div>
          <div className="grid g2" style={{ gap: 10, marginBottom: revisions.length ? 14 : 0 }}>
            {[
              ["Current monthly gross", money(emp.monthly_gross)],
              ["Basic", money(emp.basic)],
              ["HRA", money(emp.hra)],
              ["Other deductions/mo", emp.other_deductions ? money(emp.other_deductions) : "—"],
            ].map(([k, v]) => (
              <div
                key={k}
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  padding: "10px 13px",
                  background: "var(--paper)",
                  borderRadius: 9,
                }}
              >
                <span style={{ fontSize: 12, color: "var(--mut)", fontWeight: 600 }}>{k}</span>
                <span className="mono" style={{ fontSize: 13 }}>{v}</span>
              </div>
            ))}
          </div>
          {revisions.length > 0 && (
            <>
              <div className="sec-label">Salary revision history</div>
              <table style={{ fontSize: 12 }}>
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
            </>
          )}
        </div>
      </div>

      <div className="grid g4">
        <Stat
          lab="Present days"
          val={ru?.present ?? "—"}
          meta={cycleLabel}
          color="var(--good)"
        />
        <Stat
          lab="Absent days"
          val={ru?.absent ?? "—"}
          meta={cycleLabel}
          color="var(--rose)"
        />
        <Stat
          lab="Late marks"
          val={ru?.lateMarks ?? r.late_count}
          meta={cycleLabel}
          color="var(--clay)"
        />
        <Stat
          lab="Net pay"
          val={money(r.net_salary)}
          meta={`${r.payable_days}d payable`}
          color="var(--moss)"
        />
      </div>

      <div className="grid g4">
        <SumCard
          title={`Attendance · ${cycleLabel}`}
          rows={[
            ["Working", ru?.working ?? "—"],
            ["Leaves", ru?.leaves ?? 0],
            ["Week offs", ru?.wOff ?? "—"],
            ["Shift OT", ru ? fmtDur(ru.otMin) : "—"],
          ]}
        />
        <SumCard
          title={`Late & mispunch · ${cycleLabel}`}
          rows={[
            ["Late (payroll)", r.late_count],
            ["Late ded", `${r.late_deduction}d`],
            ["Mispunch", r.mispunch_count],
            ["Mis ded", `${r.mispunch_deduction}d`],
          ]}
        />
        <SumCard
          title={`Leave & comp-off · ${cycleLabel}`}
          rows={[
            ["Paid lv", r.paid_leaves],
            ["Comp-off", r.comp_off],
            ["Sandwich", r.sandwich_count],
            ["UL", r.ul_count],
          ]}
        />
        <SumCard
          title={`Payroll detail · ${cycleLabel}`}
          hl
          rows={[
            ["Gross", money(r.gross_earned)],
            ["PF/ESIC", money(r.pf_employee + r.esic_employee)],
            ["Payable", `${r.payable_days}d`],
            ["Net", money(r.net_salary)],
          ]}
        />
      </div>

      <LeaveSummaryPanel
        employeeId={emp.id}
        year={summaryYear}
        onEmployeeChange={() => undefined}
        onYearChange={setSummaryYear}
        showEmployeePicker={false}
      />

      <div className="grid g2">
        <div className="card">
          <div className="card-h">
            <h3 style={{ fontSize: 15 }}>Latest payroll & history</h3>
            {line && cycle && can("export") && (
              <button
                type="button"
                className="btn btn-sm"
                onClick={() => printSalarySlip(emp, line, cycle)}
              >
                ↓ Salary slip
              </button>
            )}
          </div>
          {payrollHistory.length === 0 ? (
            <div className="empty" style={{ padding: 16 }}>No payroll lines recorded.</div>
          ) : (
            <table style={{ fontSize: 12 }}>
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
          )}
        </div>

        <div className="card">
          <div className="card-h">
            <h3 style={{ fontSize: 15 }}>Leave history</h3>
            <Link to="/hr/leave" className="btn btn-sm">Open leave →</Link>
          </div>
          {leaves.length === 0 ? (
            <div className="empty" style={{ padding: 16 }}>None</div>
          ) : (
            leaves.slice(0, 8).map((l) => (
              <div
                key={l.id}
                className="row-flex"
                style={{
                  justifyContent: "space-between",
                  padding: "7px 0",
                  borderBottom: "1px solid #eef0f5",
                }}
              >
                <span style={{ fontSize: 12.5 }}>
                  {l.type} · {l.from_date}
                  {l.to_date && l.to_date !== l.from_date ? ` → ${l.to_date}` : ""}
                </span>
                <StatusBadge status={l.status} />
              </div>
            ))
          )}
        </div>
      </div>

      <div className="card">
        <div className="card-h">
          <h3>Company assets</h3>
          <Link to="/hr/employees" className="btn btn-sm">
            Edit in Employee Master →
          </Link>
        </div>
        {assetsLoading ? (
          <div className="empty">Loading assets…</div>
        ) : (
          <EmployeeAssetsDetailTable assets={employeeAssets} />
        )}
      </div>

      <div className="card">
        <div className="card-h">
          <h3>Employee documents</h3>
        </div>
        <EmployeeDocumentsPanel emp={emp} />
      </div>

      <div className="grid g3">
        <div className="card">
          <div className="card-h">
            <h3 style={{ fontSize: 15 }}>Active training</h3>
          </div>
          {activeTraining.length === 0 ? (
            <div className="empty" style={{ padding: 16 }}>None</div>
          ) : (
            activeTraining.map((t) => (
              <div
                key={t.id}
                className="row-flex"
                style={{
                  justifyContent: "space-between",
                  padding: "7px 0",
                  borderBottom: "1px solid #eef0f5",
                }}
              >
                <span style={{ fontSize: 12.5 }}>{t.type}</span>
                <StatusBadge status={t.status} />
              </div>
            ))
          )}
        </div>

        <div className="card">
          <div className="card-h">
            <h3 style={{ fontSize: 15 }}>Training history</h3>
          </div>
          {trainingHistory.length === 0 ? (
            <div className="empty" style={{ padding: 16 }}>None</div>
          ) : (
            trainingHistory.map((t) => (
              <div
                key={t.id}
                className="row-flex"
                style={{
                  justifyContent: "space-between",
                  padding: "7px 0",
                  borderBottom: "1px solid #eef0f5",
                }}
              >
                <span style={{ fontSize: 12.5 }}>{t.type}</span>
                <StatusBadge status={t.status} />
              </div>
            ))
          )}
        </div>

        <div className="card">
          <div className="card-h">
            <h3 style={{ fontSize: 15 }}>Comp-off</h3>
          </div>
          {compoff.length === 0 ? (
            <div className="empty" style={{ padding: 16 }}>None</div>
          ) : (
            compoff.slice(0, 6).map((c) => (
              <div
                key={c.id}
                className="row-flex"
                style={{
                  justifyContent: "space-between",
                  padding: "7px 0",
                  borderBottom: "1px solid #eef0f5",
                }}
              >
                <span style={{ fontSize: 12.5 }}>{c.worked_date}</span>
                <StatusBadge status={c.status} />
              </div>
            ))
          )}
        </div>
      </div>

      <div className="card">
        <div className="card-h">
          <h3 style={{ fontSize: 15 }}>Activity timeline</h3>
        </div>
        {audit.length === 0 ? (
          <div className="empty" style={{ padding: 16 }}>No recent activity</div>
        ) : (
          audit.slice(0, 8).map((a) => (
            <div
              key={a.id}
              className="row-flex"
              style={{
                padding: "7px 0",
                borderBottom: "1px solid #eef0f5",
                alignItems: "flex-start",
              }}
            >
              <span
                className="mono"
                style={{ fontSize: 10.5, color: "var(--mut)", width: 78, flexShrink: 0 }}
              >
                {new Date(a.created_at).toLocaleDateString("en-IN", {
                  day: "2-digit",
                  month: "short",
                })}
              </span>
              <span style={{ fontSize: 12.5 }}>{a.action}</span>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
