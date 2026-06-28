import { EMP360_COUNTRY_OPTIONS } from "../../lib/emp360Filters";
import {
  EMPLOYEE_STATUS_FILTER_OPTIONS,
  RECORD_STATUS_OPTIONS,
  type HrReportFilters,
} from "../../lib/reportFilters";
import { HOLIDAY_TYPE_OPTIONS } from "../../lib/holidayFilters";
import type { Emp360FilterOptions } from "../../lib/emp360Filters";

type CategoryOption = { id: string; label: string };
type EmployeeOption = { id: string; label: string };
type CycleOption = { id: string; label: string };

type Props = {
  from?: string;
  to?: string;
  onFromChange?: (v: string) => void;
  onToChange?: (v: string) => void;
  cycleLabel?: string;
  filters: HrReportFilters;
  onChange: (patch: Partial<HrReportFilters>) => void;
  options: Emp360FilterOptions;
  employmentTypes: string[];
  categoryOptions?: CategoryOption[];
  employeeOptions?: EmployeeOption[];
  cycleOptions?: CycleOption[];
  workWeekOptions?: string[];
  auditUsers?: string[];
  auditModules?: string[];
  refLoading?: boolean;
  showDateRange?: boolean;
  showStatus?: boolean;
  showEmployee?: boolean;
  showCategory?: boolean;
  showRecordStatus?: boolean;
  showCycle?: boolean;
  showHolidayType?: boolean;
  showWorkWeek?: boolean;
  showAuditFilters?: boolean;
  showOrgFilters?: boolean;
};

