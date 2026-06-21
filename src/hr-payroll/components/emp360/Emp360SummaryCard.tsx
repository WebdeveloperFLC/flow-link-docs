import type { ReactNode } from "react";

type Props = {
  title: string;
  action?: ReactNode;
  children: ReactNode;
};

export function Emp360SummaryCard({ title, action, children }: Props) {
  return (
    <div className="card emp360-summary-card">
      <div className="card-h emp360-summary-card-h">
        <h3>{title}</h3>
        {action}
      </div>
      <div className="emp360-summary-card-body">{children}</div>
    </div>
  );
}

export function Emp360MetricGrid({ rows }: { rows: [string, ReactNode][] }) {
  return (
    <div className="emp360-metric-grid">
      {rows.map(([label, value]) => (
        <div key={label} className="emp360-metric">
          <span className="emp360-metric-label">{label}</span>
          <span className="emp360-metric-value">{value}</span>
        </div>
      ))}
    </div>
  );
}
