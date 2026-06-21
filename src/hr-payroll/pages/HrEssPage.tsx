import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
import {
  CalendarDays,
  ClipboardCheck,
  FileText,
  Gift,
} from "lucide-react";
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

function leaveTileTone(type: string): string {
  const t = type.toLowerCase();
  if (t.includes("casual")) return "cyan";
  if (t.includes("sick")) return "orange";
  if (t.includes("unpaid")) return "rose";
  if (t.includes("comp")) return "purple";
  return "blue";
}

export default function HrEssPage() {
  const { user, isAdmin } = useAuth();
  const { actualCan, assignedRole, can, canSee, cycle, fire } = useHrAccess();
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
  const pendingLeaveCount = useMemo(
    () =>
      emp
        ? allLeaves.filter((l) => l.employee_id === emp.id && l.status === "Pending").length
        : 0,
    [allLeaves, emp],
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
      <div className="page-grid">
        <div className="card ess-setup-card">
          <div className="ess-setup-icon">◔</div>
          <h2 className="ess-setup-title">Welcome to My Portal</h2>
          <p className="muted" style={{ fontSize: 13.5, maxWidth: 520 }}>
            Your login (<strong>{user?.email ?? "—"}</strong>) needs a one-time employee profile before you can check in, view pay, or apply for leave.
          </p>
          <ul className="ess-setup-steps">
            <li className="ess-setup-step">
              <span className="ess-setup-step-num">1</span>
              <span>Create your employee profile (one click below).</span>
            </li>
            <li className="ess-setup-step">
              <span className="ess-setup-step-num">2</span>
              <span>Check in from the punch station on this page.</span>
            </li>
            <li className="ess-setup-step">
              <span className="ess-setup-step-num">3</span>
              <span>View salary, leave balance, and documents anytime.</span>
            </li>
          </ul>
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
              <Link to="/hr/config" className="btn">Configuration</Link>
            )}
          </div>
          {assignedRole && (
            <p className="muted" style={{ fontSize: 12, marginTop: 14 }}>
              Your HR role: <strong>{assignedRole}</strong> — View-as only changes menus; it does not change who you punch as.
            </p>
          )}
        </div>
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

  const earnings = [
    ["Monthly gross", money(emp.monthly_gross)],
    ["Basic", money(emp.basic)],
    ["HRA", money(emp.hra)],
    ["Daily rate", money(line?.daily_rate ?? r.daily_rate)],
    ["Payable days", String(line?.payable_days ?? 0)],
    ["Earned gross", money(line?.gross_earned ?? 0)],
    ["Incentive", money(line?.incentive ?? 0)],
    ["Bonus", money(line?.bonus ?? 0)],
  ] as const;

  const deductions = [
    ["PF", money(line?.pf_employee ?? 0)],
    ["ESIC", money(line?.esic_employee ?? 0)],
    ["Other deductions", money(emp.other_deductions ?? 0)],
    ["Late deduction", `${line?.late_deduction ?? 0}d`],
  ] as const;

  return (
    <div className="page-grid">
      <div className="card ess-hero">
        <div className="ess-hero-inner">
          <EmployeeAvatar name={emp.full_name} photoUrl={emp.photo_url} size={56} fontSize={19} />
          <div className="ess-hero-main">
            <div className="ess-hero-title">{emp.full_name}</div>
            <div className="ess-hero-sub">
              {emp.designation} · {emp.department} · {emp.branches?.name ?? "—"}
            </div>
            <div className="ess-hero-tags">
              <span className="ess-chip mono">{emp.emp_code}</span>
              <span className="ess-chip">{emp.hr_employee_categories?.label ?? "—"}</span>
              <span className={`ess-status ess-status--${attStatus.tone}`}>{attStatus.label}</span>
            </div>
          </div>
          {cycle && (
            <div className="ess-hero-side">
              <div className="ess-cycle-chip">
                <span className="ess-cycle-label">Payroll cycle</span>
                <span className="ess-cycle-val">{cycle.label}</span>
                <span className="ess-cycle-meta">
                  {cycle.status} · {cycle.payroll_days} days
                </span>
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="ess-quick-grid">
        {can("apply") && canSee("leave") && (
          <Link to="/hr/leave" className="ess-quick-card ess-quick-leave">
            <span className="ess-quick-icon"><CalendarDays size={18} strokeWidth={2.25} /></span>
            <span>
              <div className="ess-quick-label">Apply for leave</div>
              <div className="ess-quick-hint">
                {pendingLeaveCount > 0 ? `${pendingLeaveCount} pending` : "Casual, sick & more"}
              </div>
            </span>
          </Link>
        )}
        {canSee("attendance") && (
          <Link to="/hr/attendance" className="ess-quick-card ess-quick-attendance">
            <span className="ess-quick-icon"><ClipboardCheck size={18} strokeWidth={2.25} /></span>
            <span>
              <div className="ess-quick-label">My attendance</div>
              <div className="ess-quick-hint">Cycle history & punches</div>
            </span>
          </Link>
        )}
        {can("apply") && canSee("compoff") && (
          <Link to="/hr/compoff" className="ess-quick-card ess-quick-compoff">
            <span className="ess-quick-icon"><Gift size={18} strokeWidth={2.25} /></span>
            <span>
              <div className="ess-quick-label">Comp-off</div>
              <div className="ess-quick-hint">Request comp-off days</div>
            </span>
          </Link>
        )}
        {line && cycle && (
          <button
            type="button"
            className="ess-quick-card ess-quick-slip"
            onClick={() => printSalarySlip(emp, line, cycle)}
          >
            <span className="ess-quick-icon"><FileText size={18} strokeWidth={2.25} /></span>
            <span>
              <div className="ess-quick-label">Salary slip</div>
              <div className="ess-quick-hint">Download PDF</div>
            </span>
          </button>
        )}
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
        <Stat variant="metric" tone="green" lab="Earned Today" val={money(r.daily_rate)} meta="daily rate" />
        <Stat
          variant="metric"
          tone="blue"
          lab="Net This Cycle"
          val={money(line?.net_salary ?? 0)}
          meta={`${line?.payable_days ?? 0} payable days`}
        />
        <Stat
          variant="metric"
          tone="orange"
          lab="Late Comings"
          val={line?.late_count ?? 0}
          meta={`${line?.late_deduction ?? 0}d deduction`}
        />
        <Stat variant="metric" tone="purple" lab="Comp-Off" val={line?.comp_off ?? 0} meta="approved" />
      </div>

      <div className="card ess-leave-card">
        <div className="card-h">
          <h3>Leave balance</h3>
          <div className="row-flex" style={{ gap: 8 }}>
            <span className="tag">12+6/yr · {MONTHLY_PAID_LEAVE_CAP}/mo cap</span>
            {canSee("leave") && (
              <Link to="/hr/leave" className="btn btn-sm">Apply leave →</Link>
            )}
          </div>
        </div>
        <div className="ess-leave-grid">
          {shownLeaveBalances.map((b) => {
            const tone = leaveTileTone(b.type);
            const remaining = leaveBalanceRemaining(b);
            return (
              <div key={b.type} className={`ess-leave-tile ess-leave-tile--${tone}`}>
                <div className="ess-leave-tile-type">{b.type}</div>
                <div className="ess-leave-tile-val">{remaining.toFixed(1)}</div>
                <div className="ess-leave-tile-sub">of {b.entitled} entitled</div>
              </div>
            );
          })}
        </div>
        <div className="ess-leave-foot">
          This month: <strong>{monthLeaveUsed.toFixed(1)}</strong> / {MONTHLY_PAID_LEAVE_CAP} paid days used · annual{" "}
          {LEAVE_ENTITLED.casual}+{LEAVE_ENTITLED.sick} (no carry-forward)
        </div>
      </div>

      <div className="grid g2">
        <div className="card ess-salary-card">
          <div className="ess-salary-head card-h">
            <h3>Salary breakdown</h3>
            {line && cycle && (
              <button
                type="button"
                className="btn btn-sm"
                onClick={() => printSalarySlip(emp, line, cycle)}
              >
                ↓ Salary slip
              </button>
            )}
          </div>
          <div className="ess-salary-cols">
            <div className="ess-salary-col">
              <div className="ess-salary-col-title">Earnings</div>
              {earnings.map(([label, val]) => (
                <div key={label} className="ess-salary-row">
                  <span className="ess-salary-row-label">{label}</span>
                  <span className="ess-salary-row-val">{val}</span>
                </div>
              ))}
            </div>
            <div className="ess-salary-col">
              <div className="ess-salary-col-title">Deductions</div>
              {deductions.map(([label, val]) => (
                <div key={label} className="ess-salary-row ess-salary-row--deduct">
                  <span className="ess-salary-row-label">{label}</span>
                  <span className="ess-salary-row-val">{val}</span>
                </div>
              ))}
            </div>
          </div>
          <div className="ess-salary-net">
            <span className="ess-salary-net-label">Net payable this cycle</span>
            <span className="ess-salary-net-val">{money(line?.net_salary ?? 0)}</span>
          </div>
        </div>

        <div className="card">
          <div className="card-h">
            <h3>My documents & statutory</h3>
          </div>
          <div className="ess-stat-grid">
            {(
              [
                ["PF", emp.pf_number?.split("/").pop() ?? "—"],
                ["UAN", emp.uan ?? "—"],
                ["ESIC", emp.esic_number ?? "—"],
              ] as const
            ).map(([label, val]) => (
              <div key={label} className="ess-stat-tile">
                <div className="ess-stat-tile-label">{label}</div>
                <div className="ess-stat-tile-val">{val}</div>
              </div>
            ))}
          </div>
          <EmployeeDocumentsPanel emp={emp} essOnly />
        </div>
      </div>
    </div>
  );
}
