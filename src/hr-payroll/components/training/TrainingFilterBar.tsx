import type { TrainingFilters } from "../../lib/trainingFilters";
import { TRAINING_STATUS_OPTIONS } from "../../lib/trainingFilters";
import type { BranchRow, DepartmentRow, EmployeeRow } from "../../lib/types";

type Props = {
  filters: TrainingFilters;
  onChange: (patch: Partial<TrainingFilters>) => void;
  branches: BranchRow[];
  departments: DepartmentRow[];
  employees: EmployeeRow[];
};

export function TrainingFilterBar({
  filters,
  onChange,
  branches,
  departments,
  employees,
}: Props) {
  return (
    <div className="card card-wash emp360-filter-card">
      <div className="filter-bar emp360-filter-bar">
        <label className="fld">
          <span className="l">Branch</span>
          <select
            className="input emp360-filter-select"
            value={filters.branch}
            onChange={(e) => onChange({ branch: e.target.value })}
          >
            <option value="All">All branches</option>
            {branches.map((b) => (
              <option key={b.id} value={b.id}>{b.name}</option>
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
            {departments.map((d) => (
              <option key={d.id} value={d.id}>{d.name}</option>
            ))}
          </select>
        </label>
        <label className="fld">
          <span className="l">Employee</span>
          <select
            className="input emp360-filter-select"
            value={filters.employeeId}
            onChange={(e) => onChange({ employeeId: e.target.value })}
          >
            <option value="All">All employees</option>
            {employees.map((e) => (
              <option key={e.id} value={e.id}>
                {e.full_name} ({e.emp_code})
              </option>
            ))}
          </select>
        </label>
        <label className="fld">
          <span className="l">Training status</span>
          <select
            className="input emp360-filter-select"
            value={filters.status}
            onChange={(e) => onChange({ status: e.target.value })}
          >
            {TRAINING_STATUS_OPTIONS.map((s) => (
              <option key={s} value={s}>{s === "All" ? "All statuses" : s}</option>
            ))}
          </select>
        </label>
        <label className="fld">
          <span className="l">From date</span>
          <input
            type="date"
            className="input"
            value={filters.from}
            onChange={(e) => onChange({ from: e.target.value })}
          />
        </label>
        <label className="fld">
          <span className="l">To date</span>
          <input
            type="date"
            className="input"
            value={filters.to}
            onChange={(e) => onChange({ to: e.target.value })}
          />
        </label>
        <label className="fld emp360-filter-search">
          <span className="l">Quick search</span>
          <input
            className="input"
            placeholder="Name, ID, reference, type…"
            value={filters.search}
            onChange={(e) => onChange({ search: e.target.value })}
          />
        </label>
      </div>
    </div>
  );
}
