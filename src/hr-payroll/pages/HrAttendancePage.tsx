import { useEffect, useState } from "react";
import { useHrAccess } from "../context/HrPayrollProvider";
import { useHrEmployees } from "../hooks/useHrEmployees";
import { useHrShifts } from "../hooks/useHrShifts";
import { useHrAttendance } from "../hooks/useHrAttendance";
import { useHrPayrollLine } from "../hooks/useHrPayroll";
import { useAttendanceActions } from "../hooks/useAttendanceActions";
import { EmployeeSeg } from "../components/ui/EmployeeSeg";
import { Stat } from "../components/ui/Stat";
import { PunchStation } from "../components/attendance/PunchStation";
import { EditCell } from "../components/attendance/EditCell";
import {
  ATTENDANCE_STATUSES,
  dayMetrics,
  formatWorkDate,
  formatWorkDay,
  fmtDur,
  todayIso,
} from "../lib/attendanceMetrics";
import type { AttendanceRow, ShiftRow } from "../lib/types";

function rollupStats(att: AttendanceRow[], shift: ShiftRow) {
  const sm = {
    login: shift.login_time.slice(0, 5),
    logout: shift.logout_time.slice(0, 5),
    grace: shift.grace_min ?? 5,
    breakDur: shift.break_min ?? 45,
    halfDayAfter: shift.half_day_after_min ?? 60,
    workHrs: Number(shift.work_hours ?? 9),
  };
  let lateCount = 0;
  let mispunch = 0;
  let leaves = 0;
  let working = 0;
  let breakMin = 0;
  let otMin = 0;
  for (const a of att) {
    const m = dayMetrics(a, sm);
    if (a.status === "Week Off" || a.status === "Holiday") continue;
    if (a.status === "Leave" || a.status === "Sick Leave") {
      leaves++;
      continue;
    }
    if (a.status === "Unauthorized Leave" || a.status === "Absent") continue;
    if (a.status === "Half Day") working += 0.5;
    else if (a.status === "Present") working++;
    if (m.lateBeyondGrace) lateCount++;
    if (a.is_mispunch) mispunch++;
    breakMin += m.breakMin;
    otMin += m.otMin;
  }
  return {
    lateCount,
    mispunch,
    leaves,
    working: Math.round(working * 10) / 10,
    breakMin,
    otMin,
  };
}

type AttendanceViewProps = {
  mode: "admin" | "ess";
};

