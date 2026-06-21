import { useMemo } from "react";
import { useHrAccess } from "../../context/HrPayrollProvider";
import { useHrShifts } from "../../hooks/useHrShifts";
import { useHrAttendanceBulk } from "../../hooks/useHrAttendanceBulk";
import { useReportScope } from "../../hooks/useReportScope";
import { HrReportShell } from "../../components/reports/HrReportShell";
import { ReportFilterBar } from "../../components/reports/ReportFilterBar";
import { HrReportTable, reportExportRows, type HrReportColumn } from "../../components/reports/HrReportTable";
import { buildAttendanceRegisterRows } from "../../lib/attendanceRegister";
import { downloadReportTable, printReportTable } from "../../lib/hrReportExport";

type Row = {
  id: string;
  fullName: string;
  workDate: string;
  checkIn: string;
  breakIn: string;
  breakOut: string;
  checkOut: string;
  workingHours: string;
  lateMinutes: number;
  status: string;
  shift: string;
  isMispunch: boolean;
};

const COLUMNS: HrReportColumn<Row>[] = [
  { key: "fullName", label: "Employee", sortable: true, exportValue: (r) => r.fullName },
  { key: "workDate", label: "Date", sortable: true, exportValue: (r) => r.workDate },
  { key: "checkIn", label: "Check In", exportValue: (r) => r.checkIn },
  { key: "breakIn", label: "Break In", exportValue: (r) => r.breakIn },
  { key: "breakOut", label: "Break Out", exportValue: (r) => r.breakOut },
  { key: "checkOut", label: "Check Out", exportValue: (r) => r.checkOut },
  { key: "workingHours", label: "Working Hours", sortable: true, exportValue: (r) => r.workingHours },
  { key: "lateMinutes", label: "Late Minutes", sortable: true, align: "right", exportValue: (r) => r.lateMinutes },
  { key: "status", label: "Attendance Status", sortable: true, exportValue: (r) => r.status },
  { key: "shift", label: "Shift", sortable: true, exportValue: (r) => r.shift },
];

const EXPORT_HEADERS = COLUMNS.map((c) => c.label);

export default function HrAttendanceReportPage() {
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
    filteredEmployees,
    employeeIds,
    filterOptions,
    categoryOptions,
    employeeOptions,
    employmentTypes,
    loading: scopeLoading,
    refLoading,
  } = scope;

  const { data: shifts = [] } = useHrShifts();
  const { data: attendance = [], isLoading: attLoading } = useHrAttendanceBulk(from, to, employeeIds);

  const registerRows = useMemo(
    () => buildAttendanceRegisterRows(attendance, filteredEmployees, shifts),
    [attendance, filteredEmployees, shifts],
  );

  const rows = useMemo<Row[]>(() =>
    registerRows.map((r) => ({
      id: r.attendanceId,
      fullName: `${r.fullName} (${r.empCode})`,
      workDate: r.workDate,
      checkIn: r.checkIn ?? "—",
      breakIn: r.breakStart ?? "—",
      breakOut: r.breakEnd ?? "—",
      checkOut: r.checkOut ?? "—",
      workingHours: r.workingHours,
      lateMinutes: r.lateMinutes,
      status: r.status,
      shift: r.shiftName ?? "—",
      isMispunch: r.isMispunch,
    })),
  [registerRows]);

  const summary = useMemo(() => {
    let present = 0;
    let absent = 0;
    let halfDay = 0;
    let late = 0;
    let mispunch = 0;
    for (const r of registerRows) {
      if (r.status === "Present") present += 1;
      if (r.status === "Absent") absent += 1;
      if (r.status === "Half Day") halfDay += 1;
      if (r.lateMinutes > 0) late += 1;
      if (r.isMispunch) mispunch += 1;
    }
    return { present, absent, halfDay, late, mispunch };
  }, [registerRows]);

  const canExport = can("export");
  const loading = scopeLoading || attLoading;
  const subtitle = `${from} to ${to} · ${filteredEmployees.length} employees`;

  const exportReport = (fmt: "CSV" | "Excel") => {
    downloadReportTable(
      EXPORT_HEADERS,
      reportExportRows(COLUMNS, rows),
      `attendance_report_${from}_${to}`,
      fmt,
    );
    fire(`${fmt} exported`);
  };

  const exportPdf = () => {
    printReportTable("Attendance Report", subtitle, EXPORT_HEADERS, reportExportRows(COLUMNS, rows));
    fire("Print dialog opened");
  };

  return (
    <HrReportShell
      title="Attendance Report"
      subtitle={subtitle}
      recordCount={rows.length}
      summaryCards={[
        { lab: "Present", val: summary.present, tone: "green" },
        { lab: "Absent", val: summary.absent, tone: "rose" },
        { lab: "Half Day", val: summary.halfDay, tone: "orange" },
        { lab: "Late Arrivals", val: summary.late, tone: "gold" },
        { lab: "Mispunches", val: summary.mispunch, tone: "pink" },
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
          refLoading={refLoading}
        />
      }
    >
      <HrReportTable columns={COLUMNS} rows={rows} rowKey={(r) => r.id} />
    </HrReportShell>
  );
}
