import type { BranchRow, CompanyRow, DepartmentRow, DesignationRow } from "../../lib/types";
import type { Emp360Filters } from "../../lib/emp360Filters";
import { EMP360_COUNTRY_OPTIONS } from "../../lib/emp360Filters";

export function Emp360FilterBar({
  filters,
  onChange,
  ref,
  employmentTypes,
}: {
  filters: Emp360Filters;
  onChange: (patch: Partial<Emp360Filters>) => void;
  ref?: {
    branches?: BranchRow[];
    companies?: CompanyRow[];
    departments?: DepartmentRow[];
    designations?: DesignationRow[];
  };
  employmentTypes: string[];
}) {
  return (
    <div className="card card-wash emp360-filter-card">
      <div className="filter-bar">
        <label className="fld">
          <span className="l">Country</span>
          <select
            className="input"
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
            className="input"
            value={filters.branch}
            onChange={(e) => onChange({ branch: e.target.value })}
          >
            <option value="All">All branches</option>
            {(ref?.branches ?? []).map((b) => (
              <option key={b.id} value={b.id}>{b.name}</option>
            ))}
          </select>
        </label>
        <label className="fld">
          <span className="l">Payroll company</span>
          <select
            className="input"
            value={filters.company}
            onChange={(e) => onChange({ company: e.target.value })}
          >
            <option value="All">All companies</option>
            {(ref?.companies ?? []).map((c) => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
        </label>
        <label className="fld">
          <span className="l">Department</span>
          <select
            className="input"
            value={filters.department}
            onChange={(e) => onChange({ department: e.target.value })}
          >
            <option value="All">All departments</option>
            {(ref?.departments ?? []).map((d) => (
              <option key={d.id} value={d.id}>{d.name}</option>
            ))}
          </select>
        </label>
        <label className="fld">
          <span className="l">Designation</span>
          <select
            className="input"
            value={filters.designation}
            onChange={(e) => onChange({ designation: e.target.value })}
          >
            <option value="All">All designations</option>
            {(ref?.designations ?? []).map((d) => (
              <option key={d.id} value={d.id}>{d.name}</option>
            ))}
          </select>
        </label>
        <label className="fld">
          <span className="l">Employment type</span>
          <select
            className="input"
            value={filters.employment}
            onChange={(e) => onChange({ employment: e.target.value })}
          >
            <option value="All">All types</option>
            {employmentTypes.map((t) => (
              <option key={t} value={t}>{t}</option>
            ))}
          </select>
        </label>
        <label className="fld">
          <span className="l">Search employee</span>
          <input
            className="input"
            placeholder="Name, ID, email, mobile…"
            value={filters.search}
            onChange={(e) => onChange({ search: e.target.value })}
          />
        </label>
      </div>
    </div>
  );
}
