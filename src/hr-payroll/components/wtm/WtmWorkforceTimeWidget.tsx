import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useWtmBreaks, useWtmSession } from "../../hooks/useWtm";
import { useWtmActions } from "../../hooks/useWtmActions";
import { formatClockInTz, formatDateLongInTz, timezoneAbbrev } from "../../lib/employeeTimezone";
import { fmtDur } from "../../lib/attendanceMetrics";
import { computeWtmLiveTimer, formatTimerDuration } from "../../lib/wtmTimer";
import { WTM_SESSION_STATUS_LABEL } from "../../lib/wtmTypes";
import type { EmployeeRow, ShiftRow } from "../../lib/types";

type Props = {
  employee: EmployeeRow;
  shift: ShiftRow;
  workDate: string;
  timezone: string;
  canPunch: boolean;
  historyPath?: string;
  cycleId?: string;
  cycleStart?: string;
  cycleEnd?: string;
  fire: (msg: string) => void;
};

export function WtmWorkforceTimeWidget({
  employee,
  shift,
  workDate,
  timezone,
  canPunch,
  historyPath = "/hr/me/time-history",
  cycleId,
  cycleStart,
  cycleEnd,
  fire,
}: Props) {
  const [clock, setClock] = useState(new Date());
  const { data: session, isLoading } = useWtmSession(employee.id, workDate);
  const { data: breaks = [] } = useWtmBreaks(session?.id);
  const actions = useWtmActions(timezone, fire, cycleId, cycleStart, cycleEnd);

  useEffect(() => {
    const t = setInterval(() => setClock(new Date()), 1000);
    return () => clearInterval(t);
  }, []);

  const live = useMemo(
    () => computeWtmLiveTimer(session, breaks, clock),
    [session, breaks, clock],
  );

  const hhmmss = formatClockInTz(timezone, clock);
  const tzLabel = timezoneAbbrev(timezone);
  const onBreak = session?.session_status === "On Break";
  const working = session?.session_status === "Working";
  const completed = session?.session_status === "Completed";
  const canClockIn = canPunch && !session?.clock_in && !completed;
  const canClockOut = canPunch && !!session?.clock_in && !session?.clock_out && !onBreak;
  const canBreakOut = canPunch && working && !onBreak;
  const canBreakIn = canPunch && onBreak;

  const PunchBtn = ({
    label,
    onClick,
    disabled,
    done,
    doneVal,
    tone,
  }: {
    label: string;
    onClick: () => void;
    disabled: boolean;
    done?: boolean;
    doneVal?: string | null;
    tone: string;
  }) => (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={[
        "ess-punch-btn",
        `ess-punch-btn--${tone}`,
        done && "ess-punch-btn--done",
        disabled && "ess-punch-btn--disabled",
      ]
        .filter(Boolean)
        .join(" ")}
    >
      <div className="ess-punch-btn-title">{done ? "✓ " : ""}{label}</div>
      <div className="ess-punch-btn-sub">
        {done && doneVal ? `at ${doneVal.slice(0, 5)}` : disabled ? "—" : "tap to stamp"}
      </div>
    </button>
  );

  return (
    <div className="card ess-punch-station">
      <div className="ess-punch-head">
        <div>
          <div className="ess-punch-label">
            Workforce Time · {employee.full_name.split(" ")[0]}
          </div>
          <div className="ess-punch-clock">
            {hhmmss} <span className="ess-punch-tz">{tzLabel}</span>
          </div>
          <div className="ess-punch-meta">
            {formatDateLongInTz(timezone, clock)} · Shift {shift.login_time.slice(0, 5)}–{shift.logout_time.slice(0, 5)}
          </div>
        </div>
        <div className="ess-punch-status-block">
          <div className="ess-punch-label">Today&apos;s status</div>
          <div className="ess-punch-status-val">
            {isLoading ? "…" : session ? WTM_SESSION_STATUS_LABEL[session.session_status] : "Not started"}
          </div>
          <div className="ess-punch-stats">
            Working {formatTimerDuration(live.workingSec)}
            {live.breakSec > 0 ? ` · Break ${formatTimerDuration(live.breakSec)}` : ""}
          </div>
        </div>
      </div>

      <div className="ess-punch-meta" style={{ marginBottom: 12 }}>
        Clock in {session?.clock_in?.slice(0, 5) ?? "—"}
        {" · "}
        Clock out {session?.clock_out?.slice(0, 5) ?? "—"}
        {" · "}
        Break {fmtDur(session?.break_duration_min ?? 0)}
        {session?.working_duration_min && completed
          ? ` · Net ${fmtDur(session.working_duration_min)}`
          : ""}
      </div>

      {breaks.length > 0 && (
        <div className="ess-punch-meta" style={{ marginBottom: 12 }}>
          Breaks: {breaks.map((b, i) => (
            <span key={b.id}>
              {i > 0 ? ", " : ""}
              {b.break_out.slice(0, 5)}–{b.break_in?.slice(0, 5) ?? "…"}
            </span>
          ))}
        </div>
      )}

      <div className="ess-punch-actions">
        <PunchBtn
          label="Clock In"
          tone="check-in"
          disabled={!canClockIn}
          done={!!session?.clock_in && !completed}
          doneVal={session?.clock_in}
          onClick={() => void actions.clockIn(employee.id, workDate)}
        />
        <PunchBtn
          label="Break Out"
          tone="break-start"
          disabled={!canBreakOut}
          done={onBreak}
          doneVal={breaks.find((b) => !b.break_in)?.break_out}
          onClick={() => session && void actions.breakOut(session)}
        />
        <PunchBtn
          label="Break In"
          tone="break-end"
          disabled={!canBreakIn}
          done={false}
          onClick={() => session && void actions.breakIn(session)}
        />
        <PunchBtn
          label="Clock Out"
          tone="check-out"
          disabled={!canClockOut}
          done={completed}
          doneVal={session?.clock_out}
          onClick={() => session && void actions.clockOut(session)}
        />
      </div>

      <div style={{ marginTop: 12, display: "flex", gap: 8, flexWrap: "wrap" }}>
        <Link to={historyPath} className="btn btn-sm">
          Attendance history →
        </Link>
      </div>
    </div>
  );
}
