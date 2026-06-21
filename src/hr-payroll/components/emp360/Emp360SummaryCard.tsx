import type { ReactNode } from "react";

type Props = {
  title: string;
  subtitle?: string;
  action?: ReactNode;
  children: ReactNode;
};

export function Emp360SummaryCard({ title, subtitle, action, children }: Props) {
  return (
    <div className="card emp360-summary-card">
      <div className="card-h emp360-summary-card-h">
        <div>
          <h3>{title}</h3>
          {subtitle && <p className="muted emp360-summary-subtitle">{subtitle}</p>}
        </div>
        {action}
      </div>
      <div className="emp360-summary-card-body">{children}</div>
    </div>
  );
}

export function Emp360MetricList({ rows }: { rows: [string, ReactNode][] }) {
  return (
    <dl className="emp360-metric-list">
      {rows.map(([label, value]) => (
        <div key={label} className="emp360-metric-line">
          <dt>{label}</dt>
          <dd>{value}</dd>
        </div>
      ))}
    </dl>
  );
}
