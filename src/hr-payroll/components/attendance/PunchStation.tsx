import { useEffect, useState } from "react";
import { dayMetrics, fmtDur, nowHhmm, type ShiftMetrics } from "../../lib/attendanceMetrics";
import type { AttendanceRow, EmployeeRow, ShiftRow } from "../../lib/types";

type Props = {
  employee: EmployeeRow;
  shift: ShiftRow;
  todayRow: AttendanceRow | null;
  todayDate: string;
  canPunch: boolean;
  onPunch: (field: "check_in" | "check_out" | "break_start" | "break_end") => void;
  onStartDay: () => void;
  onToggleUnavailable?: (unavailable: boolean) => void;
};

export function PunchStation({
  employee,
  shift,
  todayRow,
  todayDate,
  canPunch,
  onPunch,
  onStartDay,
  onToggleUnavailable,
}: Props) {
  const [clock, setClock] = useState(new Date());
  useEffect(() => {
    const t = setInterval(() => setClock(new Date()), 1000);
    return () => clearInterval(t);
  }, []);

  const shiftMetrics: ShiftMetrics = {
    login: shift.login_time.slice(0, 5),
    logout: shift.logout_time.slice(0, 5),
    grace: shift.grace_min ?? 5,
    breakDur: shift.break_min ?? 45,
    halfDayAfter: shift.half_day_after_min ?? 60,
    workHrs: Number(shift.work_hours ?? 9),
  };

  const m = todayRow ? dayMetrics(todayRow, shiftMetrics) : null;
  const hhmmss = clock.toLocaleTimeString("en-IN", { hour12: false });

  const Btn = ({
    field,
    label,
    color,
    disabled,
    done,
    doneVal,
  }: {
    field: "check_in" | "check_out" | "break_start" | "break_end";
    label: string;
    color: string;
    disabled: boolean;
    done: boolean;
    doneVal?: string | null;
  }) => (
    <button
      type="button"
      onClick={() => onPunch(field)}
      disabled={disabled || !canPunch}
      style={{
        flex: 1,
        minWidth: 120,
        border: "none",
        borderRadius: 12,
        padding: "14px 12px",
        cursor: disabled || !canPunch ? "not-allowed" : "pointer",
        background: done ? "#eef5ff" : disabled ? "#f0f1f4" : color,
        color: done ? "var(--ink-soft)" : disabled ? "var(--mut)" : "#fff",
        fontFamily: "inherit",
        fontWeight: 600,
        fontSize: 14,
        boxShadow: disabled || done ? "none" : `0 4px 12px ${color}55`,
      }}
    >
      <div style={{ fontSize: 18, marginBottom: 3 }}>
        {done ? "✓" : ""} {label}
      </div>
      <div style={{ fontSize: 12, fontWeight: 500, opacity: 0.85 }}>
        {done ? `at ${doneVal?.slice(0, 5)}` : disabled ? "—" : "tap to stamp"}
      </div>
    </button>
  );

  if (!todayRow) {
    return (
      <div
        className="card"
        style={{
          background: "linear-gradient(135deg,#1a2233,#1e4e7e)",
          color: "#fff",
          border: "none",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          flexWrap: "wrap",
          gap: 12,
        }}
      >
        <div>
          <div style={{ fontSize: 11, letterSpacing: 1, textTransform: "uppercase", opacity: 0.7 }}>
            Punch Station · {employee.full_name.split(" ")[0]}
          </div>
          <div className="mono" style={{ fontSize: 30, fontWeight: 600, marginTop: 2 }}>
            {hhmmss}
          </div>
          <div style={{ fontSize: 12, opacity: 0.85 }}>
            No row for {todayDate} yet — start your day to begin punching.
          </div>
        </div>
        {canPunch && (
          <button
            type="button"
            className="btn"
            style={{ background: "#16a06a", color: "#fff", border: "none" }}
            onClick={onStartDay}
          >
            ● Start today & Check In
          </button>
        )}
      </div>
    );
  }

  const maxBreak = shift.max_break_min ?? shift.break_min ?? 45;
  const breakExceeded = m?.breakMin != null && m.breakMin > maxBreak + 1;
  const checkedIn = !!todayRow.check_in;
  const checkedOut = !!todayRow.check_out;
  const onBreak = !!todayRow.break_start && !todayRow.break_end;
  const unavailable = !!todayRow.ess_unavailable;
  const openSession = checkedIn && !checkedOut;
  const showMispunch = todayRow.is_mispunch && !openSession;

  return (
    <div
      className="card"
      style={{
        background: "linear-gradient(135deg,#1a2233,#1e4e7e)",
        color: "#fff",
        border: "none",
      }}
    >
      <div
        className="row-flex"
        style={{ justifyContent: "space-between", marginBottom: 14, flexWrap: "wrap", gap: 10 }}
      >
        <div>
          <div style={{ fontSize: 11, letterSpacing: 1, textTransform: "uppercase", opacity: 0.7 }}>
            Punch Station · {employee.full_name.split(" ")[0]}
          </div>
          <div className="mono" style={{ fontSize: 30, fontWeight: 600, marginTop: 2 }}>
            {hhmmss}
          </div>
          <div style={{ fontSize: 12, opacity: 0.8 }}>
            {clock.toLocaleDateString("en-IN", { weekday: "long", day: "numeric", month: "long" })} · Shift{" "}
            {shiftMetrics.login}–{shiftMetrics.logout} (salary reference) · punch anytime
          </div>
          <div style={{ fontSize: 12, opacity: 0.8 }}>
            Max break {maxBreak}m
            {shift.break_window_start && shift.break_window_end
              ? ` · window ${shift.break_window_start.slice(0, 5)}–${shift.break_window_end.slice(0, 5)}`
              : ""}
          </div>
        </div>
        <div style={{ textAlign: "right" }}>
          <div style={{ fontSize: 11, opacity: 0.7, textTransform: "uppercase" }}>Today</div>
          <div style={{ fontSize: 15, fontWeight: 600, marginTop: 2 }}>
            {unavailable ? "Unavailable" : todayRow.status}
            {showMispunch ? " · mispunch" : ""}
            {m?.offShiftCheckIn && openSession ? " · off-shift" : ""}
          </div>
          <div className="mono" style={{ fontSize: 12, opacity: 0.85 }}>
            Net {fmtDur(m?.net ?? null)} · shift {fmtDur(m?.shiftWorkMin ?? null)}
            {m?.offShiftMin ? ` · extra ${fmtDur(m.offShiftMin)}` : ""}
            {m?.lateMin ? ` · late ${m.lateMin}m` : m?.offShiftCheckIn ? " · extra hours (no salary impact)" : " · on time"}
          </div>
        </div>
      </div>
      {breakExceeded && (
        <div style={{ fontSize: 12, background: "#fff3cd", color: "#856404", padding: 8, borderRadius: 8, marginBottom: 10 }}>
          Break exceeded {maxBreak}m — may affect salary per policy.
        </div>
      )}
      <div className="row-flex" style={{ gap: 10, flexWrap: "wrap" }}>
        <Btn
          field="check_in"
          label="Check In"
          color="#16a06a"
          disabled={checkedIn}
          done={checkedIn}
          doneVal={todayRow.check_in}
        />
        <Btn
          field="break_start"
          label="Break Start"
          color="#e0a82e"
          disabled={!checkedIn || !!checkedOut || !!todayRow.break_start}
          done={!!todayRow.break_start}
          doneVal={todayRow.break_start}
        />
        <Btn
          field="break_end"
          label="Break End"
          color="#e8732e"
          disabled={!onBreak}
          done={!!todayRow.break_end}
          doneVal={todayRow.break_end}
        />
        <Btn
          field="check_out"
          label="Check Out"
          color="#e5484d"
          disabled={!checkedIn || !!checkedOut}
          done={!!checkedOut}
          doneVal={todayRow.check_out}
        />
        {onToggleUnavailable && checkedIn && !checkedOut && (
          <button
            type="button"
            onClick={() => onToggleUnavailable(!unavailable)}
            disabled={!canPunch || onBreak}
            style={{
              flex: 1,
              minWidth: 120,
              border: "none",
              borderRadius: 12,
              padding: "14px 12px",
              cursor: !canPunch || onBreak ? "not-allowed" : "pointer",
              background: unavailable ? "#eef5ff" : "#4a5568",
              color: unavailable ? "var(--ink-soft)" : "#fff",
              fontFamily: "inherit",
              fontWeight: 600,
              fontSize: 14,
            }}
          >
            <div style={{ fontSize: 18, marginBottom: 3 }}>{unavailable ? "✓" : ""} Unavailable</div>
            <div style={{ fontSize: 12, fontWeight: 500, opacity: 0.85 }}>
              {unavailable ? "tap to mark available" : "away from desk"}
            </div>
          </button>
        )}
      </div>
    </div>
  );
}

export { nowHhmm };
