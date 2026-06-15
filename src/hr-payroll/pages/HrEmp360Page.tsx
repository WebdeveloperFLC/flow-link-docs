import { useEffect, useMemo, useState } from "react";
import { useParams } from "react-router-dom";
import { useHrAccess } from "../context/HrPayrollProvider";
import { useHrEmployees } from "../hooks/useHrEmployees";
import { splitShiftHours } from "../lib/shiftHours";
import { useHrPayrollLine } from "../hooks/useHrPayroll";
import { useHrAttendance } from "../hooks/useHrAttendance";
import { useHrShifts } from "../hooks/useHrShifts";
import {
  useHrLeaveRequests,
  useHrCompoffRequests,
  useHrTrainingRecords,
  useHrAuditLogs,
} from "../hooks/useHrRequests";
import { EmployeeSeg } from "../components/ui/EmployeeSeg";
import { StatusBadge } from "../components/ui/StatusBadge";
import { fmtDur } from "../lib/attendanceMetrics";
import { inr, initials } from "../lib/format";
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

function rollupAtt(att: AttendanceRow[], shift: ShiftRow) {
  let working = 0;
  let leaves = 0;
  let wOff = 0;
  let otMin = 0;
  let offShiftMin = 0;
  const sw = {
    login: shift.login_time.slice(0, 5),
    logout: shift.logout_time.slice(0, 5),
    breakDur: shift.break_min ?? 45,
  };
  for (const a of att) {
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
  };
}

export default function HrEmp360Page() {
  const { id: routeId } = useParams<{ id?: string }>();
  const { cycle } = useHrAccess();
  const { data: employees = [] } = useHrEmployees();
  const { data: shifts = [] } = useHrShifts();
  const [empId, setEmpId] = useState("");

  useEffect(() => {
    if (routeId) setEmpId(routeId);
    else if (!empId && employees[1]) setEmpId(employees[1].id);
    else if (!empId && employees[0]) setEmpId(employees[0].id);
  }, [routeId, empId, employees]);

  const emp = employees.find((e) => e.id === empId) ?? employees[0];
  const shift = shifts.find((s) => s.id === emp?.shift_id) ?? shifts[0];

  const { data: line } = useHrPayrollLine(emp?.id, cycle?.id);
  const { data: att = [] } = useHrAttendance(emp?.id, cycle?.start_date, cycle?.end_date);
  const { data: allLeaves = [] } = useHrLeaveRequests();
  const { data: allCompoff = [] } = useHrCompoffRequests();
  const { data: allTraining = [] } = useHrTrainingRecords();
  const { data: allAudit = [] } = useHrAuditLogs();

  const ru = shift && att.length ? rollupAtt(att, shift) : null;

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
  const audit = useMemo(
    () =>
      allAudit.filter(
        (a) =>
          (a.target ?? "").includes(emp?.full_name ?? "") ||
          (a.target ?? "").includes(emp?.emp_code ?? ""),
      ),
    [allAudit, emp?.full_name, emp?.emp_code],
  );

  if (!emp) return <div className="empty">No employees configured.</div>;

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

  return (
    <div className="grid" style={{ gap: 16 }}>
      <EmployeeSeg employees={employees} selectedId={emp.id} onSelect={setEmpId} />

      <div className="card" style={{ display: "flex", gap: 16, alignItems: "center", flexWrap: "wrap" }}>
        <div className="avatar" style={{ width: 52, height: 52, fontSize: 17 }}>
          {initials(emp.full_name)}
        </div>
        <div style={{ flex: 1, minWidth: 200 }}>
          <div className="serif" style={{ fontSize: 20, fontWeight: 600 }}>
            {emp.full_name}
          </div>
          <div style={{ fontSize: 13, color: "var(--ink-soft)" }}>
            {emp.designation} · {emp.department} · {emp.branches?.name} · {emp.companies?.name}
          </div>
          <div className="muted" style={{ fontSize: 12, marginTop: 3 }}>
            {emp.mobile} · {emp.email}
          </div>
        </div>
        {emp.status === "On Probation" ? (
          <StatusBadge status="On Probation" />
        ) : (
          <StatusBadge status="Confirmed" />
        )}
      </div>

      <div className="grid g4">
        <SumCard
          title="Attendance"
          rows={[
            ["Working", ru?.working ?? "—"],
            ["Leaves", ru?.leaves ?? 0],
            ["Week Offs", ru?.wOff ?? "—"],
            ["Shift OT", ru ? fmtDur(ru.otMin) : "—"],
            ["Off-shift", ru ? fmtDur(ru.offShiftMin) : "—"],
          ]}
        />
        <SumCard
          title="Late & Mispunch"
          rows={[
            ["Late", r.late_count],
            ["Late ded", `${r.late_deduction}d`],
            ["Mispunch", r.mispunch_count],
            ["Mis ded", `${r.mispunch_deduction}d`],
          ]}
        />
        <SumCard
          title="Leave & Comp-Off"
          rows={[
            ["Paid lv", r.paid_leaves],
            ["Comp-off", r.comp_off],
            ["Sandwich", r.sandwich_count],
            ["UL", r.ul_count],
          ]}
        />
        <SumCard
          title="Payroll"
          hl
          rows={[
            ["Gross", inr(r.gross_earned)],
            ["PF/ESIC", inr(r.pf_employee + r.esic_employee)],
            ["Payable", `${r.payable_days}d`],
            ["Net", inr(r.net_salary)],
          ]}
        />
      </div>

      <div className="grid g3">
        <div className="card">
          <div className="card-h">
            <h3 style={{ fontSize: 15 }}>Leave history</h3>
          </div>
          {leaves.length === 0 ? (
            <div className="empty" style={{ padding: 16 }}>
              None
            </div>
          ) : (
            leaves.map((l) => (
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
                </span>
                <StatusBadge status={l.status} />
              </div>
            ))
          )}
        </div>

        <div className="card">
          <div className="card-h">
            <h3 style={{ fontSize: 15 }}>Comp-off & Training</h3>
          </div>
          {compoff.length === 0 && training.length === 0 ? (
            <div className="empty" style={{ padding: 16 }}>
              None
            </div>
          ) : (
            <>
              {compoff.map((c) => (
                <div
                  key={c.id}
                  className="row-flex"
                  style={{
                    justifyContent: "space-between",
                    padding: "7px 0",
                    borderBottom: "1px solid #eef0f5",
                  }}
                >
                  <span style={{ fontSize: 12.5 }}>Comp-off · {c.worked_date}</span>
                  <StatusBadge status={c.status} />
                </div>
              ))}
              {training.map((t) => (
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
              ))}
            </>
          )}
        </div>

        <div className="card">
          <div className="card-h">
            <h3 style={{ fontSize: 15 }}>Activity timeline</h3>
          </div>
          {audit.length === 0 ? (
            <div className="empty" style={{ padding: 16 }}>
              No recent activity
            </div>
          ) : (
            audit.slice(0, 6).map((a) => (
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
    </div>
  );
}
