import { useMemo, useState } from "react";
import { Emp360SummaryCard } from "./Emp360SummaryCard";
import { dateInRange, rangesOverlap } from "../../lib/emp360DateRange";
import type { EmployeePayrollHistoryLine } from "../../hooks/useHrPayroll";
import type {
  AttendanceRow,
  EmployeeShiftHistoryRow,
  LeaveRequestRow,
  TrainingRecordRow,
} from "../../lib/types";

type ActivityCategory =
  | "all"
  | "attendance"
  | "leave"
  | "payroll"
  | "training"
  | "shift";

type ActivityItem = {
  id: string;
  date: string;
  category: Exclude<ActivityCategory, "all">;
  label: string;
  detail?: string;
};

type Props = {
  from: string;
  to: string;
  attendance: AttendanceRow[];
  leaves: LeaveRequestRow[];
  payroll: EmployeePayrollHistoryLine[];
  training: TrainingRecordRow[];
  shiftHistory: EmployeeShiftHistoryRow[];
};

const CATEGORY_LABELS: Record<Exclude<ActivityCategory, "all">, string> = {
  attendance: "Attendance",
  leave: "Leave",
  payroll: "Payroll",
  training: "Training",
  shift: "Shift change",
};

const FILTER_OPTIONS: { value: ActivityCategory; label: string }[] = [
  { value: "all", label: "All" },
  { value: "attendance", label: "Attendance" },
  { value: "leave", label: "Leave" },
  { value: "payroll", label: "Payroll" },
  { value: "training", label: "Training" },
  { value: "shift", label: "Shift changes" },
];

function buildActivities(props: Props): ActivityItem[] {
  const items: ActivityItem[] = [];

  for (const a of props.attendance) {
    if (!dateInRange(a.work_date, props.from, props.to)) continue;
    const notable =
      a.status === "Absent" ||
      a.status === "Late" ||
      a.status === "Half Day" ||
      a.is_mispunch;
    if (!notable) continue;
    items.push({
      id: `att-${a.id}`,
      date: a.work_date,
      category: "attendance",
      label: a.is_mispunch ? `Mispunch · ${a.status}` : a.status,
      detail: [a.check_in, a.check_out].filter(Boolean).join(" – ") || undefined,
    });
  }

  for (const l of props.leaves) {
    if (!rangesOverlap(l.from_date, l.to_date, props.from, props.to)) continue;
    items.push({
      id: `leave-${l.id}`,
      date: l.from_date,
      category: "leave",
      label: `${l.type} · ${l.status}`,
      detail:
        l.to_date !== l.from_date
          ? `${l.from_date} → ${l.to_date} (${l.days}d)`
          : `${l.days}d`,
    });
  }

  for (const pl of props.payroll) {
    const cycle = pl.payroll_cycles;
    if (!cycle?.start_date || !cycle?.end_date) continue;
    if (!rangesOverlap(cycle.start_date, cycle.end_date, props.from, props.to)) continue;
    items.push({
      id: `pay-${pl.id}`,
      date: cycle.end_date,
      category: "payroll",
      label: `Payroll · ${cycle.label}`,
      detail: cycle.status,
    });
  }

  for (const t of props.training) {
    if (!t.start_date || !dateInRange(t.start_date, props.from, props.to)) continue;
    items.push({
      id: `train-${t.id}`,
      date: t.start_date,
      category: "training",
      label: `${t.type} · ${t.status}`,
      detail: t.duration ?? undefined,
    });
  }

  for (const s of props.shiftHistory) {
    const effective = s.effective_from;
    if (!effective || !dateInRange(effective, props.from, props.to)) continue;
    items.push({
      id: `shift-${s.id}`,
      date: effective,
      category: "shift",
      label: `Shift change · ${s.shifts?.name ?? "—"}`,
      detail: s.change_reason ?? undefined,
    });
  }

  return items.sort((a, b) => b.date.localeCompare(a.date));
}

export function Emp360ActivityTimeline(props: Props) {
  const [filter, setFilter] = useState<ActivityCategory>("all");
  const all = useMemo(() => buildActivities(props), [props]);

  const visible =
    filter === "all" ? all : all.filter((a) => a.category === filter);

  return (
    <Emp360SummaryCard title="Activity timeline" from={props.from} to={props.to}>
      <div className="emp360-timeline-filters">
        {FILTER_OPTIONS.map((opt) => (
          <button
            key={opt.value}
            type="button"
            className={`btn btn-sm${filter === opt.value ? " primary" : ""}`}
            onClick={() => setFilter(opt.value)}
          >
            {opt.label}
          </button>
        ))}
      </div>
      {visible.length === 0 ? (
        <div className="empty empty-sm">No activity in this range.</div>
      ) : (
        <div className="emp360-timeline">
          {visible.slice(0, 40).map((item) => (
            <div key={item.id} className="emp360-timeline-row">
              <span className="mono muted emp360-timeline-date">{item.date}</span>
              <span className="tag emp360-timeline-tag">{CATEGORY_LABELS[item.category]}</span>
              <span className="emp360-timeline-label">{item.label}</span>
              {item.detail && <span className="muted emp360-timeline-detail">{item.detail}</span>}
            </div>
          ))}
        </div>
      )}
    </Emp360SummaryCard>
  );
}
