import { Link } from "react-router-dom";
import { HrHubGrid } from "../components/ui/HrHubGrid";

const ADMIN_SECTIONS = [
  {
    title: "Master Data Administration",
    description: "Organization, employment, attendance, leave, payroll, compliance, holiday, and document masters",
    route: "/hr/admin/master-data",
  },
  {
    title: "Workforce Policy Management System",
    description: "Policy bundles — attendance, leave, payroll, salary template, bonus, holiday calendar",
    route: "/hr/admin/wpms",
  },
  {
    title: "Configuration Hub",
    description: "Legacy operational policy editors (shift, leave rules, statutory)",
    route: "/hr/config",
  },
  {
    title: "Roles & Access",
    description: "HR permission matrix and CRM role sync",
    route: "/hr/config/roles",
  },
  {
    title: "Audit Logs",
    description: "Configuration and WPMS change history",
    route: "/hr/config/audit",
  },
];

export default function HrAdminHubPage() {
  return (
    <div className="grid" style={{ gap: 16 }}>
      <Link to="/hr" className="btn btn-sm" style={{ alignSelf: "flex-start" }}>← HR Dashboard</Link>
      <div className="card">
        <div className="card-h">
          <h3>Administration</h3>
          <span className="tag">HR & Workforce</span>
        </div>
        <p className="muted" style={{ fontSize: 13, padding: "0 20px 16px", lineHeight: 1.5 }}>
          Master data and workforce policy bundles. Operational attendance, leave, and payroll processing remain in their respective modules.
        </p>
        <div style={{ padding: "0 20px 20px" }}>
          <HrHubGrid cards={ADMIN_SECTIONS} />
        </div>
      </div>
    </div>
  );
}
