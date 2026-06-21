import type { HrScreenKey } from "./constants";

export type NavGroup = {
  grp: string;
  items: {
    k: HrScreenKey;
    ic: string;
    t: string;
    ct?: number;
  }[];
};

/** Enterprise HR Payroll sidebar — operational vs configuration separated. */
export const HR_NAV: NavGroup[] = [
  {
    grp: "Dashboard",
    items: [
      { k: "dashboard", ic: "◧", t: "Dashboard" },
      { k: "ess", ic: "◔", t: "My Portal (ESS)" },
    ],
  },
  {
    grp: "People",
    items: [
      { k: "employees", ic: "⊞", t: "Employee Master" },
      { k: "emp360", ic: "⊚", t: "Employee 360" },
      { k: "training", ic: "◵", t: "Training & Development" },
      { k: "documents", ic: "📎", t: "Employee Documents" },
    ],
  },
  {
    grp: "Workforce Management",
    items: [
      { k: "attendance", ic: "◰", t: "Attendance" },
      { k: "leave", ic: "⊟", t: "Leave Management" },
      { k: "holiday", ic: "◇", t: "Holiday Calendar" },
    ],
  },
  {
    grp: "Payroll",
    items: [
      { k: "calculator", ic: "∑", t: "Payroll Processing" },
      { k: "verify", ic: "▤", t: "Payroll Verification" },
      { k: "salaryRegister", ic: "▥", t: "Salary Register" },
      { k: "payrollHistory", ic: "◷", t: "Payroll History" },
    ],
  },
  {
    grp: "Approvals",
    items: [{ k: "approvals", ic: "✓", t: "Approval Center" }],
  },
  {
    grp: "Reports",
    items: [{ k: "reports", ic: "▦", t: "Reports" }],
  },
  {
    grp: "Configuration",
    items: [
      { k: "config", ic: "⚙", t: "Configuration" },
      { k: "roles", ic: "⊛", t: "Roles & Access" },
    ],
  },
];

export const HR_IMPORT_ROUTE = "/hr/import";

/** Resolve RBAC screen key from URL (sub-routes inherit parent hub permissions). */
export function screenKeyFromPath(pathname: string): HrScreenKey {
  if (pathname === "/hr" || pathname === "/hr/") return "dashboard";
  if (pathname.startsWith("/hr/me")) return "ess";
  if (pathname.startsWith("/hr/employees")) return "employees";
  if (pathname.startsWith("/hr/documents")) return "documents";
  if (pathname.startsWith("/hr/employee")) return "emp360";
  if (pathname.startsWith("/hr/training")) return "training";

  if (pathname.startsWith("/hr/approvals")) return "approvals";
  if (pathname.startsWith("/hr/reports")) return "reports";

  if (pathname.startsWith("/hr/payroll/cycle") || pathname.startsWith("/hr/config/payroll-cycle"))
    return "config";
  if (pathname.startsWith("/hr/payroll/process") || pathname.startsWith("/hr/calculator"))
    return "calculator";
  if (pathname.startsWith("/hr/payroll/register")) return "salaryRegister";
  if (pathname.startsWith("/hr/payroll/history")) return "payrollHistory";
  if (pathname.startsWith("/hr/payroll")) return "verify";

  if (pathname.startsWith("/hr/attendance/compoff")) return "compoff";
  if (pathname.startsWith("/hr/attendance/late")) return "late";
  if (pathname.startsWith("/hr/attendance/mispunch")) return "mispunch";
  if (pathname.startsWith("/hr/attendance")) return "attendance";
  if (pathname.startsWith("/hr/leave")) return "leave";
  if (pathname.startsWith("/hr/compoff")) return "compoff";
  if (pathname.startsWith("/hr/late")) return "late";
  if (pathname.startsWith("/hr/mispunch")) return "mispunch";
  if (pathname.startsWith("/hr/holidays")) return "holiday";

  if (pathname.startsWith("/hr/config/shifts") || pathname.startsWith("/hr/shifts")) return "shifts";
  if (pathname.startsWith("/hr/config/document-types") || pathname.startsWith("/hr/document-types"))
    return "docTypes";
  if (pathname.startsWith("/hr/config/roles") || pathname.startsWith("/hr/roles")) return "roles";
  if (pathname.startsWith("/hr/config/audit") || pathname.startsWith("/hr/audit")) return "audit";
  if (pathname.startsWith("/hr/config")) return "config";

  return "dashboard";
}

/** Total pending approvals badge for Approval Center nav item. */
export function totalPendingApprovals(counts: Record<string, number>): number {
  return (counts.leave ?? 0) + (counts.compoff ?? 0) + (counts.late ?? 0) + (counts.mispunch ?? 0) + (counts.training ?? 0);
}
