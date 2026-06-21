/** Demo org from seed migration — replace with real CRM org when wired. */
export const HR_ORG_ID = "00000000-0000-0000-0000-0000000000f1";

export const HR_ROLE_LIST = [
  "Super Admin",
  "Admin",
  "HR Manager",
  "HR Executive",
  "Manager",
  "Employee",
] as const;

export type HrRole = (typeof HR_ROLE_LIST)[number];

export const HR_PERM_LIST = [
  "view",
  "apply",
  "approve",
  "override",
  "export",
  "configure",
  "manageEmp",
] as const;

export type HrPerm = (typeof HR_PERM_LIST)[number];

export const HR_PERM_LABELS: Record<HrPerm, string> = {
  view: "View",
  apply: "Apply",
  approve: "Approve",
  override: "Override",
  export: "Export",
  configure: "Configure",
  manageEmp: "Manage Emp",
};

export const ALL_HR_SCREENS = [
  "dashboard",
  "ess",
  "emp360",
  "employees",
  "documents",
  "training",
  "attendance",
  "leave",
  "compoff",
  "late",
  "mispunch",
  "holiday",
  "payrollCycle",
  "calculator",
  "verify",
  "salaryRegister",
  "payrollHistory",
  "approvals",
  "reports",
  "config",
  "docTypes",
  "shifts",
  "roles",
  "audit",
] as const;

export type HrScreenKey = (typeof ALL_HR_SCREENS)[number];

export const HR_SCREEN_ROUTES: Record<HrScreenKey, string> = {
  dashboard: "/hr",
  ess: "/hr/me",
  emp360: "/hr/employee",
  employees: "/hr/employees",
  documents: "/hr/documents",
  training: "/hr/training",
  attendance: "/hr/attendance",
  leave: "/hr/leave",
  compoff: "/hr/attendance/compoff",
  late: "/hr/attendance/late",
  mispunch: "/hr/attendance/mispunch",
  holiday: "/hr/holidays",
  payrollCycle: "/hr/config/payroll-cycle",
  calculator: "/hr/payroll/process",
  verify: "/hr/payroll/verify",
  salaryRegister: "/hr/payroll/register",
  payrollHistory: "/hr/payroll/history",
  approvals: "/hr/approvals",
  reports: "/hr/reports",
  config: "/hr/config",
  docTypes: "/hr/config/document-types",
  shifts: "/hr/config/shifts",
  roles: "/hr/config/roles",
  audit: "/hr/config/audit",
};

export const HR_SCREEN_TITLES: Record<HrScreenKey, string> = {
  dashboard: "HR Dashboard",
  ess: "My Portal (ESS)",
  emp360: "Employee 360",
  employees: "Employee Master",
  documents: "Employee Documents",
  training: "Training & Development",
  attendance: "Attendance",
  leave: "Leave Management",
  compoff: "Comp-Off Management",
  late: "Late Coming",
  mispunch: "Mispunch Management",
  holiday: "Holiday Calendar",
  payrollCycle: "Payroll Cycle Management",
  calculator: "Payroll Processing",
  verify: "Payroll Verification",
  salaryRegister: "Salary Register",
  payrollHistory: "Payroll History",
  approvals: "Approval Center",
  reports: "Reports",
  config: "Configuration",
  docTypes: "Document Type Master",
  shifts: "Shift Master",
  roles: "Roles & Access",
  audit: "Audit Logs",
};

export const COMPANIES = [
  "Future Link Consultants Pvt Ltd",
  "Future Link Visa Consultants Pvt Ltd",
  "Future Link Academic Excellence Pvt Ltd",
  "Future Link System Inc",
  "Future Way Abroad",
  "Futureway Consultants Inc",
  "Ontario Inc 2709223",
  "Future Link Consultants Inc",
] as const;
export const MANAGERS = ["Santosh Sir", "S. Nair", "A. Verma", "CEO Office"] as const;

/** Active employment — included in operational lists (attendance, leave apply, dashboard headcount). */
export const EMPLOYEE_ACTIVE_STATUSES = ["On Probation", "Confirmed", "On Notice"] as const;

/** Inactive employment — excluded from active lists; retained for payroll history, reports, and audit. */
export const EMPLOYEE_INACTIVE_STATUSES = ["Resigned", "Terminated"] as const;

/** Status set by Employee Master deactivate (maps to inactive; no separate enum value). */
export const EMPLOYEE_DEACTIVATE_STATUS = "Terminated" as const;
