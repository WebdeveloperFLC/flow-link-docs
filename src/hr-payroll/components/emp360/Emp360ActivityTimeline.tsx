import { useMemo, useState } from "react";
import { Emp360SummaryCard } from "./Emp360SummaryCard";
import type { AuditLogRow, EmployeeShiftHistoryRow } from "../../lib/types";

type ActivityCategory = "all" | "profile" | "shift";

type ActivityItem = {
  id: string;
  date: string;
  sortKey: string;
  category: Exclude<ActivityCategory, "all">;
  label: string;
  detail?: string;
};

type Props = {
  employeeName: string;
  employeeCode: string;
  shiftHistory: EmployeeShiftHistoryRow[];
  auditLogs: AuditLogRow[];
};

const CATEGORY_LABELS: Record<Exclude<ActivityCategory, "all">, string> = {
  profile: "Profile & records",
  shift: "Shift change",
};

const FILTER_OPTIONS: { value: ActivityCategory; label: string }[] = [
  { value: "all", label: "All" },
  { value: "profile", label: "Profile & records" },
  { value: "shift", label: "Shift changes" },
];

function auditMatchesEmployee(
  log: AuditLogRow,
  employeeName: string,
  employeeCode: string,
): boolean {
  const target = (log.target ?? "").toLowerCase();
  const name = employeeName.toLowerCase();
  const code = employeeCode.toLowerCase();
  return target.includes(name) || target.includes(code);
}

function buildActivities(props: Props): ActivityItem[] {
  const items: ActivityItem[] = [];

  for (const log of props.auditLogs) {
    if (!auditMatchesEmployee(log, props.employeeName, props.employeeCode)) continue;
    const date = log.created_at.slice(0, 10);
    items.push({
      id: `audit-${log.id}`,
      date,
      sortKey: log.created_at,
      category: "profile",
      label: log.action,
      detail: log.new_value
        ? `${log.prev_value ? `${log.prev_value} → ` : ""}${log.new_value}`
        : log.target ?? undefined,
    });
  }

  for (const s of props.shiftHistory) {
    const effective = s.effective_from;
    if (!effective) continue;
    items.push({
      id: `shift-${s.id}`,
      date: effective,
      sortKey: s.created_at ?? effective,
      category: "shift",
      label: `Shift assigned · ${s.shifts?.name ?? "—"}`,
      detail: s.change_reason ?? undefined,
    });
  }

  return items.sort((a, b) => b.sortKey.localeCompare(a.sortKey));
}

export function Emp360ActivityTimeline(props: Props) {
  const [filter, setFilter] = useState<ActivityCategory>("all");
  const all = useMemo(
    () => buildActivities(props),
    [props.auditLogs, props.shiftHistory, props.employeeName, props.employeeCode],
  );

  const visible = filter === "all" ? all : all.filter((a) => a.category === filter);

  return (
    <Emp360SummaryCard title="Activity timeline">
      <p className="muted emp360-timeline-hint">
        Profile updates, audit events, and shift changes — not repeated from summary cards above.
      </p>
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
        <div className="empty empty-sm">No profile or shift activity recorded yet.</div>
      ) : (
        <div className="emp360-timeline">
          {visible.slice(0, 50).map((item) => (
            <div key={item.id} className="emp360-timeline-row">
              <span className="mono muted emp360-timeline-date">{item.date}</span>
              <span className="tag emp360-timeline-tag">{CATEGORY_LABELS[item.category]}</span>
              <span className="emp360-timeline-label">{item.label}</span>
              {item.detail && (
                <span className="muted emp360-timeline-detail">{item.detail}</span>
              )}
            </div>
          ))}
        </div>
      )}
    </Emp360SummaryCard>
  );
}
