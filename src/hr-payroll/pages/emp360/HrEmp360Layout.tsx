import { Outlet, Link, useParams, useSearchParams } from "react-router-dom";
import { useHrAccess } from "../../context/HrPayrollProvider";
import { Emp360ProfileProvider } from "../../context/Emp360ProfileContext";
import { useHrEmployees } from "../../hooks/useHrEmployees";
import { useHrShifts } from "../../hooks/useHrShifts";
import { Emp360ProfileChrome } from "../../components/emp360/Emp360ProfileChrome";
import { defaultEmp360Range } from "../../lib/emp360DateRange";
import { emp360FiltersFromSearchParams, emp360FiltersToSearchParams } from "../../lib/emp360Filters";
import { emp360ProfilePath, emp360ProfileSearch } from "../../lib/emp360Paths";

export default function HrEmp360Layout() {
  const { id } = useParams<{ id: string }>();
  const [searchParams] = useSearchParams();
  const { cycle, can } = useHrAccess();
  const {
    data: employees = [],
    isLoading,
    isError,
    error,
  } = useHrEmployees({ activeOnly: false });
  const { data: shifts = [] } = useHrShifts();

  const listFilters = emp360FiltersFromSearchParams(searchParams);
  const profileSearch = emp360ProfileSearch(listFilters);
  const listQuery = emp360FiltersToSearchParams(listFilters).toString();
  const listBackHref = listQuery ? `/hr/employee?${listQuery}` : "/hr/employee";
  const { from: cycleFrom, to: cycleTo } = defaultEmp360Range(cycle);

  const emp = employees.find((e) => e.id === id);
  const shift = shifts.find((s) => s.id === emp?.shift_id) ?? shifts[0];

  if (isLoading) {
    return <div className="empty">Loading employee profile…</div>;
  }

  if (isError) {
    return (
      <div className="empty">
        <div className="ico">⚠</div>
        Could not load employees: {error instanceof Error ? error.message : "Request failed"}
      </div>
    );
  }

  if (!emp) {
    return (
      <div className="page-grid">
        <Link to={listBackHref} className="btn btn-sm emp360-back-btn">← Back to employee list</Link>
        <div className="empty">
          <div className="ico">👤</div>
          Employee not found or you do not have access.
        </div>
      </div>
    );
  }

  const cycleLabel = cycle?.label ?? "Current cycle";

  return (
    <Emp360ProfileProvider
      value={{
        employee: emp,
        employees,
        shift,
        cycleLabel,
        cycleFrom,
        cycleTo,
        listFilters,
        listBackHref,
        profileHref: emp360ProfilePath(emp.id, profileSearch),
        profileSearch,
        canExport: can("export"),
      }}
    >
      <div className="page-grid">
        <Emp360ProfileChrome />
        <Outlet />
      </div>
    </Emp360ProfileProvider>
  );
}
