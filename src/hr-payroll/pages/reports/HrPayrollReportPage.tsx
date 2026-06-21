import { useMemo } from "react";
import { useHrAccess } from "../../context/HrPayrollProvider";
import { useHrCycles, useHrPayrollLinesMulti } from "../../hooks/useHrPayroll";
import { useReportScope } from "../../hooks/useReportScope";
import { HrReportShell } from "../../components/reports/HrReportShell";
import { ReportFilterBar } from "../../components/reports/ReportFilterBar";
import { HrReportTable, reportExportRows, type HrReportColumn } from "../../components/reports/HrReportTable";
import { dateInRange } from "../../lib/reportFilters";
import { employeeCurrency, formatMoney } from "../../lib/format";
import { downloadReportTable, printReportTable } from "../../lib/hrReportExport";
import type { PayrollCycleRow } from "../../lib/types";

type Row = {
  id: string;
  employee: string;
  cycleLabel: string;
  payableDays: number;
  grossSalary: number;
  incentives: number;
  bonus: number;
  deductions: number;
  netSalary: number;
  currency: string;
  status: string;
  grossDisplay: string;
  netDisplay: string;
  deductionsDisplay: string;
};

const COLUMNS: HrReportColumn<Row>[] = [
  { key: "employee", label: "Employee", sortable: true, exportValue: (r) => r.employee },
  { key: "cycleLabel", label: "Payroll Cycle", sortable: true, exportValue: (r) => r.cycleLabel },
  { key: "payableDays", label: "Payable Days", sortable: true, align: "right", exportValue: (r) => r.payableDays },
  { key: "grossDisplay", label: "Gross Salary", sortable: true, align: "right", sortValue: (r) => r.grossSalary, exportValue: (r) => r.grossDisplay },
  { key: "incentives", label: "Incentives", sortable: true, align: "right", exportValue: (r) => r.incentives },
  { key: "bonus", label: "Bonus", sortable: true, align: "right", exportValue: (r) => r.bonus },
  { key: "deductionsDisplay", label: "Deductions", sortable: true, align: "right", sortValue: (r) => r.deductions, exportValue: (r) => r.deductionsDisplay },
  { key: "netDisplay", label: "Net Salary", sortable: true, align: "right", sortValue: (r) => r.netSalary, exportValue: (r) => r.netDisplay },
  { key: "currency", label: "Currency", sortable: true, exportValue: (r) => r.currency },
  { key: "status", label: "Status", sortable: true, exportValue: (r) => r.status },
];

const EXPORT_HEADERS = COLUMNS.map((c) => c.label);

function cyclesInRange(cycles: PayrollCycleRow[], from: string, to: string) {
  return cycles.filter(
    (c) => dateInRange(c.start_date, from, to) || dateInRange(c.end_date, from, to) ||
      (c.start_date <= from && c.end_date >= to),
  );
}

export default function HrPayrollReportPage() {
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
    filterOptions,
    categoryOptions,
    employeeOptions,
    employmentTypes,
    loading: scopeLoading,
    refLoading,
  } = scope;

  const { data: cycles = [], isLoading: cyclesLoading } = useHrCycles();
  const cyclesInDateRange = useMemo(
    () => cyclesInRange(cycles, from, to),
    [cycles, from, to],
  );

  const cycleOptions = useMemo(
    () => cyclesInDateRange.map((c) => ({ id: c.id, label: c.label })),
    [cyclesInDateRange],
  );

  const selectedCycleIds = useMemo(() => {
    if (filters.cycleId !== "All") return [filters.cycleId];
    return cyclesInDateRange.map((c) => c.id);
  }, [filters.cycleId, cyclesInDateRange]);

  const { data: lines = [], isLoading: linesLoading } = useHrPayrollLinesMulti(selectedCycleIds);

  const cycleMap = useMemo(() => {
    const m = new Map<string, PayrollCycleRow>();
    for (const c of cycles) m.set(c.id, c);
    return m;
  }, [cycles]);

  const scopedIds = useMemo(() => new Set(employeeIds), [employeeIds]);

  const rows = useMemo<Row[]>(() => {
    return lines
      .filter((l) => scopedIds.has(l.employee_id))
      .map((l) => {
        const emp = l.employees;
        const cycle = cycleMap.get(l.cycle_id);
        const currency = employeeCurrency(emp);
        const deductions =
          l.late_deduction + l.mispunch_deduction + l.pf_employee + l.esic_employee + (l.pt_employee ?? 0);
        const empLabel = emp ? `${emp.full_name} (${emp.emp_code})` : "—";
        return {
          id: l.id,
          employee: empLabel,
          cycleLabel: cycle?.label ?? "—",
          payableDays: l.payable_days,
          grossSalary: l.gross_earned,
          incentives: l.incentive,
          bonus: l.bonus,
          deductions,
          netSalary: l.net_salary,
          currency,
          status: cycle?.status ?? "—",
          grossDisplay: formatMoney(l.gross_earned, currency),
          netDisplay: formatMoney(l.net_salary, currency),
          deductionsDisplay: formatMoney(deductions, currency),
        };
      });
  }, [lines, scopedIds, cycleMap]);

  const summary = useMemo(() => {
    let totalGross = 0;
    let totalNet = 0;
    let totalDeductions = 0;
    const empSet = new Set<string>();
    for (const r of rows) {
      totalGross += r.grossSalary;
      totalNet += r.netSalary;
      totalDeductions += r.deductions;
      empSet.add(r.employee);
    }
    return {
      totalGross,
      totalNet,
      totalDeductions,
      employees: empSet.size,
    };
  }, [rows]);

  const canExport = can("export");
  const loading = scopeLoading || cyclesLoading || linesLoading;
  const subtitle = `${from} to ${to}`;

  const exportReport = (fmt: "CSV" | "Excel") => {
    downloadReportTable(
      EXPORT_HEADERS,
      reportExportRows(COLUMNS, rows),
      `payroll_report_${from}_${to}`,
      fmt,
    );
    fire(`${fmt} exported`);
  };

  const exportPdf = () => {
    printReportTable("Payroll Report", subtitle, EXPORT_HEADERS, reportExportRows(COLUMNS, rows));
    fire("Print dialog opened");
  };

  return (
    <HrReportShell
      title="Payroll Report"
      subtitle={subtitle}
      recordCount={rows.length}
      summaryCards={[
        { lab: "Total Gross", val: formatMoney(summary.totalGross), tone: "blue" },
        { lab: "Employees Processed", val: summary.employees, tone: "cyan" },
        { lab: "Total Deductions", val: formatMoney(summary.totalDeductions), tone: "orange" },
        { lab: "Total Net Payroll", val: formatMoney(summary.totalNet), tone: "green" },
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
          cycleOptions={cycleOptions}
          showEmployee
          showCycle
          refLoading={refLoading}
        />
      }
    >
      <HrReportTable columns={COLUMNS} rows={rows} rowKey={(r) => r.id} />
    </HrReportShell>
  );
}
