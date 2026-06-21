import type { HrScreenKey } from "./constants";

/** Enterprise HR Payroll module layout — single source for nav hubs and config sections. */
export type ConfigSection = {
  id: string;
  title: string;
  description: string;
  route: string;
  /** Screen permission required (defaults to config). */
  screen?: HrScreenKey;
  configureOnly?: boolean;
  /** CRM Masters section key — hub links to /masters instead of /hr/config */
  crmMaster?: "__branches" | "__departments" | "__designations";
};

export type ConfigCategory = {
  id: string;
  title: string;
  sections: ConfigSection[];
};

export const HR_CONFIG_CATEGORIES: ConfigCategory[] = [
  {
    id: "organization",
    title: "Organization",
    sections: [
      {
        id: "org-settings",
        title: "Organization Settings",
        description: "Company profile, payroll org, and global defaults",
        route: "/hr/config/org-settings",
        configureOnly: true,
      },
      {
        id: "branches",
        title: "Branch Master",
        description: "CRM shared — office locations used by HR, Leads, Clients, and Accounting",
        route: "/hr/config/branches",
        configureOnly: true,
        crmMaster: "__branches",
      },
      {
        id: "departments",
        title: "Department Master",
        description: "CRM shared — internal departments for Users and HR employee records",
        route: "/hr/config/departments",
        configureOnly: true,
        crmMaster: "__departments",
      },
      {
        id: "designations",
        title: "Designation Master",
        description: "CRM shared — job titles for Users and HR Payroll (single source)",
        route: "/hr/config/designations",
        configureOnly: true,
        crmMaster: "__designations",
      },
      {
        id: "categories",
        title: "Employee Category Master",
        description: "HR-specific — leave, accrual, attendance, and payroll rule groupings",
        route: "/hr/config/categories",
        configureOnly: true,
      },
    ],
  },
  {
    id: "attendance",
    title: "Attendance Setup",
    sections: [
      {
        id: "shifts",
        title: "Shift Master",
        description: "Login/logout, grace, break windows, weekly off — unlimited shifts",
        route: "/hr/config/shifts",
        screen: "shifts",
      },
      {
        id: "holidays",
        title: "Holiday Master",
        description: "Define holidays by branch and employee tags",
        route: "/hr/config/holidays",
        screen: "holiday",
        configureOnly: true,
      },
      {
        id: "attendance-rules",
        title: "Attendance Rule Engine",
        description: "Shift-driven status derivation — no hardcoded timings",
        route: "/hr/config/attendance-rules",
        configureOnly: true,
      },
    ],
  },
  {
    id: "leave",
    title: "Leave Setup",
    sections: [
      {
        id: "leave-policy",
        title: "Leave Policy Master",
        description: "Entitlements, notice, sick rules, sandwich & unauthorized leave",
        route: "/hr/config/leave",
        screen: "config",
      },
      {
        id: "leave-types",
        title: "Leave Type Master",
        description: "Casual, sick, unpaid and custom leave types",
        route: "/hr/config/leave-types",
        configureOnly: true,
      },
      {
        id: "leave-accrual",
        title: "Leave Accrual Rules",
        description: "Monthly accrual with eligibility validation",
        route: "/hr/config/leave-accrual",
        screen: "config",
      },
    ],
  },
  {
    id: "late",
    title: "Late Coming Setup",
    sections: [
      {
        id: "late-policy",
        title: "Late Coming Policy",
        description: "Deduction toggle, monthly free marks, slab grid, exemptions, and payroll impact",
        route: "/hr/config/late",
        screen: "config",
      },
    ],
  },
  {
    id: "mispunch",
    title: "Mispunch Setup",
    sections: [
      {
        id: "mispunch-policy",
        title: "Mispunch Policy",
        description: "Free mispunches per month, deduction rules, and approval chain",
        route: "/hr/config/mispunch",
        screen: "config",
      },
    ],
  },
  {
    id: "payroll",
    title: "Payroll Setup",
    sections: [
      {
        id: "payroll-policy",
        title: "Payroll Policy Master",
        description: "Cycle dates, payroll days, approval and release dates",
        route: "/hr/config/payroll-cycle",
        screen: "config",
      },
      {
        id: "salary-components",
        title: "Salary Components Master",
        description: "Earnings and deductions component structure",
        route: "/hr/config/salary-components",
        configureOnly: true,
      },
      {
        id: "earnings",
        title: "Earnings Master",
        description: "Basic, HRA, allowances and variable pay",
        route: "/hr/config/earnings",
        configureOnly: true,
      },
      {
        id: "deductions",
        title: "Deductions Master",
        description: "Statutory and voluntary deduction heads",
        route: "/hr/config/deductions",
        configureOnly: true,
      },
    ],
  },
  {
    id: "statutory",
    title: "Statutory Setup",
    sections: [
      {
        id: "pf",
        title: "PF Settings",
        description: "Provident fund rates and applicability",
        route: "/hr/config/pf",
        configureOnly: true,
      },
      {
        id: "esic",
        title: "ESIC Settings",
        description: "ESIC thresholds and employee/employer share",
        route: "/hr/config/esic",
        configureOnly: true,
      },
      {
        id: "professional-tax",
        title: "Professional Tax Settings",
        description: "State PT slabs and mandatory gross threshold",
        route: "/hr/config/professional-tax",
        screen: "config",
      },
      {
        id: "lwf",
        title: "LWF Settings",
        description: "Labour welfare fund configuration",
        route: "/hr/config/lwf",
        configureOnly: true,
      },
      {
        id: "tds",
        title: "TDS Settings",
        description: "Income tax deduction at source",
        route: "/hr/config/tds",
        configureOnly: true,
      },
      {
        id: "overtime",
        title: "Overtime Policy",
        description: "OT rate multiplier and minimum minutes",
        route: "/hr/config/overtime",
        screen: "config",
      },
      {
        id: "canada",
        title: "Canada Deductions",
        description: "CPP, EI and Canada payroll deductions",
        route: "/hr/config/canada",
        screen: "config",
      },
    ],
  },
  {
    id: "documents",
    title: "Document Setup",
    sections: [
      {
        id: "doc-types",
        title: "Document Type Master",
        description: "HR employee documents only — separate from CRM client document types",
        route: "/hr/config/document-types",
        screen: "docTypes",
      },
    ],
  },
  {
    id: "workflow",
    title: "Workflow Setup",
    sections: [
      {
        id: "approval-workflow",
        title: "Approval Workflow Master",
        description: "Manager → HR chains for leave, late, mispunch, comp-off",
        route: "/hr/config/workflow",
        screen: "config",
      },
      {
        id: "notifications",
        title: "Notification Rules",
        description: "HR alerts for over-break, unauthorized absence, and approvals",
        route: "/hr/config/notifications",
        configureOnly: true,
      },
    ],
  },
  {
    id: "security",
    title: "Security",
    sections: [
      {
        id: "roles",
        title: "Team & Roles",
        description: "HR in-module RBAC and permission matrix — CRM Users controls who can open HR",
        route: "/hr/config/roles",
        screen: "roles",
      },
    ],
  },
  {
    id: "system",
    title: "System",
    sections: [
      {
        id: "audit",
        title: "Audit Logs",
        description: "Policy, shift, payroll, leave, and configuration change history",
        route: "/hr/config/audit",
        screen: "audit",
      },
    ],
  },
];

