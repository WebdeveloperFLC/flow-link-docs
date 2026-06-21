import { useMemo } from "react";
import { Link } from "react-router-dom";
import { useHrAccess } from "../../context/HrPayrollProvider";
import { useHrEmployees, useHrReferenceData } from "../../hooks/useHrEmployees";
import { useHrShifts } from "../../hooks/useHrShifts";
import { useHrAttendanceBulk } from "../../hooks/useHrAttendanceBulk";
import { useHrAttendanceFilters } from "../../hooks/useHrAttendanceFilters";
import { AttendanceFilterBar } from "../../components/attendance/AttendanceFilterBar";
import { AttendanceSummaryTable } from "../../components/attendance/AttendanceSummaryTable";
import {
  collectEmp360FilterOptions,
  collectEmploymentTypes,
  filterEmployees,
  sanitizeEmp360Filters,
} from "../../lib/emp360Filters";
import { emp360ProfileSearch } from "../../lib/emp360Paths";
import { buildAttendanceSummaryRows } from "../../lib/attendanceRegister";
import {
  downloadAttendanceSummary,
  printAttendanceSummary,
} from "../../lib/attendanceExport";

export default function HrAttendanceReportPage() {
  const { can, fire } = useHrAccess();
  const {
    from,
    to,
    filters,
    cycleLabel,
    setFrom,
    setTo,
    setFilters,
  } = useHrAttendanceFilters();

  const { data: employees = [], isLoading: empLoading } = useHrEmployees();
  const { data: ref, isLoading: refLoading } = useHrReferenceData();
  const { data: shifts = [] } = useHrShifts();

  const filterOptions = useMemo(
    () => collectEmp360FilterOptions(employees, ref),
    [employees, ref],
  );

  const safeFilters = useMemo(
    () => sanitizeEmp360Filters(filters, filterOptions),
    [filters, filterOptions],
  );

  const employmentTypes = useMemo(() => collectEmploymentTypes(employees), [employees]);
  const filteredEmployees = useMemo(
    () => filterEmployees(employees, safeFilters),
    [employees, safeFilters],
  );

  const employeeIds = useMemo(() => filteredEmployees.map((e) => e.id), [filteredEmployees]);
  const { data: attendance = [], isLoading: attLoading } = useHrAttendanceBulk(from, to, employeeIds);

  const summaryRows = useMemo(
    () => buildAttendanceSummaryRows(attendance, filteredEmployees, shifts),
    [attendance, filteredEmployees, shifts],
  );

  const profileSearch = emp360ProfileSearch(safeFilters);
  const canExport = can("export");
  const loading = empLoading || attLoading;

  const exportSummary = (fmt: "CSV" | "Excel") => {
    downloadAttendanceSummary(summaryRows, from, to, fmt);
    fire(`${fmt} exported`);
  };

  const exportPdf = () => {
    printAttendanceSummary(summaryRows, from, to);
    fire("Print dialog opened");
  };

  return (
    <div className="page-grid">
      <AttendanceFilterBar
        from={from}
        to={to}
        cycleLabel={cycleLabel}
        onFromChange={setFrom}
        onToChange={setTo}
        filters={safeFilters}
        onFiltersChange={setFilters}
        options={filterOptions}
        employmentTypes={employmentTypes}
        refLoading={refLoading}
      />

      <div className="card" style={{ padding: 0 }}>
        <div className="card-h" style={{ padding: "14px 16px" }}>
          <div>
            <h3 style={{ fontSize: 15, marginBottom: 2 }}>Attendance summary</h3>
            <p className="muted" style={{ fontSize: 12, margin: 0 }}>
              {from} to {to} · {filteredEmployees.length} employees
            </p>
          </div>
          <div className="row-flex" style={{ gap: 8 }}>
            <Link to="/hr/attendance" className="btn btn-sm">
              Daily register →
            </Link>
            {canExport && (
              <>
                <button type="button" className="btn btn-sm" onClick={() => exportSummary("CSV")}>
                  CSV
                </button>
                <button type="button" className="btn btn-sm" onClick={() => exportSummary("Excel")}>
                  Excel
                </button>
                <button type="button" className="btn btn-sm" onClick={exportPdf}>
                  PDF / Print
                </button>
              </>
            )}
          </div>
        </div>

        {loading ? (
          <div className="empty">Loading attendance summary…</div>
        ) : filteredEmployees.length === 0 ? (
          <div className="empty empty-sm">No employees match your filters.</div>
        ) : (
          <AttendanceSummaryTable rows={summaryRows} profileSearch={profileSearch} />
        )}
      </div>
    </div>
  );
}
