import { useMemo } from "react";
import { useHrAccess } from "../../context/HrPayrollProvider";
import { useHrAuditLogs } from "../../hooks/useHrRequests";
import { useHrReportFilters } from "../../hooks/useHrReportFilters";
import { HrReportShell } from "../../components/reports/HrReportShell";
import { ReportFilterBar } from "../../components/reports/ReportFilterBar";
import { HrReportTable, reportExportRows, type HrReportColumn } from "../../components/reports/HrReportTable";
import {
  auditModuleFromAction,
  dateInRange,
  type HrReportFilters,
} from "../../lib/reportFilters";
import { defaultEmp360Filters } from "../../lib/emp360Filters";
import { downloadReportTable, printReportTable } from "../../lib/hrReportExport";
import type { AuditLogRow } from "../../lib/types";

type Row = {
  id: string;
  dateTime: string;
  user: string;
  action: string;
  module: string;
  record: string;
  previousValue: string;
  newValue: string;
  createdAt: string;
};

const COLUMNS: HrReportColumn<Row>[] = [
  { key: "dateTime", label: "Date & Time", sortable: true, sortValue: (r) => r.createdAt, exportValue: (r) => r.dateTime },
  { key: "user", label: "User", sortable: true, exportValue: (r) => r.user },
  { key: "action", label: "Action", sortable: true, exportValue: (r) => r.action },
  { key: "module", label: "Module", sortable: true, exportValue: (r) => r.module },
  { key: "record", label: "Record", exportValue: (r) => r.record },
  { key: "previousValue", label: "Previous Value", exportValue: (r) => r.previousValue },
  { key: "newValue", label: "New Value", exportValue: (r) => r.newValue },
];

const EXPORT_HEADERS = COLUMNS.map((c) => c.label);

export default function HrAuditReportPage() {
  const { can, fire } = useHrAccess();
  const {
    from,
    to,
    extra,
    setFrom,
    setTo,
    setExtraFilters,
    cycleLabel,
  } = useHrReportFilters();

  const filters: HrReportFilters = {
    ...defaultEmp360Filters(),
    ...extra,
  };

  const setFilters = (patch: Partial<HrReportFilters>) => {
    const extraPatch: Partial<typeof extra> = {};
    for (const [key, value] of Object.entries(patch)) {
      if (key in extra) extraPatch[key as keyof typeof extra] = value as string;
    }
    if (Object.keys(extraPatch).length) setExtraFilters(extraPatch);
  };

  const { data: logs = [], isLoading } = useHrAuditLogs();

  const auditUsers = useMemo(() => {
    const set = new Set<string>();
    for (const l of logs as AuditLogRow[]) {
      if (l.actor_label) set.add(l.actor_label);
    }
    return [...set].sort();
  }, [logs]);

  const auditModules = useMemo(() => {
    const set = new Set<string>();
    for (const l of logs as AuditLogRow[]) {
      set.add(auditModuleFromAction(l.action));
    }
    return [...set].sort();
  }, [logs]);

  const rows = useMemo<Row[]>(() => {
    return (logs as AuditLogRow[])
      .filter((l) => dateInRange(l.created_at.slice(0, 10), from, to))
      .filter((l) => filters.auditUser === "All" || l.actor_label === filters.auditUser)
      .filter((l) => filters.auditModule === "All" || auditModuleFromAction(l.action) === filters.auditModule)
      .filter((l) => {
        const q = filters.search.trim().toLowerCase();
        if (!q) return true;
        return (
          l.action.toLowerCase().includes(q) ||
          (l.target ?? "").toLowerCase().includes(q) ||
          (l.actor_label ?? "").toLowerCase().includes(q)
        );
      })
      .map((l) => ({
        id: l.id,
        createdAt: l.created_at,
        dateTime: new Date(l.created_at).toLocaleString("en-IN", {
          day: "2-digit",
          month: "short",
          year: "numeric",
          hour: "2-digit",
          minute: "2-digit",
        }),
        user: l.actor_label ?? "—",
        action: l.action,
        module: auditModuleFromAction(l.action),
        record: l.target ?? "—",
        previousValue: l.prev_value ?? "—",
        newValue: l.new_value ?? "—",
      }));
  }, [logs, from, to, filters]);

  const summary = useMemo(() => {
    let employee = 0;
    let payroll = 0;
    let attendance = 0;
    let leave = 0;
    for (const r of rows) {
      if (r.module === "Employee") employee += 1;
      if (r.module === "Payroll") payroll += 1;
      if (r.module === "Attendance") attendance += 1;
      if (r.module === "Leave") leave += 1;
    }
    return { total: rows.length, employee, payroll, attendance, leave };
  }, [rows]);

  const canExport = can("export");
  const subtitle = `${from} to ${to}`;

  const exportReport = (fmt: "CSV" | "Excel") => {
    downloadReportTable(
      EXPORT_HEADERS,
      reportExportRows(COLUMNS, rows),
      `audit_report_${from}_${to}`,
      fmt,
    );
    fire(`${fmt} exported`);
  };

  const exportPdf = () => {
    printReportTable("Audit Report", subtitle, EXPORT_HEADERS, reportExportRows(COLUMNS, rows));
    fire("Print dialog opened");
  };

  return (
    <HrReportShell
      title="Audit Report"
      subtitle={subtitle}
      recordCount={rows.length}
      summaryCards={[
        { lab: "Total Activities", val: summary.total, tone: "blue" },
        { lab: "Employee Activities", val: summary.employee, tone: "cyan" },
        { lab: "Payroll Activities", val: summary.payroll, tone: "green" },
        { lab: "Attendance Activities", val: summary.attendance, tone: "orange" },
        { lab: "Leave Activities", val: summary.leave, tone: "purple" },
      ]}
      loading={isLoading}
      canExport={canExport}
      onExportCsv={() => exportReport("CSV")}
      onExportExcel={() => exportReport("Excel")}
      onExportPdf={exportPdf}
      filterBar={
        <ReportFilterBar
          from={from}
          to={to}
          onFromChange={setFrom}
          onToChange={setTo}
          cycleLabel={cycleLabel}
          filters={filters}
          onChange={setFilters}
          options={{ branches: [], companies: [], departments: [], designations: [] }}
          employmentTypes={[]}
          auditUsers={auditUsers}
          auditModules={auditModules}
          showAuditFilters
          showOrgFilters={false}
          showCategory={false}
        />
      }
    >
      <HrReportTable columns={COLUMNS} rows={rows} rowKey={(r) => r.id} />
    </HrReportShell>
  );
}
