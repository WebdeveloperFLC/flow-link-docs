import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/contexts/AuthContext";
import { useHrAccess } from "../context/HrPayrollProvider";
import { useHrEmployees } from "../hooks/useHrEmployees";
import { useHrPayrollLine } from "../hooks/useHrPayroll";
import { EmployeeDocumentsPanel } from "../components/employees/EmployeeDocumentsPanel";
import { useHrLeaveBalances, useHrLeaveRequests } from "../hooks/useHrRequests";
import {
  displayLeaveBalances,
  leaveBalanceRemaining,
  LEAVE_ENTITLED,
  MONTHLY_PAID_LEAVE_CAP,
  monthlyPaidLeaveUsed,
} from "../lib/leavePolicy";
import { useHrShifts } from "../hooks/useHrShifts";
import { useHrAttendance } from "../hooks/useHrAttendance";
import { useAttendanceActions } from "../hooks/useAttendanceActions";
import { Stat } from "../components/ui/Stat";
import { PunchStation } from "../components/attendance/PunchStation";
import { EmployeeAvatar } from "../components/ui/EmployeeAvatar";
import { formatWorkDate } from "../lib/attendanceMetrics";
import { resolvePunchSession } from "../lib/punchSession";
import { timezoneForEmployee, todayIsoInTz } from "../lib/employeeTimezone";
import { essAttendanceStatus } from "../lib/attendanceStatus";
import { formatMoney } from "../lib/format";
import { printSalarySlip } from "../lib/salarySlip";
import { ensureMyEmployeeProfile } from "../lib/hrApi";
import { HR_ORG_ID } from "../lib/constants";

