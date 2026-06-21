import { useMemo } from "react";
import { useHrAccess } from "../../context/HrPayrollProvider";
import { useHrCycles, useHrPayrollLinesMulti } from "../../hooks/useHrPayroll";
import { useReportScope } from "../../hooks/useReportScope";
import { HrReportShell } from "../../components/reports/HrReportShell";
import { ReportFilterBar } from "../../components/reports/ReportFilterBar";
import { HrReportTable, reportExportRows, type HrReportColumn } from "../../components/reports/HrReportTable";
import { dateInRange } from "../../lib/reportFilters";
import { employeeCurrency, formatMoney } from "../../lib/format";
import {
  downloadPayrollRegister,
  linesToRegisterRows,
  printRegisterPdf,
} from "../../lib/payrollExport";
import { downloadReportTable, printReportTable } from "../../lib/hrReportExport";
import type { PayrollCycleRow } from "../../lib/types";

type Row = {
  id: string;
  employee: string;
  cycleLabel: string;
  grossDisplay: string;
  netDisplay: string;
  deductionsDisplay: string;
  currency: string;
  gross: number;
  net: number;
  deductions: number;
};

const COLUMNS: HrReportColumn<Row>[] = [
  { key: "employee", label: "Employee", sortable: true, exportValue: (r) => r.employee },
  { key: "cycleLabel", label: "Payroll Cycle", sortable: true, exportValue: (r) => r.cycleLabel },
  { key: "grossDisplay", label: "Gross", sortable: true, align: "right", sortValue: (r) => r.gross, exportValue: (r) => r.grossDisplay },
  { key: "netDisplay", label: "Net", sortable: true, align: "right", sortValue: (r) => r.net, exportValue: (r) => r.netDisplay },
  { key: "deductionsDisplay", label: "Deductions", sortable: true, align: "right", sortValue: (r) => r.deductions, exportValue: (r) => r.deductionsDisplay },
  { key: "currency", label: "Currency", sortable: true, exportValue: (r) => r.currency },
];

const EXPORT_HEADERS = COLUMNS.map((c) => c.label);

function cyclesInRange(cycles: PayrollCycleRow[], from: string, to: string) {
  return cycles.filter(
    (c) => dateInRange(c.start_date, from, to) || dateInRange(c.end_date, from, to) ||
      (c.start_date <= from && c.end_date >= to),
  );
}

export default function HrSalaryRegisterReportPage() {
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
          gross: l.gross_earned,
          net: l.net_salary,
          deductions,
          currency,
          grossDisplay: formatMoney(l.gross_earned, currency),
          netDisplay: formatMoney(l.net_salary, currency),
          deductionsDisplay: formatMoney(deductions, currency),
        };
      });
  }, [lines, scopedIds, cycleMap]);

  const registerExportLines = useMemo(() => {
    const byCycle = new Map<string, typeof lines>();
    for (const l of lines.filter((x) => scopedIds.has(x.employee_id))) {
      const list = byCycle.get(l.cycle_id) ?? [];
      list.push(l);
      byCycle.set(l.cycle_id, list);
    }
    return byCycle;
  }, [lines, scopedIds]);

  const summary = useMemo(() => {
    let gross = 0;
    let net = 0;
    for (const r of rows) {
      gross += r.gross;
      net += r.net;
    }
    return { gross, net, count: rows.length };
  }, [rows]);

  const canExport = can("export");
  const loading = scopeLoading || cyclesLoading || linesLoading;
  const subtitle = `${from} to ${to}`;

  const exportReport = (fmt: "CSV" | "Excel") => {
    downloadReportTable(
      EXPORT_HEADERS,
      reportExportRows(COLUMNS, rows),
      `salary_register_report_${from}_${to}`,
      fmt,
    );
    fire(`${fmt} exported`);
  };

  const exportFullRegister = (fmt: "CSV" | "Excel") => {
    const primaryCycle = filters.cycleId !== "All"
      ? cycleMap.get(filters.cycleId)
      : cyclesInDateRange[0];
    if (!primaryCycle) {
      exportReport(fmt);
      return;
    }
    const cycleLines = registerExportLines.get(primaryCycle.id) ?? [];
    const registerRows = linesToRegisterRows(cycleLines, primaryCycle.label, primaryCycle.status);
    downloadPayrollRegister(registerRows, primaryCycle.label, fmt);
    fire(`Full register ${fmt} exported`);
  };

  const exportPdf = () => {
    printReportTable("Salary Register Report", subtitle, EXPORT_HEADERS, reportExportRows(COLUMNS, rows));
    fire("Print dialog opened");
  };

  const exportFullPdf = () => {
    const primaryCycle = filters.cycleId !== "All"
      ? cycleMap.get(filters.cycleId)
      : cyclesInDateRange[0];
    if (!primaryCycle) {
      exportPdf();
      return;
    }
    const cycleLines = registerExportLines.get(primaryCycle.id) ?? [];
    const registerRows = linesToRegisterRows(cycleLines, primaryCycle.label, primaryCycle.status);
    printRegisterPdf(
      registerRows,
      primaryCycle.label,
      primaryCycle.status === "Locked" || primaryCycle.status === "Paid",
    );
    fire("Full register print opened");
  };

  return (
    <HrReportShell
      title="Salary Register Report"
      subtitle={subtitle}
      recordCount={rows.length}
      summaryCards={[
        { lab: "Records", val: summary.count, tone: "blue" },
        { lab: "Total Gross", val: formatMoney(summary.gross), tone: "cyan" },
        { lab: "Total Net", val: formatMoney(summary.net), tone: "green" },
      ]}
      loading={loading}
      canExport={canExport}
      onExportCsv={() => exportReport("CSV")}
      onExportExcel={() => exportReport("Excel")}
      onExportPdf={exportPdf}
      extraActions={
        canExport ? (
          <button type="button" className="btn btn-sm btn-primary" onClick={() => exportFullRegister("Excel")}>
            Full register
          </button>
        ) : null
      }
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
      {canExport && (
        <div style={{ padding: "8px 16px 16px" }}>
          <button type="button" className="btn btn-sm" onClick={exportFullPdf}>
            Print full salary register
          </button>
        </div>
      )}
    </HrReportShell>
  );
}
