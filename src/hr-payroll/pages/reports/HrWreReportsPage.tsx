import { useMemo } from "react";
import { useHrAccess } from "../../context/HrPayrollProvider";
import { useReportScope } from "../../hooks/useReportScope";
import { useWreSnapshots } from "../../hooks/useWre";
import { HrReportShell } from "../../components/reports/HrReportShell";
import { ReportFilterBar } from "../../components/reports/ReportFilterBar";
import { HrReportTable, reportExportRows, type HrReportColumn } from "../../components/reports/HrReportTable";
import { dateInRange } from "../../lib/reportFilters";
import { downloadReportTable, printReportTable } from "../../lib/hrReportExport";
import { fmtDur } from "../../lib/attendanceMetrics";
import { WTM_PAYROLL_STATUS_LABEL, type WtmSnapshotRow } from "../../lib/wreTypes";

type Row = {
  id: string;
  employee: string;
  branch: string;
  date: string;
  payrollStatus: string;
  lateMinutes: number;
  monthlyLate: number;
  remainingGrace: number;
  earlyExit: number;
  overtime: number;
  workingHours: string;
};

const COLUMNS: HrReportColumn<Row>[] = [
  { key: "employee", label: "Employee", sortable: true, exportValue: (r) => r.employee },
  { key: "branch", label: "Branch", sortable: true, exportValue: (r) => r.branch },
  { key: "date", label: "Date", sortable: true, exportValue: (r) => r.date },
  { key: "payrollStatus", label: "Payroll Status", sortable: true, exportValue: (r) => r.payrollStatus },
  { key: "lateMinutes", label: "Late (min)", sortable: true, align: "right", exportValue: (r) => r.lateMinutes },
  { key: "monthlyLate", label: "Monthly Late", sortable: true, align: "right", exportValue: (r) => r.monthlyLate },
  { key: "remainingGrace", label: "Grace Left", sortable: true, align: "right", exportValue: (r) => r.remainingGrace },
  { key: "earlyExit", label: "Early Exit", sortable: true, align: "right", exportValue: (r) => r.earlyExit },
  { key: "overtime", label: "OT (min)", sortable: true, align: "right", exportValue: (r) => r.overtime },
  { key: "workingHours", label: "Working", sortable: true, exportValue: (r) => r.workingHours },
];

const EXPORT_HEADERS = COLUMNS.map((c) => c.label);

function latestSnapshotsPerDay(rows: WtmSnapshotRow[]) {
  const m = new Map<string, WtmSnapshotRow>();
  for (const r of rows) {
    const key = `${r.employee_id}:${r.work_date}`;
    const prev = m.get(key);
    if (!prev || r.version > prev.version) m.set(key, r);
  }
  return [...m.values()];
}

export default function HrWreReportsPage() {
  const { fire } = useHrAccess();
  const scope = useReportScope();
  const {
    from,
    to,
    filters,
    setFilters,
    setFrom,
    setTo,
    cycleLabel,
    employeeIds,
    employees,
    filterOptions,
    categoryOptions,
    employeeOptions,
    employmentTypes,
    loading: scopeLoading,
    refLoading,
  } = scope;

  const { data: snapshots = [], isLoading } = useWreSnapshots({ from, to, limit: 5000 });
  const scopedIds = useMemo(() => new Set(employeeIds), [employeeIds]);

  const empMap = useMemo(() => {
    const m = new Map<string, typeof employees[0]>();
    for (const e of employees) m.set(e.id, e);
    return m;
  }, [employees]);

  const rows: Row[] = useMemo(() => {
    return latestSnapshotsPerDay(snapshots)
      .filter((s) => scopedIds.has(s.employee_id))
      .filter((s) => dateInRange(s.work_date, from, to))
      .map((s) => {
        const e = empMap.get(s.employee_id);
        return {
          id: s.id,
          employee: e?.full_name ?? s.employee_id.slice(0, 8),
          branch: e?.branches?.name ?? "—",
          date: s.work_date,
          payrollStatus: WTM_PAYROLL_STATUS_LABEL[s.payroll_status],
          lateMinutes: s.late_minutes,
          monthlyLate: s.monthly_late_minutes,
          remainingGrace: s.remaining_grace_minutes,
          earlyExit: s.early_exit_minutes,
          overtime: s.overtime_minutes,
          workingHours: fmtDur(s.working_duration_min),
        };
      });
  }, [snapshots, scopedIds, from, to, empMap]);

  const summary = useMemo(() => {
    const graceUsed = rows.reduce((a, r) => a + r.lateMinutes, 0);
    const otTotal = rows.reduce((a, r) => a + r.overtime, 0);
    const earlyTotal = rows.filter((r) => r.earlyExit > 0).length;
    const byStatus = new Map<string, number>();
    for (const r of rows) byStatus.set(r.payrollStatus, (byStatus.get(r.payrollStatus) ?? 0) + 1);
    return { graceUsed, otTotal, earlyTotal, byStatus: [...byStatus.entries()] };
  }, [rows]);

  const exportRows = reportExportRows(rows, COLUMNS);

  return (
    <HrReportShell
      title="WTM Rules Reports"
      subtitle="Monthly late minutes, grace utilization, attendance results, working hours, early exit, and overtime — calculated by WRE (no payroll deductions)."
      cycleLabel={cycleLabel}
      loading={scopeLoading || refLoading || isLoading}
      summary={(
        <div className="row-flex" style={{ flexWrap: "wrap", gap: 16 }}>
          <div><span className="muted">Records</span> <strong>{rows.length}</strong></div>
          <div><span className="muted">Late minutes (sum)</span> <strong>{summary.graceUsed}</strong></div>
          <div><span className="muted">Early exit days</span> <strong>{summary.earlyTotal}</strong></div>
          <div><span className="muted">OT minutes</span> <strong>{summary.otTotal}</strong></div>
        </div>
      )}
      filters={(
        <ReportFilterBar
          from={from}
          to={to}
          setFrom={setFrom}
          setTo={setTo}
          filters={filters}
          setFilters={setFilters}
          filterOptions={filterOptions}
          categoryOptions={categoryOptions}
          employeeOptions={employeeOptions}
          employmentTypes={employmentTypes}
        />
      )}
      onExportCsv={() => downloadReportTable("wtm-wre-report", EXPORT_HEADERS, exportRows, fire)}
      onExportExcel={() => downloadReportTable("wtm-wre-report", EXPORT_HEADERS, exportRows, fire, "xlsx")}
      onExportPdf={() => printReportTable("WTM Rules Report", EXPORT_HEADERS, exportRows)}
      onPrint={() => printReportTable("WTM Rules Report", EXPORT_HEADERS, exportRows)}
    >
      <HrReportTable columns={COLUMNS} rows={rows} emptyLabel="No WRE snapshots in range." />
    </HrReportShell>
  );
}
