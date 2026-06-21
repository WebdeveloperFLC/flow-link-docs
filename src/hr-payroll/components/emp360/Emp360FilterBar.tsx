import type { Emp360Filters, Emp360FilterOptions } from "../../lib/emp360Filters";
import { EMP360_COUNTRY_OPTIONS } from "../../lib/emp360Filters";

export function Emp360FilterBar({
  filters,
  onChange,
  options,
  employmentTypes,
  refLoading,
  bare,
  dateRange,
}: {
  filters: Emp360Filters;
  onChange: (patch: Partial<Emp360Filters>) => void;
  options: Emp360FilterOptions;
  employmentTypes: string[];
  refLoading?: boolean;
  /** Skip outer card wrapper when nested inside another panel */
  bare?: boolean;
  /** Optional date range row (attendance register / report) */
  dateRange?: {
    from: string;
    to: string;
    cycleLabel: string;
    onFromChange: (value: string) => void;
    onToChange: (value: string) => void;
  };
}) {
  const fields = (
    <>
      {dateRange && (
        <div className="emp360-section-date-filter attendance-date-filter emp360-filter-dates">
          <label className="emp360-range-field">
            <span className="emp360-range-field-label">From date</span>
            <input
              type="date"
              className="input"
              value={dateRange.from}
              onChange={(e) => dateRange.onFromChange(e.target.value)}
            />
          </label>
          <label className="emp360-range-field">
            <span className="emp360-range-field-label">To date</span>
            <input
              type="date"
              className="input"
              value={dateRange.to}
              onChange={(e) => dateRange.onToChange(e.target.value)}
            />
          </label>
          <span className="muted emp360-range-hint">Default: {dateRange.cycleLabel}</span>
        </div>
      )}
      {refLoading && (
        <p className="muted emp360-filter-loading">Loading filter options…</p>
      )}
      <div className="filter-bar emp360-filter-bar">
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
        <label className="fld emp360-filter-search">
          <span className="l">Search employee</span>
          <input
            className="input"
            placeholder="Name, ID, email, mobile…"
            value={filters.search}
            onChange={(e) => onChange({ search: e.target.value })}
          />
        </label>
      </div>
    </>
  );

  if (bare) return fields;

  return (
    <div className="card card-wash emp360-filter-card">
      {fields}
    </div>
  );
}
