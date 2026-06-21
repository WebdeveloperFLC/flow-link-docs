import type { ReactNode } from "react";
import { Link } from "react-router-dom";
import { Stat } from "../ui/Stat";

type SummaryCard = {
  lab: string;
  val: string | number;
  tone?: "blue" | "green" | "pink" | "cyan" | "orange" | "purple" | "gold" | "rose" | "indigo";
};

type Props = {
  title: string;
  subtitle?: string;
  recordCount: number;
  summaryCards?: SummaryCard[];
  loading?: boolean;
  loadingMessage?: string;
  canExport?: boolean;
  onExportCsv?: () => void;
  onExportExcel?: () => void;
  onExportPdf?: () => void;
  backHref?: string;
  backLabel?: string;
  extraActions?: ReactNode;
  filterBar?: ReactNode;
  children: ReactNode;
};

export function HrReportShell({
  title,
  subtitle,
  recordCount,
  summaryCards,
  loading,
  loadingMessage = "Loading report…",
  canExport,
  onExportCsv,
  onExportExcel,
  onExportPdf,
  backHref = "/hr/reports",
  backLabel = "← All reports",
  extraActions,
  filterBar,
  children,
}: Props) {
  return (
    <div className="page-grid">
      <div className="card card-wash">
        <div className="row-flex" style={{ justifyContent: "space-between", gap: 12 }}>
          <div>
            <div style={{ fontSize: 15, fontWeight: 600, color: "var(--ink)" }}>{title}</div>
            {subtitle && (
              <div style={{ fontSize: 13, color: "var(--ink-soft)", marginTop: 4 }}>{subtitle}</div>
            )}
          </div>
          <Link to={backHref} className="btn btn-sm">{backLabel}</Link>
        </div>
      </div>

      {filterBar}

      {summaryCards && summaryCards.length > 0 && (
        <div className="stat-grid" style={{ gridTemplateColumns: "repeat(auto-fill, minmax(140px, 1fr))" }}>
          {summaryCards.map((c) => (
            <Stat key={c.lab} lab={c.lab} val={c.val} variant="metric" tone={c.tone ?? "blue"} />
          ))}
        </div>
      )}

      <div className="card" style={{ padding: 0 }}>
        <div className="card-h" style={{ padding: "14px 16px" }}>
          <div>
            <h3 style={{ fontSize: 15, marginBottom: 2 }}>Report data</h3>
            <p className="muted" style={{ fontSize: 12, margin: 0 }}>
              {recordCount} records
            </p>
          </div>
          <div className="row-flex" style={{ gap: 8 }}>
            {extraActions}
            {canExport && (
              <>
                <button type="button" className="btn btn-sm" onClick={onExportCsv}>
                  CSV
                </button>
                <button type="button" className="btn btn-sm" onClick={onExportExcel}>
                  Excel
                </button>
                <button type="button" className="btn btn-sm" onClick={onExportPdf}>
                  PDF / Print
                </button>
              </>
            )}
          </div>
        </div>

        {loading ? (
          <div className="empty">{loadingMessage}</div>
        ) : (
          children
        )}
      </div>
    </div>
  );
}
