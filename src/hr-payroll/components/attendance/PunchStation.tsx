import { useEffect, useState } from "react";
import { dayMetrics, fmtDur, type ShiftMetrics } from "../../lib/attendanceMetrics";
import { formatClockInTz, formatDateLongInTz, timezoneAbbrev } from "../../lib/employeeTimezone";
import type { AttendanceRow, EmployeeRow, ShiftRow } from "../../lib/types";

type PunchField = "check_in" | "check_out" | "break_start" | "break_end";

const FIELD_CLASS: Record<PunchField, string> = {
  check_in: "ess-punch-btn--check-in",
  check_out: "ess-punch-btn--check-out",
  break_start: "ess-punch-btn--break-start",
  break_end: "ess-punch-btn--break-end",
};

type Props = {
  employee: EmployeeRow;
  shift: ShiftRow;
  todayRow: AttendanceRow | null;
  todayDate: string;
  carryOverFrom?: string | null;
  timezone: string;
  canPunch: boolean;
  onPunch: (field: PunchField) => void;
  onStartDay: () => void;
  onToggleUnavailable?: (unavailable: boolean) => void;
};

export function PunchStation({
  employee,
  shift,
  todayRow,
  todayDate,
  carryOverFrom,
  timezone,
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
  const hhmmss = formatClockInTz(timezone, clock);
  const tzLabel = timezoneAbbrev(timezone);

  const PunchBtn = ({
    field,
    label,
    disabled,
    done,
    doneVal,
  }: {
    field: PunchField;
    label: string;
    disabled: boolean;
    done: boolean;
    doneVal?: string | null;
  }) => {
    const inactive = disabled || !canPunch;
    const classes = [
      "ess-punch-btn",
      FIELD_CLASS[field],
      done && "ess-punch-btn--done",
      inactive && "ess-punch-btn--disabled",
    ]
      .filter(Boolean)
      .join(" ");

    return (
      <button
        type="button"
        onClick={() => onPunch(field)}
        disabled={inactive}
        className={classes}
      >
        <div className="ess-punch-btn-title">{done ? "✓ " : ""}{label}</div>
        <div className="ess-punch-btn-sub">
          {done ? `at ${doneVal?.slice(0, 5)}` : inactive ? "—" : "tap to stamp"}
        </div>
      </button>
    );
  };

  if (!todayRow) {
    return (
      <div className="card ess-punch-station ess-punch-station--empty">
        <div>
          <div className="ess-punch-label">
            Punch Station · {employee.full_name.split(" ")[0]}
          </div>
          <div className="ess-punch-clock">
            {hhmmss} <span className="ess-punch-tz">{tzLabel}</span>
          </div>
          <div className="ess-punch-meta">
            {formatDateLongInTz(timezone, clock)} · No row for {todayDate} yet — start your day to check in (any time, 24h).
          </div>
        </div>
        {canPunch && (
          <button type="button" className="ess-punch-start-btn" onClick={onStartDay}>
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
  const sessionClosed = checkedIn && checkedOut;
  const showMispunch = todayRow.is_mispunch && !openSession;

  return (
    <div className="card ess-punch-station">
      <div className="ess-punch-head">
        <div>
          <div className="ess-punch-label">
            Punch Station · {employee.full_name.split(" ")[0]}
          </div>
          <div className="ess-punch-clock">
            {hhmmss} <span className="ess-punch-tz">{tzLabel}</span>
          </div>
          <div className="ess-punch-meta">
            {formatDateLongInTz(timezone, clock)} · Shift {shiftMetrics.login}–{shiftMetrics.logout} (salary reference) · punch anytime
          </div>
          <div className="ess-punch-meta">
            Max break {maxBreak}m
            {shift.break_window_start && shift.break_window_end
              ? ` · window ${shift.break_window_start.slice(0, 5)}–${shift.break_window_end.slice(0, 5)}`
              : ""}
          </div>
        </div>
        <div className="ess-punch-status-block">
          <div className="ess-punch-label">Today</div>
          <div className="ess-punch-status-val">
            {unavailable ? "Unavailable" : todayRow.status}
            {showMispunch ? " · mispunch" : ""}
            {m?.offShiftCheckIn && openSession ? " · off-shift" : ""}
          </div>
          <div className="ess-punch-stats">
            Net {fmtDur(m?.net ?? null)} · shift {fmtDur(m?.shiftWorkMin ?? null)}
            {m?.offShiftMin ? ` · extra ${fmtDur(m.offShiftMin)}` : ""}
            {m?.lateMin
              ? ` · late ${m.lateMin}m`
              : m?.offShiftCheckIn
                ? " · extra hours (no salary impact)"
                : " · on time"}
          </div>
        </div>
      </div>

      {carryOverFrom && (
        <div className="ess-punch-alert">
          Open session from {carryOverFrom} — check out here to close (works past midnight).
        </div>
      )}
      {breakExceeded && (
        <div className="ess-punch-warn">
          Break exceeded {maxBreak}m — may affect salary per policy.
        </div>
      )}

      <div className="ess-punch-actions">
        <PunchBtn
          field="check_in"
          label={sessionClosed ? "Check In again" : "Check In"}
          disabled={openSession}
          done={openSession}
          doneVal={openSession ? todayRow.check_in : null}
        />
        <PunchBtn
          field="break_start"
          label="Break Start"
          disabled={!openSession || !!todayRow.break_start}
          done={openSession && !!todayRow.break_start}
          doneVal={todayRow.break_start}
        />
        <PunchBtn
          field="break_end"
          label="Break End"
          disabled={!onBreak}
          done={openSession && !!todayRow.break_end}
          doneVal={todayRow.break_end}
        />
        <PunchBtn
          field="check_out"
          label="Check Out"
          disabled={!openSession}
          done={!!checkedOut}
          doneVal={todayRow.check_out}
        />
        {onToggleUnavailable && checkedIn && !checkedOut && (
          <button
            type="button"
            onClick={() => onToggleUnavailable(!unavailable)}
            disabled={!canPunch || onBreak}
            className={[
              "ess-punch-btn",
              "ess-punch-btn--unavailable",
              unavailable && "ess-punch-btn--done",
              (!canPunch || onBreak) && "ess-punch-btn--disabled",
            ]
              .filter(Boolean)
              .join(" ")}
          >
            <div className="ess-punch-btn-title">{unavailable ? "✓ " : ""}Unavailable</div>
            <div className="ess-punch-btn-sub">
              {unavailable ? "tap to mark available" : "away from desk"}
            </div>
          </button>
        )}
      </div>
    </div>
  );
}