export function ReportFilterBar({
  from,
  to,
  onFromChange,
  onToChange,
  cycleLabel,
  filters,
  onChange,
  options,
  employmentTypes,
  categoryOptions = [],
  employeeOptions = [],
  cycleOptions = [],
  workWeekOptions = [],
  auditUsers = [],
  auditModules = [],
  refLoading,
  showDateRange = true,
  showStatus = false,
  showEmployee = false,
  showCategory = true,
  showRecordStatus = false,
  showCycle = false,
  showHolidayType = false,
  showWorkWeek = false,
  showAuditFilters = false,
  showOrgFilters = true,
}: Props) {
  return (
    <div className="card card-wash emp360-filter-card">
      {showDateRange && from != null && to != null && onFromChange && onToChange && (
        <div className="emp360-filter-row row-flex" style={{ gap: 12, marginBottom: 12 }}>
          <label className="fld">
            <span className="l">From</span>
            <input className="input" type="date" value={from} onChange={(e) => onFromChange(e.target.value)} />
          </label>
          <label className="fld">
            <span className="l">To</span>
            <input className="input" type="date" value={to} onChange={(e) => onToChange(e.target.value)} />
          </label>
          {cycleLabel && (
            <span className="muted" style={{ fontSize: 12, alignSelf: "flex-end", paddingBottom: 8 }}>
              Default: {cycleLabel}
            </span>
          )}
        </div>
      )}

      <div className="emp360-filter-grid">
        {showOrgFilters && (
          <>
            <label className="fld">
              <span className="l">Country</span>
              <select
                className="input emp360-filter-select"
                value={filters.country}
                onChange={(e) => onChange({ country: e.target.value })}
              >
                {EMP360_COUNTRY_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>{o.label}</option>
                ))}
              </select>
            </label>
            <label className="fld">
              <span className="l">Branch</span>
              <select
                className="input emp360-filter-select"
                value={filters.branch}
                onChange={(e) => onChange({ branch: e.target.value })}
                disabled={refLoading}
              >
                <option value="All">All branches</option>
                {options.branches.map((b) => (
                  <option key={b.id} value={b.id}>{b.label}</option>
                ))}
              </select>
            </label>
            <label className="fld">
              <span className="l">Payroll company</span>
              <select
                className="input emp360-filter-select"
                value={filters.company}
                onChange={(e) => onChange({ company: e.target.value })}
                disabled={refLoading}
              >
                <option value="All">All companies</option>
                {options.companies.map((c) => (
                  <option key={c.id} value={c.id}>{c.label}</option>
                ))}
              </select>
            </label>
            <label className="fld">
              <span className="l">Department</span>
              <select
                className="input emp360-filter-select"
                value={filters.department}
                onChange={(e) => onChange({ department: e.target.value })}
              >
                <option value="All">All departments</option>
                {options.departments.map((d) => (
                  <option key={d.id} value={d.id}>{d.label}</option>
                ))}
              </select>
            </label>
            <label className="fld">
              <span className="l">Designation</span>
              <select
                className="input emp360-filter-select"
                value={filters.designation}
                onChange={(e) => onChange({ designation: e.target.value })}
              >
                <option value="All">All designations</option>
                {options.designations.map((d) => (
                  <option key={d.id} value={d.id}>{d.label}</option>
                ))}
              </select>
            </label>
          </>
        )}

        {showCategory && (
          <label className="fld">
            <span className="l">Employee category</span>
            <select
              className="input emp360-filter-select"
              value={filters.categoryId}
              onChange={(e) => onChange({ categoryId: e.target.value })}
            >
              <option value="All">All categories</option>
              {categoryOptions.map((c) => (
                <option key={c.id} value={c.id}>{c.label}</option>
              ))}
            </select>
          </label>
        )}

        {showOrgFilters && (
          <label className="fld">
            <span className="l">Employment type</span>
            <select
              className="input emp360-filter-select"
              value={filters.employment}
              onChange={(e) => onChange({ employment: e.target.value })}
            >
              <option value="All">All types</option>
              {employmentTypes.map((t) => (
                <option key={t} value={t}>{t}</option>
              ))}
            </select>
          </label>
        )}

        {showEmployee && (
          <label className="fld">
            <span className="l">Employee</span>
            <select
              className="input emp360-filter-select"
              value={filters.employeeId}
              onChange={(e) => onChange({ employeeId: e.target.value })}
            >
              <option value="All">All employees</option>
              {employeeOptions.map((e) => (
                <option key={e.id} value={e.id}>{e.label}</option>
              ))}
            </select>
          </label>
        )}

        {showStatus && (
          <label className="fld">
            <span className="l">Status</span>
            <select
              className="input emp360-filter-select"
              value={filters.status}
              onChange={(e) => onChange({ status: e.target.value })}
            >
              {EMPLOYEE_STATUS_FILTER_OPTIONS.map((s) => (
                <option key={s} value={s}>{s === "All" ? "All statuses" : s}</option>
              ))}
            </select>
          </label>
        )}

        {showRecordStatus && (
          <label className="fld">
            <span className="l">Record status</span>
            <select
              className="input emp360-filter-select"
              value={filters.recordStatus}
              onChange={(e) => onChange({ recordStatus: e.target.value })}
            >
              {RECORD_STATUS_OPTIONS.map((s) => (
                <option key={s} value={s}>{s === "All" ? "All statuses" : s}</option>
              ))}
            </select>
          </label>
        )}

        {showCycle && (
          <label className="fld">
            <span className="l">Payroll cycle</span>
            <select
              className="input emp360-filter-select"
              value={filters.cycleId}
              onChange={(e) => onChange({ cycleId: e.target.value })}
            >
              <option value="All">All cycles in range</option>
              {cycleOptions.map((c) => (
                <option key={c.id} value={c.id}>{c.label}</option>
              ))}
            </select>
          </label>
        )}

        {showHolidayType && (
          <label className="fld">
            <span className="l">Holiday type</span>
            <select
              className="input emp360-filter-select"
              value={filters.holidayType}
              onChange={(e) => onChange({ holidayType: e.target.value })}
            >
              <option value="All">All types</option>
              {HOLIDAY_TYPE_OPTIONS.map((t) => (
                <option key={t} value={t}>{t}</option>
              ))}
            </select>
          </label>
        )}

        {showWorkWeek && (
          <label className="fld">
            <span className="l">Work week</span>
            <select
              className="input emp360-filter-select"
              value={filters.workWeek}
              onChange={(e) => onChange({ workWeek: e.target.value })}
            >
              <option value="All">All work weeks</option>
              {workWeekOptions.map((w) => (
                <option key={w} value={w}>{w}</option>
              ))}
            </select>
          </label>
        )}

        {showAuditFilters && (
          <>
            <label className="fld">
              <span className="l">Module</span>
              <select
                className="input emp360-filter-select"
                value={filters.auditModule}
                onChange={(e) => onChange({ auditModule: e.target.value })}
              >
                <option value="All">All modules</option>
                {auditModules.map((m) => (
                  <option key={m} value={m}>{m}</option>
                ))}
              </select>
            </label>
            <label className="fld">
              <span className="l">User</span>
              <select
                className="input emp360-filter-select"
                value={filters.auditUser}
                onChange={(e) => onChange({ auditUser: e.target.value })}
              >
                <option value="All">All users</option>
                {auditUsers.map((u) => (
                  <option key={u} value={u}>{u}</option>
                ))}
              </select>
            </label>
          </>
        )}

        <label className="fld emp360-filter-search">
          <span className="l">Quick search</span>
          <input
            className="input"
            placeholder="Name, ID, personal/company email or mobile…"
            value={filters.search}
            onChange={(e) => onChange({ search: e.target.value })}
          />
        </label>
      </div>
    </div>
  );
}
