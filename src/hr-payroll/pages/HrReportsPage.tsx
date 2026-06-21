import type { ComponentType } from "react";
import { Navigate, useParams } from "react-router-dom";
import { HrHubGrid } from "../components/ui/HrHubGrid";
import { HR_REPORTS } from "../lib/moduleStructure";
import HrEmployeeReportPage from "./reports/HrEmployeeReportPage";
import HrAttendanceReportPage from "./reports/HrAttendanceReportPage";
import HrLeaveReportPage from "./reports/HrLeaveReportPage";
import HrPayrollReportPage from "./reports/HrPayrollReportPage";
import HrSalaryRegisterReportPage from "./reports/HrSalaryRegisterReportPage";
import HrLateReportPage from "./reports/HrLateReportPage";
import HrMispunchReportPage from "./reports/HrMispunchReportPage";
import HrHolidayReportPage from "./reports/HrHolidayReportPage";
import HrAuditReportPage from "./reports/HrAuditReportPage";

export default function HrReportsHubPage() {
  return (
    <div className="grid" style={{ gap: 16 }}>
      <div className="card" style={{ background: "var(--wash)", borderColor: "var(--line)" }}>
        <div style={{ fontSize: 13.5, color: "var(--ink-soft)", lineHeight: 1.55 }}>
          Filtered HR reports with summary metrics, sortable tables, and CSV, Excel, PDF, and print export.
        </div>
      </div>
      <HrHubGrid
        cards={HR_REPORTS.map((r) => ({
          title: r.title,
          description: r.description,
          route: r.route,
          icon: "▦",
        }))}
      />
    </div>
  );
}

const REPORT_PAGES: Record<string, ComponentType> = {
  employee: HrEmployeeReportPage,
  attendance: HrAttendanceReportPage,
  leave: HrLeaveReportPage,
  payroll: HrPayrollReportPage,
  "salary-register": HrSalaryRegisterReportPage,
  late: HrLateReportPage,
  mispunch: HrMispunchReportPage,
  holiday: HrHolidayReportPage,
  audit: HrAuditReportPage,
};

export function HrReportPage() {
  const { reportId } = useParams<{ reportId: string }>();
  const def = HR_REPORTS.find((r) => r.id === reportId);

  if (!def || !reportId) return <Navigate to="/hr/reports" replace />;

  const Page = REPORT_PAGES[reportId];
  if (!Page) return <Navigate to="/hr/reports" replace />;

  return <Page />;
}