export function AttendanceView({ mode }: AttendanceViewProps) {
  const { can, cycle, fire } = useHrAccess();
  const { data: employees = [] } = useHrEmployees();
  const { data: shifts = [] } = useHrShifts();
  const [empId, setEmpId] = useState("");
  const emp = employees.find((e) => e.id === empId) ?? employees[0];
  const shift = shifts.find((s) => s.id === emp?.shift_id) ?? shifts[0];
  const effectiveId = emp?.id;

  const { data: att = [] } = useHrAttendance(
    effectiveId,
    cycle?.start_date,
    cycle?.end_date,
  );
  const actions = useAttendanceActions(cycle?.id, cycle?.start_date, cycle?.end_date, fire);

  const today = todayIso();
  const todayRow = att.find((a) => a.work_date === today) ?? null;
  const ru = shift && att.length ? rollupStats(att, shift) : null;
  const mng = mode === "admin" && (can("manageEmp") || can("approve"));
  const canPunch = mode === "ess" ? can("apply") : mng;

  useEffect(() => {
    if (!empId && employees[0]) setEmpId(employees[0].id);
  }, [empId, employees]);

  const { data: line } = useHrPayrollLine(effectiveId, cycle?.id);
  const payableDisplay = line ? String(line.payable_days) : "—";

  if (!emp || !shift) return <div className="empty">No employees or shifts configured.</div>;

  return (
    <div className="grid" style={{ gap: 16 }}>
      {mode === "admin" && (
        <div className="card-h">
          <EmployeeSeg employees={employees} selectedId={emp.id} onSelect={setEmpId} />
          <span className="tag">
            {emp.full_name} · {shift.name} ({shift.login_time.slice(0, 5)}–
            {shift.logout_time.slice(0, 5)}, grace {shift.grace_min ?? 5}m)
          </span>
        </div>
      )}

      <PunchStation
        employee={emp}
        shift={shift}
        todayRow={todayRow}
        todayDate={formatWorkDate(today)}
        canPunch={!!canPunch}
        onPunch={(field) => {
          if (!todayRow) return;
          void actions.punch(todayRow, field, emp.full_name, todayRow.work_date);
        }}
        onStartDay={() => void actions.startAndCheckIn(emp.id, emp.full_name)}
      />

      {ru && (
        <div className="grid g6">
          <Stat lab="Working" val={ru.working} meta="present days" color="var(--moss)" />
          <Stat lab="Late (>grace)" val={ru.lateCount} meta="feeds slab" color="var(--clay)" />
          <Stat lab="Mispunch" val={ru.mispunch} meta="raw count" color="var(--rose)" />
          <Stat lab="Break total" val={fmtDur(ru.breakMin)} meta="this cycle" color="var(--sky)" />
          <Stat lab="Overtime" val={fmtDur(ru.otMin)} meta="beyond target" color="var(--gold)" />
          <Stat lab="Payable" val={payableDisplay} meta="after rules" color="var(--moss-deep)" />
        </div>
      )}

      <div className="card" style={{ padding: 0, overflow: "auto" }}>
        <div className="card-h" style={{ padding: "14px 16px 0", marginBottom: 0 }}>
          <h3 style={{ fontSize: 15 }}>Daily punch register</h3>
          {mng && !todayRow && (
            <button
              type="button"
              className="btn btn-sm btn-primary"
              onClick={() => void actions.addToday(emp.id, emp.full_name)}
            >
              + Add today ({formatWorkDate(today)})
            </button>
          )}
        </div>
        <table style={{ minWidth: 1120 }}>
          <thead>
            <tr>
              <th>Date</th>
              <th>Day</th>
              <th>In</th>
              <th>Out</th>
              <th>Break In</th>
              <th>Break Out</th>
              <th>Break</th>
              <th>Net Hrs</th>
              <th>Late</th>
              <th>OT</th>
              <th>Mispunch</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {att.map((a) => {
              const sm = {
                login: shift.login_time.slice(0, 5),
                logout: shift.logout_time.slice(0, 5),
                grace: shift.grace_min ?? 5,
                breakDur: shift.break_min ?? 45,
                halfDayAfter: shift.half_day_after_min ?? 60,
                workHrs: Number(shift.work_hours ?? 9),
              };
              const m = dayMetrics(a, sm);
              const isToday = a.work_date === today;
              return (
                <tr key={a.id} style={isToday ? { background: "#f3f8ff" } : undefined}>
                  <td className="strong">
                    {formatWorkDate(a.work_date)}
                    {isToday && (
                      <span className="tag" style={{ marginLeft: 5, color: "var(--moss)" }}>
                        today
                      </span>
                    )}
                  </td>
                  <td>{formatWorkDay(a.work_date)}</td>
                  <td>
                    <EditCell
                      value={a.check_in?.slice(0, 5) ?? "—"}
                      editable={!!mng}
                      onSave={(v) =>
                        void actions.updateField(a, { check_in: v || null }, emp.full_name)
                      }
                    />
                  </td>
                  <td>
                    <EditCell
                      value={a.check_out?.slice(0, 5) ?? "—"}
                      editable={!!mng}
                      onSave={(v) =>
                        void actions.updateField(a, { check_out: v || null }, emp.full_name)
                      }
                    />
                  </td>
                  <td>
                    <EditCell
                      value={a.break_start?.slice(0, 5) ?? "—"}
                      editable={!!mng}
                      onSave={(v) =>
                        void actions.updateField(a, { break_start: v || null }, emp.full_name)
                      }
                    />
                  </td>
                  <td>
                    <EditCell
                      value={a.break_end?.slice(0, 5) ?? "—"}
                      editable={!!mng}
                      onSave={(v) =>
                        void actions.updateField(a, { break_end: v || null }, emp.full_name)
                      }
                    />
                  </td>
                  <td className="mono" style={{ fontSize: 11.5 }}>
                    {fmtDur(m.breakMin)}
                  </td>
                  <td className="mono" style={{ fontSize: 11.5 }}>
                    {fmtDur(m.net)}
                  </td>
                  <td
                    style={{
                      color: m.lateBeyondGrace ? "var(--clay)" : "inherit",
                      fontWeight: m.lateBeyondGrace ? 600 : 400,
                    }}
                  >
                    {m.lateMin ? `${m.lateMin}m` : "—"}
                  </td>
                  <td className="mono" style={{ fontSize: 11.5, color: m.otMin ? "var(--gold)" : "inherit" }}>
                    {m.otMin ? fmtDur(m.otMin) : "—"}
                  </td>
                  <td>
                    <button
                      type="button"
                      className={`chip-toggle${a.is_mispunch ? " on" : ""}`}
                      disabled={!mng}
                      onClick={() =>
                        void actions.updateField(
                          a,
                          { is_mispunch: !a.is_mispunch },
                          emp.full_name,
                        )
                      }
                    >
                      {a.is_mispunch ? "Yes" : "No"}
                    </button>
                  </td>
                  <td>
                    <select
                      className="input"
                      style={{ padding: "5px 7px", width: 150 }}
                      value={a.status}
                      disabled={!mng}
                      onChange={(e) =>
                        void actions.updateField(a, { status: e.target.value }, emp.full_name)
                      }
                    >
                      {ATTENDANCE_STATUSES.map((s) => (
                        <option key={s}>{s}</option>
                      ))}
                    </select>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default function HrAttendancePage() {
  return <AttendanceView mode="admin" />;
}