export type ReportDefinition = {
  id: string;
  title: string;
  description: string;
  route: string;
};

export const HR_REPORTS: ReportDefinition[] = [
  { id: "employee", title: "Employee Report", description: "Active roster with master fields", route: "/hr/reports/employee" },
  { id: "attendance", title: "Attendance Report", description: "Daily/monthly attendance summary", route: "/hr/reports/attendance" },
  { id: "leave", title: "Leave Report", description: "Leave taken, balance, and sandwich days", route: "/hr/reports/leave" },
  { id: "late", title: "Late Coming Report", description: "Late marks, exemptions, and chargeable days", route: "/hr/reports/late" },
  { id: "mispunch", title: "Mispunch Report", description: "Mispunch requests and regularizations", route: "/hr/reports/mispunch" },
  { id: "holiday", title: "Holiday Report", description: "Holiday calendar by branch and tag", route: "/hr/reports/holiday" },
  { id: "payroll", title: "Payroll Report", description: "Cycle payroll summary and deductions", route: "/hr/reports/payroll" },
  { id: "salary-register", title: "Salary Register Report", description: "Full register with export", route: "/hr/reports/salary-register" },
  { id: "audit", title: "Audit Report", description: "Configuration and approval audit trail", route: "/hr/reports/audit" },
];

export type ApprovalTab = {
  id: string;
  title: string;
  route: string;
  pendingKey?: string;
};

export const HR_APPROVAL_TABS: ApprovalTab[] = [
  { id: "leave", title: "Leave", route: "/hr/approvals/leave", pendingKey: "leave" },
  { id: "late", title: "Late Coming", route: "/hr/approvals/late", pendingKey: "late" },
  { id: "mispunch", title: "Mispunch", route: "/hr/approvals/mispunch", pendingKey: "mispunch" },
  { id: "compoff", title: "Comp-Off", route: "/hr/approvals/compoff", pendingKey: "compoff" },
  { id: "payroll", title: "Payroll", route: "/hr/approvals/payroll" },
];

/** Maps /hr/config/:slug to HrConfigPage tab name. */
export const CONFIG_SLUG_TO_TAB: Record<string, string> = {
  "payroll-cycle": "Payroll Cycle",
  late: "Late Coming",
  mispunch: "Mispunch",
  leave: "Leave",
  "sandwich-ul": "Sandwich & UL",
  "professional-tax": "Professional Tax",
  overtime: "Overtime",
  canada: "Canada Deductions",
  workflow: "Workflow",
};