export default function HrEssPage() {
  const { user, isAdmin } = useAuth();
  const { actualCan, assignedRole, can, cycle, fire } = useHrAccess();
  const qc = useQueryClient();
  const [setupBusy, setSetupBusy] = useState(false);
  const { data: employees = [] } = useHrEmployees();
  const { data: shifts = [] } = useHrShifts();

  const emp = useMemo(
    () => employees.find((e) => e.staff_id === user?.id),
    [employees, user?.id],
  );
  const shift = shifts.find((s) => s.id === emp?.shift_id) ?? shifts[0];
  const tz = useMemo(() => timezoneForEmployee(emp, shift), [emp, shift]);

  const { data: att = [] } = useHrAttendance(emp?.id, cycle?.start_date, cycle?.end_date);
  const { data: line } = useHrPayrollLine(emp?.id, cycle?.id);
  const { data: leaveBalances = [] } = useHrLeaveBalances(emp?.id);
  const { data: allLeaves = [] } = useHrLeaveRequests();
  const today = todayIsoInTz(tz);
  const punchSession = useMemo(() => resolvePunchSession(att, today), [att, today]);
  const todayRow = punchSession.punchRow;
  const shownLeaveBalances = useMemo(
    () => displayLeaveBalances(leaveBalances, emp?.work_week, shift?.type),
    [leaveBalances, emp?.work_week, shift?.type],
  );
  const monthLeaveUsed = useMemo(
    () => (emp ? monthlyPaidLeaveUsed(allLeaves, emp.id, today) : 0),
    [allLeaves, emp, today],
  );
  const actions = useAttendanceActions(cycle?.id, cycle?.start_date, cycle?.end_date, tz, fire);

  const attStatus = essAttendanceStatus(todayRow);
  const money = (n: number) => formatMoney(n, emp?.salary_currency ?? "INR");

  const setupMyProfile = async () => {
    setSetupBusy(true);
    try {
      await ensureMyEmployeeProfile();
      await qc.invalidateQueries({ queryKey: ["hr-employees", HR_ORG_ID] });
      fire("Employee profile ready — you can check in now");
    } catch (e) {
      fire(e instanceof Error ? e.message : "Setup failed — apply migration 16");
    } finally {
      setSetupBusy(false);
    }
  };

  if (!emp) {
    const canManageTeam = isAdmin || actualCan("manageEmp") || actualCan("configure");

    return (
      <div className="card" style={{ padding: 24 }}>
        <div className="serif" style={{ fontSize: 18, fontWeight: 600, marginBottom: 8 }}>
          Set up My Portal to check in
        </div>
        <p className="muted" style={{ fontSize: 13.5, marginBottom: 16, maxWidth: 560 }}>
          Check-in uses <strong>your login</strong> ({user?.email ?? "—"}), not the View-as role
          picker. Admins, counselors, and other staff at Future Link need a one-time employee profile
          linked to this account before punching.
        </p>
        <div className="row-flex" style={{ gap: 10, flexWrap: "wrap" }}>
          <button
            type="button"
            className="btn btn-primary"
            disabled={setupBusy}
            onClick={() => void setupMyProfile()}
          >
            {setupBusy ? "Setting up…" : "Create my employee profile"}
          </button>
          {canManageTeam && (
            <Link to="/hr/roles" className="btn">
              Team &amp; CRM (link to existing)
            </Link>
          )}
        </div>
        {assignedRole && (
          <p className="muted" style={{ fontSize: 12, marginTop: 14 }}>
            Your HR role: <strong>{assignedRole}</strong> — View-as only changes what menus you see;
            it does not change who you punch as.
          </p>
        )}
      </div>
    );
  }

  if (!shift) return <div className="empty">Shift not configured for your profile.</div>;

  const r = line ?? {
    daily_rate: emp.monthly_gross / (cycle?.payroll_days ?? 30),
    payable_days: 0,
    gross_earned: 0,
    incentive: emp.incentive,
    bonus: emp.bonus,
    pf_employee: 0,
    esic_employee: 0,
    net_salary: 0,
    late_count: 0,
    late_deduction: 0,
    comp_off: 0,
  };

  return (
    <div className="grid" style={{ gap: 16 }}>
      <div className="card-h">
        <span className="tag">My Portal</span>
        <span className="tag">{emp.emp_code}</span>
      </div>

      <div className="card" style={{ display: "flex", alignItems: "center", gap: 16, flexWrap: "wrap" }}>
        <EmployeeAvatar name={emp.full_name} photoUrl={emp.photo_url} size={56} fontSize={19} />
        <div style={{ flex: 1, minWidth: 200 }}>
          <div className="serif" style={{ fontSize: 21, fontWeight: 600 }}>
            {emp.full_name}
          </div>
          <div style={{ color: "var(--ink-soft)", fontSize: 13.5 }}>
            {emp.designation} · {emp.department} · {emp.branches?.name ?? "—"}
          </div>
          <div className="row-flex" style={{ marginTop: 6 }}>
            <span className="tag">{emp.emp_code}</span>
            <span className="tag">{emp.employment_type}</span>
            <span
              className="tag"
              style={{
                color:
                  attStatus.tone === "good"
                    ? "var(--good)"
                    : attStatus.tone === "warn"
                      ? "var(--clay)"
                      : "var(--mut)",
              }}
            >
              {attStatus.label}
            </span>
          </div>
        </div>
      </div>

      <PunchStation
        employee={emp}
        shift={shift}
        todayRow={todayRow}
        todayDate={formatWorkDate(punchSession.displayDate)}
        carryOverFrom={punchSession.carryOverFrom ? formatWorkDate(punchSession.carryOverFrom) : null}
        timezone={tz}
        canPunch
        onPunch={(field) => {
          if (!todayRow) return;
          void actions.punch(todayRow, field, emp.full_name, todayRow.work_date);
        }}
        onStartDay={() => void actions.startAndCheckIn(emp.id, emp.full_name)}
        onToggleUnavailable={(unavailable) => {
          if (!todayRow) return;
          void actions.toggleUnavailable(todayRow, unavailable, emp.full_name);
        }}
      />

      <div className="grid g4">
        <Stat lab="Earned Today" val={money(r.daily_rate)} meta="daily rate" color="var(--moss)" />
        <Stat
          lab="Net This Cycle"
          val={money(line?.net_salary ?? 0)}
          meta={`${line?.payable_days ?? 0} payable days`}
          color="var(--gold)"
        />
        <Stat
          lab="Late Comings"
          val={line?.late_count ?? 0}
          meta={`${line?.late_deduction ?? 0}d deduction`}
          color="var(--clay)"
        />
        <Stat lab="Comp-Off" val={line?.comp_off ?? 0} meta="approved" color="var(--sky)" />
      </div>

      <div className="card">
        <div className="card-h">
          <h3>Leave balance</h3>
          <span className="tag">12+6/yr · {MONTHLY_PAID_LEAVE_CAP}/mo cap</span>
        </div>
        <div className="row-flex">
          {shownLeaveBalances.map((b) => (
            <span key={b.type} className="tag">
              {b.type}: {leaveBalanceRemaining(b).toFixed(1)} / {b.entitled}
            </span>
          ))}
        </div>
        <div style={{ fontSize: 11.5, color: "var(--mut)", marginTop: 8 }}>
          This month: {monthLeaveUsed.toFixed(1)} / {MONTHLY_PAID_LEAVE_CAP} paid days used · annual{" "}
          {LEAVE_ENTITLED.casual}+{LEAVE_ENTITLED.sick} (no carry-forward)
        </div>
      </div>

      <div className="grid g2">
        <div className="card">
          <div className="card-h">
            <h3>Salary breakdown</h3>
            {line && cycle && can("export") && (
              <button
                type="button"
                className="btn btn-sm"
                onClick={() => printSalarySlip(emp, line, cycle)}
              >
                ↓ Salary Slip
              </button>
            )}
          </div>
          {(
            [
              ["Monthly Gross", money(emp.monthly_gross)],
              ["Basic", money(emp.basic)],
              ["HRA", money(emp.hra)],
              ["Daily Rate", money(line?.daily_rate ?? 0)],
              ["Payable Days", line?.payable_days ?? 0],
              ["Earned Gross", money(line?.gross_earned ?? 0)],
              ["Incentive", money(line?.incentive ?? 0)],
              ["Bonus", money(line?.bonus ?? 0)],
              ["PF (−)", money(line?.pf_employee ?? 0)],
              ["ESIC (−)", money(line?.esic_employee ?? 0)],
              ["Net Payable", money(line?.net_salary ?? 0)],
            ] as const
          ).map(([k, v], i, a) => (
            <div
              key={k}
              style={{
                display: "flex",
                justifyContent: "space-between",
                padding: "7px 0",
                borderBottom: i < a.length - 1 ? "1px solid #eef0f5" : "none",
              }}
            >
              <span style={{ fontSize: 13, color: "var(--ink-soft)" }}>{k}</span>
              <span
                className="mono"
                style={{
                  fontWeight: i === a.length - 1 ? 700 : 400,
                  color: i === a.length - 1 ? "var(--moss)" : "inherit",
                }}
              >
                {v}
              </span>
            </div>
          ))}
        </div>
        <div className="card">
          <div className="card-h">
            <h3>My documents & statutory</h3>
          </div>
          <div className="grid g3" style={{ gap: 8, marginBottom: 12 }}>
            {(
              [
                ["PF", emp.pf_number?.split("/").pop() ?? "—"],
                ["UAN", emp.uan ?? "—"],
                ["ESIC", emp.esic_number ?? "—"],
              ] as const
            ).map(([a, b]) => (
              <div
                key={a}
                style={{ textAlign: "center", padding: 8, background: "var(--paper)", borderRadius: 8 }}
              >
                <div style={{ fontSize: 10, color: "var(--mut)", fontWeight: 600 }}>{a}</div>
                <div className="mono" style={{ fontSize: 11, marginTop: 3 }}>
                  {b}
                </div>
              </div>
            ))}
          </div>
          <EmployeeDocumentsPanel emp={emp} essOnly />
        </div>
      </div>
    </div>
  );
}
