import { useMemo } from "react";
import { useHrAccess } from "../../context/HrPayrollProvider";
import { useHrMispunchRequests, useHrApprovals } from "../../hooks/useHrRequests";
import { useReportScope } from "../../hooks/useReportScope";
import { HrReportShell } from "../../components/reports/HrReportShell";
import { ReportFilterBar } from "../../components/reports/ReportFilterBar";
import { HrReportTable, reportExportRows, type HrReportColumn } from "../../components/reports/HrReportTable";
import { dateInRange } from "../../lib/reportFilters";
import { downloadReportTable, printReportTable } from "../../lib/hrReportExport";

type Row = {
  id: string;
  employee: string;
  date: string;
  issueType: string;
  comments: string;
  status: string;
  approvedBy: string;
};

const COLUMNS: HrReportColumn<Row>[] = [
  { key: "employee", label: "Employee", sortable: true, exportValue: (r) => r.employee },
  { key: "date", label: "Date", sortable: true, exportValue: (r) => r.date },
  { key: "issueType", label: "Issue Type", sortable: true, exportValue: (r) => r.issueType },
  { key: "comments", label: "Comments", exportValue: (r) => r.comments },
  { key: "status", label: "Status", sortable: true, exportValue: (r) => r.status },
  { key: "approvedBy", label: "Approved By", exportValue: (r) => r.approvedBy },
];

const EXPORT_HEADERS = COLUMNS.map((c) => c.label);

export default function HrMispunchReportPage() {
  const { can, fire } = useHrAccess();
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

  const { data: mispunchRows = [], isLoading: mispunchLoading } = useHrMispunchRequests();
  const scopedIds = useMemo(() => new Set(employeeIds), [employeeIds]);

  const filtered = useMemo(() =>
    mispunchRows
      .filter((m) => scopedIds.has(m.employee_id))
      .filter((m) => dateInRange(m.punch_date, from, to))
      .filter((m) => filters.recordStatus === "All" || m.status === filters.recordStatus),
  [mispunchRows, scopedIds, from, to, filters.recordStatus]);

  const { data: approvals = [] } = useHrApprovals("mispunch", filtered.map((m) => m.id));

  const empMap = useMemo(() => {
    const m = new Map<string, typeof employees[0]>();
    for (const e of employees) m.set(e.id, e);
    return m;
  }, [employees]);

  const nameById = useMemo(() => {
    const m = new Map<string, string>();
    for (const e of employees) m.set(e.id, e.full_name);
    return m;
  }, [employees]);

  const approverMap = useMemo(() => {
    const m = new Map<string, string>();
    for (const a of approvals) {
      if (a.decision === "Approved" && a.approver_id) {
        m.set(a.entity_id, nameById.get(a.approver_id) ?? a.approver_id.slice(0, 8));
      }
    }
    return m;
  }, [approvals, nameById]);

  const rows = useMemo<Row[]>(() =>
    filtered.map((m) => {
      const emp = empMap.get(m.employee_id);
      const empLabel = m.employees?.full_name ?? emp?.full_name ?? "—";
      return {
        id: m.id,
        employee: emp ? `${empLabel} (${emp.emp_code})` : empLabel,
        date: m.punch_date,
        issueType: m.issue,
        comments: m.evidence ?? "—",
        status: m.status,
        approvedBy: approverMap.get(m.id) ?? (m.status === "Approved" ? "—" : ""),
      };
    }),
  [filtered, empMap, approverMap]);

  const summary = useMemo(() => {
    let approved = 0;
    let pending = 0;
    let rejected = 0;
    for (const r of rows) {
      if (r.status === "Approved") approved += 1;
      else if (r.status === "Pending") pending += 1;
      else if (r.status === "Rejected") rejected += 1;
    }
    return { total: rows.length, approved, pending, rejected };
  }, [rows]);

  const canExport = can("export");
  const loading = scopeLoading || mispunchLoading;
  const subtitle = `${from} to ${to}`;

  const exportReport = (fmt: "CSV" | "Excel") => {
    downloadReportTable(
      EXPORT_HEADERS,
      reportExportRows(COLUMNS, rows),
      `mispunch_report_${from}_${to}`,
      fmt,
    );
    fire(`${fmt} exported`);
  };

  const exportPdf = () => {
    printReportTable("Mispunch Report", subtitle, EXPORT_HEADERS, reportExportRows(COLUMNS, rows));
    fire("Print dialog opened");
  };

  return (
    <HrReportShell
      title="Mispunch Report"
      subtitle={subtitle}
      recordCount={rows.length}
      summaryCards={[
        { lab: "Total Requests", val: summary.total, tone: "blue" },
        { lab: "Approved", val: summary.approved, tone: "green" },
        { lab: "Pending", val: summary.pending, tone: "orange" },
        { lab: "Rejected", val: summary.rejected, tone: "rose" },
      ]}
      loading={loading}
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
          options={filterOptions}
          employmentTypes={employmentTypes}
          categoryOptions={categoryOptions}
          employeeOptions={employeeOptions}
          showEmployee
          showRecordStatus
          refLoading={refLoading}
        />
      }
    >
      <HrReportTable columns={COLUMNS} rows={rows} rowKey={(r) => r.id} />
    </HrReportShell>
  );
}
