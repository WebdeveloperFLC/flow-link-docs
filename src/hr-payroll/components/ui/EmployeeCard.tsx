import { Link } from "react-router-dom";
import { EmployeeAvatar } from "./EmployeeAvatar";
import { employeeStatusBadgeClass, employeeStatusLabel } from "../../lib/format";
import type { EmployeeRow } from "../../lib/types";

export function EmployeeCard({
  employee,
  to,
}: {
  employee: EmployeeRow;
  to: string;
}) {
  const designation = employee.designations?.name ?? employee.designation ?? "—";
  const department = employee.departments?.name ?? employee.department ?? "—";
  const branch = employee.branches?.name ?? "—";

  return (
    <Link to={to} className="emp-card emp360-emp-card">
      <div className="emp-card-head">
        <EmployeeAvatar name={employee.full_name} photoUrl={employee.photo_url} size={44} fontSize={15} />
        <div className="emp-card-text">
          <div className="emp-card-name">{employee.full_name}</div>
          <div className="emp-card-code mono">{employee.emp_code}</div>
        </div>
      </div>
      <div className="emp360-card-meta">
        <div className="emp360-card-line">
          <span className="emp360-card-label">Designation</span>
          <span>{designation}</span>
        </div>
        <div className="emp360-card-line">
          <span className="emp360-card-label">Department</span>
          <span>{department}</span>
        </div>
        <div className="emp360-card-line">
          <span className="emp360-card-label">Branch</span>
          <span>{branch}</span>
        </div>
      </div>
      <div className="row-flex emp-card-status">
        <span className={`badge ${employeeStatusBadgeClass(employee.status)}`}>
          {employeeStatusLabel(employee.status)}
        </span>
      </div>
    </Link>
  );
}
