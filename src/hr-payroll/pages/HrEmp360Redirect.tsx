import { Navigate } from "react-router-dom";
import { useHrEmployees } from "../hooks/useHrEmployees";

/** Nav link target — redirects to first active employee (prefers FL-1042 demo anchor). */
export default function HrEmp360Redirect() {
  const { data: employees = [], isLoading, isError, error } = useHrEmployees({ activeOnly: true });

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

  const target = employees.find((e) => e.emp_code === "FL-1042") ?? employees[0];

  if (!target) {
    return (
      <div className="empty">
        <div className="ico">👤</div>
        No active employees found. Add employees in Employee Master or check HR database access.
      </div>
    );
  }

  return <Navigate to={`/hr/employee/${target.id}`} replace />;
}
