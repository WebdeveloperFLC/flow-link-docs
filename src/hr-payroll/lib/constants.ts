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
  "shifts",
  "training",
  "calculator",
  "verify",
  "attendance",
  "leave",
  "compoff",
  "late",
  "mispunch",
  "holiday",
  "config",
  "roles",
  "audit",
] as const;

export type HrScreenKey = (typeof ALL_HR_SCREENS)[number];

export const HR_SCREEN_ROUTES: Record<HrScreenKey, string> = {
  dashboard: "/hr",
  ess: "/hr/me",
  emp360: "/hr/employee",
  employees: "/hr/employees",
  shifts: "/hr/shifts",
  training: "/hr/training",
  calculator: "/hr/calculator",
  verify: "/hr/payroll",
  attendance: "/hr/attendance",
  leave: "/hr/leave",
  compoff: "/hr/compoff",
  late: "/hr/late",
  mispunch: "/hr/mispunch",
  holiday: "/hr/holidays",
  config: "/hr/config",
  roles: "/hr/roles",
  audit: "/hr/audit",
};

export const HR_SCREEN_TITLES: Record<HrScreenKey, string> = {
  dashboard: "Payroll Dashboard",
  ess: "Employee Self-Service",
  emp360: "Employee 360° View",
  employees: "Employee Master",
  shifts: "Shift Management",
  training: "Training Management",
  calculator: "Payable Days Engine",
  verify: "Payroll Verification",
  attendance: "Attendance",
  leave: "Leave Management",
  compoff: "Comp-Off Management",
  late: "Late Coming",
  mispunch: "Mispunch Regularization",
  holiday: "Holiday Management",
  config: "Payroll & Policy Configuration",
  roles: "Role Based Access",
  audit: "Audit Logs",
};

export const DEPARTMENTS = ["Counselling", "IELTS Training", "Documentation", "Operations"] as const;
export const BRANCHES = ["Vadodara", "Ahmedabad", "Surat"] as const;
export const COMPANIES = ["FL Pvt. Ltd.", "FL Academic"] as const;
export const MANAGERS = ["Santosh Sir", "S. Nair", "A. Verma", "CEO Office"] as const;
