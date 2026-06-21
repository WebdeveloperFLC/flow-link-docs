import { useMemo } from "react";
import { useHrAccess } from "../../context/HrPayrollProvider";
import { useHrLateExemptions, useHrApprovals } from "../../hooks/useHrRequests";
import { useReportScope } from "../../hooks/useReportScope";
import { HrReportShell } from "../../components/reports/HrReportShell";
import { ReportFilterBar } from "../../components/reports/ReportFilterBar";
import { HrReportTable, reportExportRows, type HrReportColumn } from "../../components/reports/HrReportTable";
import { dateInRange } from "../../lib/reportFilters";
import { downloadReportTable, printReportTable } from "../../lib/hrReportExport";

type Row = {
  id: string;
  employee: string;
  branch: string;
  department: string;
  date: string;
  delayMinutes: number;
  exemptionStatus: string;
  approvedBy: string;
};

const COLUMNS: HrReportColumn<Row>[] = [
  { key: "employee", label: "Employee", sortable: true, exportValue: (r) => r.employee },
  { key: "branch", label: "Branch", sortable: true, exportValue: (r) => r.branch },
  { key: "department", label: "Department", sortable: true, exportValue: (r) => r.department },
  { key: "date", label: "Date", sortable: true, exportValue: (r) => r.date },
  { key: "delayMinutes", label: "Delay Minutes", sortable: true, align: "right", exportValue: (r) => r.delayMinutes },
  { key: "exemptionStatus", label: "Exemption Status", sortable: true, exportValue: (r) => r.exemptionStatus },
  { key: "approvedBy", label: "Approved By", exportValue: (r) => r.approvedBy },
];

const EXPORT_HEADERS = COLUMNS.map((c) => c.label);

export default function HrLateReportPage() {
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

  const { data: lateRows = [], isLoading: lateLoading } = useHrLateExemptions();
  const scopedIds = useMemo(() => new Set(employeeIds), [employeeIds]);

  const filteredLate = useMemo(() =>
    lateRows
      .filter((l) => scopedIds.has(l.employee_id))
      .filter((l) => dateInRange(l.late_date, from, to))
      .filter((l) => filters.recordStatus === "All" || l.status === filters.recordStatus),
  [lateRows, scopedIds, from, to, filters.recordStatus]);

  const { data: approvals = [] } = useHrApprovals("late", filteredLate.map((l) => l.id));

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
    filteredLate.map((l) => {
      const emp = empMap.get(l.employee_id);
      const empLabel = l.employees?.full_name
        ? l.employees.full_name
        : emp?.full_name ?? "—";
      return {
        id: l.id,
        employee: emp ? `${empLabel} (${emp.emp_code})` : empLabel,
        branch: emp?.branches?.name ?? "—",
        department: emp?.departments?.name ?? emp?.department ?? "—",
        date: l.late_date,
        delayMinutes: l.delay_min,
        exemptionStatus: l.status,
        approvedBy: approverMap.get(l.id) ?? (l.status === "Approved" ? "—" : ""),
      };
    }),
  [filteredLate, empMap, approverMap]);

  const summary = useMemo(() => {
    let approved = 0;
    let pending = 0;
    let rejected = 0;
    for (const r of rows) {
      if (r.exemptionStatus === "Approved") approved += 1;
      else if (r.exemptionStatus === "Pending") pending += 1;
      else if (r.exemptionStatus === "Rejected") rejected += 1;
    }
    return { total: rows.length, approved, pending, rejected };
  }, [rows]);

  const canExport = can("export");
  const loading = scopeLoading || lateLoading;
  const subtitle = `${from} to ${to}`;

  const exportReport = (fmt: "CSV" | "Excel") => {
    downloadReportTable(
      EXPORT_HEADERS,
      reportExportRows(COLUMNS, rows),
      `late_report_${from}_${to}`,
      fmt,
    );
    fire(`${fmt} exported`);
  };

  const exportPdf = () => {
    printReportTable("Late Coming Report", subtitle, EXPORT_HEADERS, reportExportRows(COLUMNS, rows));
    fire("Print dialog opened");
  };

  return (
    <HrReportShell
      title="Late Coming Report"
      subtitle={subtitle}
      recordCount={rows.length}
      summaryCards={[
        { lab: "Total Late Entries", val: summary.total, tone: "blue" },
        { lab: "Approved Exemptions", val: summary.approved, tone: "green" },
        { lab: "Pending Exemptions", val: summary.pending, tone: "orange" },
        { lab: "Rejected Exemptions", val: summary.rejected, tone: "rose" },
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
