import { useMemo } from "react";
import { Link } from "react-router-dom";
import { useHrEmployees } from "../../hooks/useHrEmployees";
import { useWreDashboardStats } from "../../hooks/useWre";
import { WTM_PAYROLL_STATUS_LABEL } from "../../lib/wreTypes";

function monthBounds(d = new Date()) {
  const start = new Date(d.getFullYear(), d.getMonth(), 1);
  const end = new Date(d.getFullYear(), d.getMonth() + 1, 0);
  const fmt = (x: Date) => x.toISOString().slice(0, 10);
  return { start: fmt(start), end: fmt(end) };
}

export function WreHrDashboardWidgets() {
  const { start, end } = useMemo(() => monthBounds(), []);
  const { data: stats, isLoading } = useWreDashboardStats(start, end);
  const { data: employees = [] } = useHrEmployees();

  const widgets = [
    { label: "Near grace limit", value: stats?.nearGraceLimit ?? 0, hint: "≤5 min remaining" },
    { label: "Exceeding grace", value: stats?.exceedingGrace ?? 0, hint: "No grace left" },
    { label: "Frequent late (60m+)", value: stats?.frequentLate ?? 0, hint: "This month" },
    { label: "Frequent early exit", value: stats?.frequentEarlyExit ?? 0, hint: "3+ days" },
  ];

  return (
    <div className="card">
      <div className="row-flex" style={{ justifyContent: "space-between", marginBottom: 12 }}>
        <div>
          <div className="strong">Workforce Rules</div>
          <div className="muted" style={{ fontSize: 13 }}>
            Policy-driven attendance evaluation · {employees.length} employees
          </div>
        </div>
        <Link to="/hr/reports/wre" className="btn btn-sm">
          WTM reports →
        </Link>
      </div>

      <div className="grid" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))", gap: 12 }}>
        {widgets.map((w) => (
          <div key={w.label} className="stat-card">
            <div className="muted" style={{ fontSize: 12 }}>{w.label}</div>
            <div className="strong" style={{ fontSize: 22 }}>{isLoading ? "…" : w.value}</div>
            <div className="muted" style={{ fontSize: 11 }}>{w.hint}</div>
          </div>
        ))}
      </div>

      {stats?.evalSummary?.length ? (
        <div style={{ marginTop: 16 }}>
          <div className="muted" style={{ fontSize: 12, marginBottom: 8 }}>Attendance evaluation summary (this month)</div>
          <div className="row-flex" style={{ flexWrap: "wrap", gap: 8 }}>
            {stats.evalSummary.map((s) => (
              <span key={s.payroll_status} className="badge">
                {WTM_PAYROLL_STATUS_LABEL[s.payroll_status]} · {s.count}
              </span>
            ))}
          </div>
        </div>
      ) : null}
    </div>
  );
}
