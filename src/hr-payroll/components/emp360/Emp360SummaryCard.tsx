import type { ReactNode } from "react";
import { Emp360CardDateStrip } from "./Emp360CardDateStrip";

type Props = {
  title: string;
  from?: string;
  to?: string;
  action?: ReactNode;
  children: ReactNode;
};

export function Emp360SummaryCard({ title, from, to, action, children }: Props) {
  const showDates = from && to;
  return (
    <div className="card emp360-summary-card">
      <div className="card-h emp360-summary-card-h">
        <div className="emp360-summary-card-title-wrap">
          <h3>{title}</h3>
          {showDates && <Emp360CardDateStrip from={from} to={to} />}
        </div>
        {action}
      </div>
      <div className="emp360-summary-card-body">{children}</div>
    </div>
  );
}

export function Emp360StatRow({ children }: { children: ReactNode }) {
  return <div className="emp360-stat-row">{children}</div>;
}
