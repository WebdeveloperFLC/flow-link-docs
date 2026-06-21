import { EmployeeAvatar } from "./EmployeeAvatar";
import { employeeStatusBadgeClass, employeeStatusLabel } from "../../lib/format";
import type { EmployeeRow } from "../../lib/types";

export function EmployeeCard({
  employee,
  selected,
  onSelect,
}: {
  employee: EmployeeRow;
  selected: boolean;
  onSelect: () => void;
}) {
  return (
    <button
      type="button"
      className={`emp-card${selected ? " selected" : ""}`}
      onClick={onSelect}
    >
      <div className="emp-card-head">
        <EmployeeAvatar name={employee.full_name} photoUrl={employee.photo_url} size={40} fontSize={14} />
        <div className="emp-card-text">
          <div className="emp-card-name">{employee.full_name}</div>
          <div className="emp-card-code">{employee.emp_code}</div>
        </div>
      </div>
      <div className="emp-card-meta">
        {employee.designations?.name ?? employee.designation ?? "—"}
        <br />
        {employee.branches?.name ?? "—"}
      </div>
      <div className="row-flex emp-card-status">
        <span className={`badge ${employeeStatusBadgeClass(employee.status)}`}>
          {employeeStatusLabel(employee.status)}
        </span>
      </div>
    </button>
  );
}
