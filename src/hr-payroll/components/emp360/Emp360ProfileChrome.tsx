import { Link, useMatch } from "react-router-dom";
import { EmployeeAvatar } from "../ui/EmployeeAvatar";
import { useEmp360Profile } from "../../context/Emp360ProfileContext";
import {
  displayEmployeeName,
  employeeStatusLabel,
} from "../../lib/format";
import { employmentTypeLabel } from "../../lib/emp360Filters";
import { EMP360_DETAIL_LABELS, type Emp360DetailSection } from "../../lib/emp360Paths";

export function Emp360ProfileChrome() {
  const { employee: emp, listBackHref, profileHref } = useEmp360Profile();

  const sectionMatch = useMatch("/hr/employee/:id/:section");
  const section = sectionMatch?.params.section as Emp360DetailSection | undefined;
  const sectionLabel = section ? EMP360_DETAIL_LABELS[section] : null;

  return (
    <>
      <div className="emp360-detail-top">
        {sectionLabel ? (
          <Link to={profileHref} className="btn btn-sm emp360-back-btn">
            ← Back to profile
          </Link>
        ) : (
          <Link to={listBackHref} className="btn btn-sm emp360-back-btn">
            ← Back to employee list
          </Link>
        )}
        {sectionLabel && (
          <span className="emp360-subview-title">{sectionLabel}</span>
        )}
      </div>

      {!sectionLabel && (
        <div className="card ess-hero emp360-profile-hero">
          <div className="ess-hero-inner">
            <EmployeeAvatar name={emp.full_name} photoUrl={emp.photo_url} size={96} fontSize={28} />
            <div className="ess-hero-main">
              <div className="ess-hero-title">{displayEmployeeName(emp)}</div>
              <div className="ess-hero-sub mono">{emp.emp_code}</div>
              <div className="ess-hero-sub">
                {emp.designations?.name ?? emp.designation} · {emp.departments?.name ?? emp.department} ·{" "}
                {emp.branches?.name ?? "—"}
              </div>
              <div className="ess-hero-tags">
                <span className={`ess-status ess-status--${emp.status === "Confirmed" ? "good" : "mut"}`}>
                  {employeeStatusLabel(emp.status)}
                </span>
                <span className="ess-chip">{employmentTypeLabel(emp)}</span>
                <span className="ess-chip">{emp.mobile ?? "—"}</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {sectionLabel && (
        <div className="card emp360-subview-hero">
          <div className="emp360-subview-hero-inner">
            <EmployeeAvatar name={emp.full_name} photoUrl={emp.photo_url} size={40} fontSize={14} />
            <div>
              <div className="strong">{displayEmployeeName(emp)}</div>
              <div className="muted mono" style={{ fontSize: 12 }}>{emp.emp_code}</div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
