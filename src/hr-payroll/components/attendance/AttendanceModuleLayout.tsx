import { Navigate, Outlet } from "react-router-dom";
import { HrSectionTabs } from "../ui/HrSectionTabs";

const ATTENDANCE_TABS = [
  { id: "records", label: "Attendance Records", route: "/hr/attendance/records" },
  { id: "exceptions", label: "Exception Queue", route: "/hr/attendance/exceptions" },
  { id: "compoff", label: "Comp-Off Management", route: "/hr/attendance/compoff" },
  { id: "late", label: "Late Coming", route: "/hr/attendance/late" },
  { id: "mispunch", label: "Mispunch Management", route: "/hr/attendance/mispunch" },
];

export function AttendanceModuleLayout() {
  return (
    <div className="page-grid">
      <div className="card card-wash">
        <div style={{ fontSize: 13.5, color: "var(--ink-soft)", lineHeight: 1.55 }}>
          Attendance operations — daily records, comp-off, late exemptions, and mispunch requests in one
          module.
        </div>
      </div>
      <HrSectionTabs tabs={ATTENDANCE_TABS} />
      <Outlet />
    </div>
  );
}

export function AttendanceIndexRedirect() {
  return <Navigate to="/hr/attendance/records" replace />;
}
