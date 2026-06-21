import { useMemo } from "react";
import { useHrAccess } from "../../context/HrPayrollProvider";
import { useHrLeaveRequests, useHrLeaveBalancesAll, useHrApprovals } from "../../hooks/useHrRequests";
import { useReportScope } from "../../hooks/useReportScope";
import { HrReportShell } from "../../components/reports/HrReportShell";
import { ReportFilterBar } from "../../components/reports/ReportFilterBar";
import { HrReportTable, reportExportRows, type HrReportColumn } from "../../components/reports/HrReportTable";
import { dateInRange } from "../../lib/reportFilters";
import { downloadReportTable, printReportTable } from "../../lib/hrReportExport";

type Row = {
  id: string;
  employee: string;
  leaveType: string;
  startDate: string;
  endDate: string;
  days: number;
  appliedOn: string;
  status: string;
  approvedBy: string;
  remainingBalance: string;
};

const COLUMNS: HrReportColumn<Row>[] = [
  { key: "employee", label: "Employee", sortable: true, exportValue: (r) => r.employee },
  { key: "leaveType", label: "Leave Type", sortable: true, exportValue: (r) => r.leaveType },
  { key: "startDate", label: "Start Date", sortable: true, exportValue: (r) => r.startDate },
  { key: "endDate", label: "End Date", sortable: true, exportValue: (r) => r.endDate },
  { key: "days", label: "Days", sortable: true, align: "right", exportValue: (r) => r.days },
  { key: "appliedOn", label: "Applied On", sortable: true, exportValue: (r) => r.appliedOn },
  { key: "status", label: "Status", sortable: true, exportValue: (r) => r.status },
  { key: "approvedBy", label: "Approved By", exportValue: (r) => r.approvedBy },
  { key: "remainingBalance", label: "Remaining Balance", exportValue: (r) => r.remainingBalance },
];

const EXPORT_HEADERS = COLUMNS.map((c) => c.label);

export default function HrLeaveReportPage() {
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

  const policyYear = useMemo(() => new Date(from).getFullYear(), [from]);
  const { data: leaveRequests = [], isLoading: leaveLoading } = useHrLeaveRequests();
  const { data: balances = [] } = useHrLeaveBalancesAll(policyYear);

  const scopedIds = useMemo(() => new Set(employeeIds), [employeeIds]);
  const filteredLeaveIds = useMemo(() => {
    return leaveRequests
      .filter((l) => scopedIds.has(l.employee_id))
      .filter((l) => l.from_date <= to && l.to_date >= from)
      .filter((l) => filters.recordStatus === "All" || l.status === filters.recordStatus)
      .map((l) => l.id);
  }, [leaveRequests, scopedIds, from, to, filters.recordStatus]);

  const { data: approvals = [] } = useHrApprovals("leave", filteredLeaveIds);

  const nameById = useMemo(() => {
    const m = new Map<string, string>();
    for (const e of employees) m.set(e.id, e.full_name);
    return m;
  }, [employees]);

  const balanceMap = useMemo(() => {
    const m = new Map<string, number>();
    for (const b of balances) {
      const key = `${b.employee_id}:${b.type}`;
      const remaining = (b.entitled ?? 0) + (b.accrued ?? 0) - (b.taken ?? 0);
      m.set(key, remaining);
    }
    return m;
  }, [balances]);

  const approverMap = useMemo(() => {
    const m = new Map<string, string>();
    for (const a of approvals) {
      if (a.decision === "Approved" && a.approver_id) {
        m.set(a.entity_id, nameById.get(a.approver_id) ?? a.approver_id.slice(0, 8));
      }
    }
    return m;
  }, [approvals, nameById]);

  const rows = useMemo<Row[]>(() => {
    return leaveRequests
      .filter((l) => scopedIds.has(l.employee_id))
      .filter((l) => l.from_date <= to && l.to_date >= from)
      .filter((l) => filters.recordStatus === "All" || l.status === filters.recordStatus)
      .map((l) => {
        const empLabel = l.employees
          ? `${l.employees.full_name} (${l.employees.emp_code})`
          : "—";
        const remaining = balanceMap.get(`${l.employee_id}:${l.type}`);
        const created = (l as { created_at?: string }).created_at;
        return {
          id: l.id,
          employee: empLabel,
          leaveType: l.type,
          startDate: l.from_date,
          endDate: l.to_date,
          days: l.days,
          appliedOn: created
            ? new Date(created).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })
            : l.from_date,
          status: l.status,
          approvedBy: approverMap.get(l.id) ?? (l.status === "Approved" ? "—" : ""),
          remainingBalance: remaining != null ? String(remaining) : "—",
        };
      });
  }, [leaveRequests, scopedIds, from, to, filters.recordStatus, balanceMap, approverMap]);

  const summary = useMemo(() => {
    let approved = 0;
    let rejected = 0;
    let pending = 0;
    let cancelled = 0;
    for (const r of rows) {
      if (r.status === "Approved") approved += 1;
      else if (r.status === "Rejected") rejected += 1;
      else if (r.status === "Pending") pending += 1;
      else if (r.status === "Cancelled") cancelled += 1;
    }
    return { total: rows.length, approved, rejected, pending, cancelled };
  }, [rows]);

  const canExport = can("export");
  const loading = scopeLoading || leaveLoading;
  const subtitle = `${from} to ${to}`;

  const exportReport = (fmt: "CSV" | "Excel") => {
    downloadReportTable(
      EXPORT_HEADERS,
      reportExportRows(COLUMNS, rows),
      `leave_report_${from}_${to}`,
      fmt,
    );
    fire(`${fmt} exported`);
  };

  const exportPdf = () => {
    printReportTable("Leave Report", subtitle, EXPORT_HEADERS, reportExportRows(COLUMNS, rows));
    fire("Print dialog opened");
  };

  return (
    <HrReportShell
      title="Leave Report"
      subtitle={subtitle}
      recordCount={rows.length}
      summaryCards={[
        { lab: "Total Requests", val: summary.total, tone: "blue" },
        { lab: "Approved", val: summary.approved, tone: "green" },
        { lab: "Rejected", val: summary.rejected, tone: "rose" },
        { lab: "Pending", val: summary.pending, tone: "orange" },
        { lab: "Cancelled", val: summary.cancelled, tone: "purple" },
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
