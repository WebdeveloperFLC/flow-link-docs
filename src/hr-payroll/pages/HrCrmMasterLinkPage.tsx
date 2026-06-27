import { Link } from "react-router-dom";

const COPY: Record<string, { title: string; description: string; note?: string }> = {
  branches: {
    title: "Branch Master",
    description: "Office locations are maintained once in CRM Masters and shared with HR Payroll, Leads, Clients, and Accounting.",
    note: "HR employee branch assignments use CRM branches (employees.branch_id → public.branches).",
  },
  departments: {
    title: "Department Master",
    description: "Internal departments are maintained in CRM Masters and referenced by Users and HR employee records.",
    note: "Do not maintain a separate HR department list — employee department_id links to public.departments.",
  },
  designations: {
    title: "Designation Master",
    description: "Job titles are shared between CRM Users and HR Payroll employee master.",
    note: "profiles.designation_id and employees.designation_id both reference public.designations.",
  },
};

export default function HrCrmMasterLinkPage({
  kind,
  backTo = "/hr/config",
}: {
  kind: keyof typeof COPY;
  backTo?: string;
}) {
  const meta = COPY[kind];
  const section = kind === "branches" ? "__branches" : kind === "departments" ? "__departments" : "__designations";

  return (
    <div className="grid" style={{ gap: 16 }}>
      <Link to={backTo} className="btn btn-sm" style={{ alignSelf: "flex-start" }}>
        ← Back
      </Link>
      <div className="card">
        <div className="card-h">
          <h3>{meta.title}</h3>
          <span className="tag">CRM Shared Master</span>
        </div>
        <div style={{ padding: "8px 20px 20px" }}>
          <p style={{ fontSize: 14, lineHeight: 1.55, marginBottom: 12 }}>{meta.description}</p>
          {meta.note && (
            <p className="muted" style={{ fontSize: 13, lineHeight: 1.5, marginBottom: 16 }}>{meta.note}</p>
          )}
          <Link to={`/masters?section=${section}`} className="btn btn-primary">
            Open in CRM Masters →
          </Link>
        </div>
      </div>
    </div>
  );
}
