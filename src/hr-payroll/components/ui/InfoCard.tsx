import type { ReactNode } from "react";

type Row = [string, string | null | undefined | ReactNode];

export function InfoCard({
  title,
  rows,
  action,
  className,
}: {
  title: string;
  rows: Row[];
  action?: ReactNode;
  className?: string;
}) {
  return (
    <div className={`card${className ? ` ${className}` : ""}`}>
      <div className="card-h">
        <h3>{title}</h3>
        {action}
      </div>
      <div className="info-grid">
        {rows.map(([k, v]) => (
          <div key={k}>
            <div className="info-field-label">{k}</div>
            <div className="info-field-value">
              {v === null || v === undefined || (typeof v === "string" && !v.trim())
                ? "—"
                : v}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export function MetricPanel({
  title,
  rows,
  highlight,
}: {
  title: string;
  rows: [string, string | number][];
  highlight?: boolean;
}) {
  return (
    <div className={`card metric-panel${highlight ? " metric-panel-hl" : ""}`}>
      <div className="metric-panel-title">{title}</div>
      {rows.map(([k, v]) => (
        <div key={k} className="metric-row">
          <span className="muted">{k}</span>
          <span className="mono">{v}</span>
        </div>
      ))}
    </div>
  );
}

export function SectionCard({
  title,
  action,
  children,
}: {
  title: string;
  action?: ReactNode;
  children: ReactNode;
}) {
  return (
    <div className="card">
      <div className="card-h">
        <h3>{title}</h3>
        {action}
      </div>
      {children}
    </div>
  );
}
