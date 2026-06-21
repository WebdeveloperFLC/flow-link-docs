import type { Emp360Filters, Emp360FilterOptions } from "../../lib/emp360Filters";
import { Emp360FilterBar } from "../emp360/Emp360FilterBar";

type Props = {
  from: string;
  to: string;
  cycleLabel: string;
  onFromChange: (value: string) => void;
  onToChange: (value: string) => void;
  filters: Emp360Filters;
  onFiltersChange: (patch: Partial<Emp360Filters>) => void;
  options: Emp360FilterOptions;
  employmentTypes: string[];
  refLoading?: boolean;
};

export function AttendanceFilterBar({
  from,
  to,
  cycleLabel,
  onFromChange,
  onToChange,
  filters,
  onFiltersChange,
  options,
  employmentTypes,
  refLoading,
}: Props) {
  return (
    <div className="attendance-filter-stack">
      <div className="card card-wash attendance-date-card">
        <div className="emp360-section-date-filter attendance-date-filter">
          <label className="emp360-range-field">
            <span className="emp360-range-field-label">From date</span>
            <input
              type="date"
              className="input"
              value={from}
              onChange={(e) => onFromChange(e.target.value)}
            />
          </label>
          <label className="emp360-range-field">
            <span className="emp360-range-field-label">To date</span>
            <input
              type="date"
              className="input"
              value={to}
              onChange={(e) => onToChange(e.target.value)}
            />
          </label>
          <span className="muted emp360-range-hint">Default: {cycleLabel}</span>
        </div>
      </div>
      <Emp360FilterBar
        filters={filters}
        onChange={onFiltersChange}
        options={options}
        employmentTypes={employmentTypes}
        refLoading={refLoading}
      />
    </div>
  );
}
