import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { useHrAccess } from "../context/HrPayrollProvider";
import { useHrEmployees, useHrReferenceData } from "../hooks/useHrEmployees";
import { EmployeeCard } from "../components/ui/EmployeeCard";
import { Emp360FilterBar } from "../components/emp360/Emp360FilterBar";
import { defaultEmp360Range } from "../lib/emp360DateRange";
import { emp360ProfilePath, emp360ProfileSearch } from "../lib/emp360Paths";
import {
  collectEmploymentTypes,
  emp360FiltersFromSearchParams,
  emp360FiltersToSearchParams,
  filterEmployees,
  type Emp360Filters,
} from "../lib/emp360Filters";

export default function HrEmp360ListPage() {
  const [searchParams] = useSearchParams();
  const { cycle } = useHrAccess();
  const [filters, setFilters] = useState<Emp360Filters>(() =>
    emp360FiltersFromSearchParams(searchParams),
  );

  useEffect(() => {
    setFilters(emp360FiltersFromSearchParams(searchParams));
  }, [searchParams]);

  const {
    data: employees = [],
    isLoading,
    isError,
    error,
  } = useHrEmployees({ activeOnly: false });
  const { data: ref } = useHrReferenceData();

  const employmentTypes = useMemo(() => collectEmploymentTypes(employees), [employees]);
  const filteredEmployees = useMemo(
    () => filterEmployees(employees, filters),
    [employees, filters],
  );

  const updateFilters = (patch: Partial<Emp360Filters>) => {
    setFilters((prev) => ({ ...prev, ...patch }));
  };

  if (isLoading) {
    return <div className="empty">Loading employees…</div>;
  }

  if (isError) {
    return (
      <div className="empty">
        <div className="ico">⚠</div>
        Could not load employees: {error instanceof Error ? error.message : "Request failed"}
      </div>
    );
  }

  if (!employees.length) {
    return (
      <div className="empty">
        <div className="ico">👤</div>
        No employees found. Add employees in Employee Master or check HR database access.
      </div>
    );
  }

  const { from, to } = defaultEmp360Range(cycle);
  const profileSearch = emp360ProfileSearch(from, to, filters);

  return (
    <div className="page-grid">
      <Emp360FilterBar
        filters={filters}
        onChange={updateFilters}
        ref={ref}
        employmentTypes={employmentTypes}
      />

      <div className="emp360-list-header">
        <span className="showing-count">
          Showing {filteredEmployees.length} employee{filteredEmployees.length === 1 ? "" : "s"}
        </span>
      </div>

      {filteredEmployees.length === 0 ? (
        <div className="card empty empty-sm">No employees match the current filters.</div>
      ) : (
        <div className="emp-card-grid emp360-card-grid">
          {filteredEmployees.map((e) => (
            <EmployeeCard
              key={e.id}
              employee={e}
              to={emp360ProfilePath(e.id, profileSearch)}
            />
          ))}
        </div>
      )}
    </div>
  );
}
