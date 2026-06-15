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

export const HR_NAV: NavGroup[] = [
  {
    grp: "Workspace",
    items: [
      { k: "dashboard", ic: "◧", t: "Payroll Dashboard" },
      { k: "ess", ic: "◔", t: "My Portal (ESS)" },
      { k: "emp360", ic: "⊚", t: "Employee 360°" },
    ],
  },
  {
    grp: "People",
    items: [
      { k: "employees", ic: "⊞", t: "Employee Master" },
      { k: "shifts", ic: "◐", t: "Shift Management" },
      { k: "training", ic: "◵", t: "Training" },
    ],
  },
  {
    grp: "Payroll",
    items: [
      { k: "calculator", ic: "∑", t: "Payable Days Engine" },
      { k: "verify", ic: "▤", t: "Payroll Verification" },
    ],
  },
  {
    grp: "Time & Attendance",
    items: [
      { k: "attendance", ic: "◰", t: "Attendance" },
      { k: "leave", ic: "⊟", t: "Leave" },
      { k: "compoff", ic: "⇄", t: "Comp-Off" },
      { k: "late", ic: "◷", t: "Late Coming" },
      { k: "mispunch", ic: "⊠", t: "Mispunch" },
      { k: "holiday", ic: "◇", t: "Holidays" },
    ],
  },
  {
    grp: "Configuration",
    items: [
      { k: "config", ic: "⚙", t: "Payroll & Policy" },
      { k: "docTypes", ic: "📄", t: "Document Master" },
      { k: "roles", ic: "⊕", t: "Team & Roles" },
      { k: "audit", ic: "≡", t: "Audit Logs" },
    ],
  },
];

/** Extra route not in ALL_HR_SCREENS — linked from Config in app */
export const HR_IMPORT_ROUTE = "/hr/import";

export function screenKeyFromPath(pathname: string): HrScreenKey {
  if (pathname === "/hr" || pathname === "/hr/") return "dashboard";
  if (pathname.startsWith("/hr/me")) return "ess";
  if (pathname.startsWith("/hr/employees")) return "employees";
  if (pathname.startsWith("/hr/document-types")) return "docTypes";
  if (pathname.startsWith("/hr/employee")) return "emp360";
  if (pathname.startsWith("/hr/shifts")) return "shifts";
  if (pathname.startsWith("/hr/training")) return "training";
  if (pathname.startsWith("/hr/calculator")) return "calculator";
  if (pathname.startsWith("/hr/payroll")) return "verify";
  if (pathname.startsWith("/hr/attendance")) return "attendance";
  if (pathname.startsWith("/hr/leave")) return "leave";
  if (pathname.startsWith("/hr/compoff")) return "compoff";
  if (pathname.startsWith("/hr/late")) return "late";
  if (pathname.startsWith("/hr/mispunch")) return "mispunch";
  if (pathname.startsWith("/hr/holidays")) return "holiday";
  if (pathname.startsWith("/hr/config")) return "config";
  if (pathname.startsWith("/hr/roles")) return "roles";
  if (pathname.startsWith("/hr/audit")) return "audit";
  return "dashboard";
}
