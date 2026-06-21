import { Link, useParams } from "react-router-dom";
import HrConfigPage, { type HrConfigTab } from "./HrConfigPage";
import { CONFIG_SLUG_TO_TAB } from "../lib/moduleStructure";

const PLACEHOLDER_COPY: Record<string, { title: string; description: string }> = {
  "org-settings": {
    title: "Organization Settings",
    description: "Company legal name, payroll org ID, and global HR defaults.",
  },
  branches: {
    title: "Branch Master",
    description: "Branches are managed via reference data — linked from Employee Master.",
  },
  departments: {
    title: "Department Master",
    description: "Department list used in employee records and filters.",
  },
  designations: {
    title: "Designation Master",
    description: "Job titles and reporting hierarchy.",
  },
  categories: {
    title: "Employee Category Master",
    description: "Employment categories for leave and holiday eligibility.",
  },
  "attendance-rules": {
    title: "Attendance Rule Engine",
    description: "Shift-driven status derivation — wired from Shift Master and SQL engine.",
  },
  "leave-types": {
    title: "Leave Type Master",
    description: "Casual, Sick, and Unpaid leave types with policy bindings.",
  },
  "leave-accrual": {
    title: "Leave Accrual Rules",
    description: "Monthly accrual with eligibility validation before credit.",
  },
  "salary-components": {
    title: "Salary Components Master",
    description: "Component structure for earnings and deductions.",
  },
  earnings: { title: "Earnings Master", description: "Basic, HRA, allowances, and variable pay heads." },
  deductions: { title: "Deductions Master", description: "Voluntary and employer deduction heads." },
  pf: { title: "PF Settings", description: "Provident fund rates and wage ceiling." },
  esic: { title: "ESIC Settings", description: "ESIC applicability and contribution rates." },
  lwf: { title: "LWF Settings", description: "Labour welfare fund by state." },
  tds: { title: "TDS Settings", description: "Tax deduction at source configuration." },
  notifications: {
    title: "Notification Rules",
    description: "HR alerts for over-break, unauthorized absence, and pending approvals.",
  },
};

export function HrConfigPlaceholderPage({ slug }: { slug: string }) {
  const meta = PLACEHOLDER_COPY[slug] ?? {
    title: slug.replace(/-/g, " "),
    description: "Configuration section — implementation in progress.",
  };

  return (
    <div className="grid" style={{ gap: 16 }}>
      <Link to="/hr/config" className="btn btn-sm" style={{ alignSelf: "flex-start" }}>
        ← Configuration hub
      </Link>
      <div className="card">
        <div className="card-h">
          <h3>{meta.title}</h3>
          <span className="tag">Configuration</span>
        </div>
        <div className="empty">
          <div className="ico">⚙</div>
          <div style={{ fontSize: 15, fontWeight: 600, color: "var(--ink)", marginBottom: 6 }}>
            {meta.title}
          </div>
          <div style={{ fontSize: 13, maxWidth: 480, margin: "0 auto" }}>{meta.description}</div>
        </div>
      </div>
    </div>
  );
}

export default function HrConfigPolicyRoute() {
  const { slug = "" } = useParams<{ slug: string }>();
  const tabName = CONFIG_SLUG_TO_TAB[slug];

  if (tabName) {
    return <HrConfigPage initialTab={tabName as HrConfigTab} />;
  }

  return <HrConfigPlaceholderPage slug={slug} />;
}
