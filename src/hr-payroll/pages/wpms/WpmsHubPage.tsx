import { Link } from "react-router-dom";
import { HrHubGrid } from "../../components/ui/HrHubGrid";

export default function WpmsHubPage() {
  return (
    <div className="grid" style={{ gap: 16 }}>
      <Link to="/hr/admin" className="btn btn-sm" style={{ alignSelf: "flex-start" }}>← Administration</Link>
      <div className="card">
        <div className="card-h">
          <h3>Workforce Policy Management System</h3>
          <span className="tag">WPMS</span>
        </div>
        <p className="muted" style={{ fontSize: 13, padding: "0 20px 16px", lineHeight: 1.5 }}>
          Policy bundles combine attendance, leave, payroll, salary template, bonus, and holiday calendar policies.
          Each employee receives <strong>one bundle</strong> — assignment history is never overwritten.
        </p>
        <div style={{ padding: "0 20px 20px" }}>
          <HrHubGrid
            cards={[
              { title: "Policies", description: "Versioned attendance, leave, payroll, salary, bonus, holiday policies", route: "/hr/admin/wpms/policies" },
              { title: "Policy Bundles", description: "India Standard, Canada Ontario, Consultant, Legacy, …", route: "/hr/admin/wpms/bundles" },
              { title: "Bundle Assignment", description: "Assign to employee, department, branch, or bulk with preview", route: "/hr/admin/wpms/assign" },
            ]}
          />
        </div>
      </div>
    </div>
  );
}
