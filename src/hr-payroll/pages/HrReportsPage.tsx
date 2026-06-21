import { Link, Navigate, useParams } from "react-router-dom";
import { HrHubGrid } from "../components/ui/HrHubGrid";
import { HR_REPORTS } from "../lib/moduleStructure";
import { useHrAccess } from "../context/HrPayrollProvider";
import HrAttendanceReportPage from "./reports/HrAttendanceReportPage";

export default function HrReportsHubPage() {
  const { can } = useHrAccess();

  return (
    <div className="grid" style={{ gap: 16 }}>
      <div className="card" style={{ background: "var(--wash)", borderColor: "var(--line)" }}>
        <div style={{ fontSize: 13.5, color: "var(--ink-soft)", lineHeight: 1.55 }}>
          Dedicated reports with filters and export to Excel, PDF, and print. Salary register is
          fully wired; other reports roll out incrementally.
        </div>
      </div>
      <HrHubGrid
        cards={HR_REPORTS.map((r) => ({
          title: r.title,
          description: r.description,
          route: r.route,
          icon: "▦",
          disabled:
            r.id !== "salary-register" &&
            r.id !== "attendance" &&
            !can("export"),
        }))}
      />
    </div>
  );
}

export function HrReportPage() {
  const { reportId } = useParams<{ reportId: string }>();
  const { can, cycle } = useHrAccess();
  const def = HR_REPORTS.find((r) => r.id === reportId);

  if (!def) return <Navigate to="/hr/reports" replace />;

  if (reportId === "attendance") {
    return <HrAttendanceReportPage />;
  }

  if (reportId === "salary-register") {
    return (
      <div className="grid" style={{ gap: 16 }}>
        <div className="card">
          <div className="card-h">
            <h3>Salary Register Report</h3>
            <Link to="/hr/payroll/register" className="btn btn-primary btn-sm">
              Open register →
            </Link>
          </div>
          <p className="muted" style={{ fontSize: 13 }}>
            Full salary register with CSV, Excel, and PDF export is available on the Salary Register
            screen for cycle <strong>{cycle?.label ?? "—"}</strong>.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="card">
      <div className="card-h">
        <h3>{def.title}</h3>
        <Link to="/hr/reports" className="btn btn-sm">
          ← All reports
        </Link>
      </div>
      <div className="empty">
        <div className="ico">▦</div>
        <div style={{ fontSize: 15, fontWeight: 600, color: "var(--ink)", marginBottom: 6 }}>
          {def.title}
        </div>
        <div style={{ fontSize: 13, maxWidth: 420, margin: "0 auto" }}>
          {can("export")
            ? `${def.description} — filters and Excel/PDF/Print export coming in the next build phase.`
            : "Export permission required to run this report."}
        </div>
      </div>
    </div>
  );
}
