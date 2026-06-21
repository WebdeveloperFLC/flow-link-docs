import { Navigate } from "react-router-dom";
import { useHrEmployees } from "../hooks/useHrEmployees";

/** Nav link target — redirects to first demo employee (Isha FL-1042). */
export default function HrEmp360Redirect() {
  const { data: employees = [], isLoading } = useHrEmployees({ activeOnly: false });

  if (isLoading) {
    return <div className="empty">Loading employee profile…</div>;
  }

  const target =
    employees.find((e) => e.emp_code === "FL-1042") ?? employees[0];

  if (!target) {
    return (
      <div className="empty">
        <div className="ico">👤</div>
        No employees found. Apply HR seed SQL in Supabase.
      </div>
    );
  }

  return <Navigate to={`/hr/employee/${target.id}`} replace />;
}
