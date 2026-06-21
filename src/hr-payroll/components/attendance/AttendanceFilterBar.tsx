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

export function AttendanceFilterBar(props: Props) {
  return (
    <div className="card card-wash emp360-filter-card attendance-filter-card">
      <Emp360FilterBar
        bare
        filters={props.filters}
        onChange={props.onFiltersChange}
        options={props.options}
        employmentTypes={props.employmentTypes}
        refLoading={props.refLoading}
        dateRange={{
          from: props.from,
          to: props.to,
          cycleLabel: props.cycleLabel,
          onFromChange: props.onFromChange,
          onToChange: props.onToChange,
        }}
      />
    </div>
  );
}
