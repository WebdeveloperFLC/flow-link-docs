export type CmsCapability = "F" | "E" | "C" | "A" | "R" | "-";

export interface CmsPermissionModule {
  id: string;
  label: string;
}

export interface CmsPermissionRole {
  id: string;
  title: string;
  subtitle: string;
  initials: string;
  color: string;
}

export interface CmsCapabilityMeta {
  code: CmsCapability;
  label: string;
  className: string;
}

export const CMS_PERMISSION_MODULES: CmsPermissionModule[] = [
  { id: "wallets", label: "Discount Wallets" },
  { id: "offers", label: "Offer Management" },
  { id: "promotions", label: "Promotion Requests" },
  { id: "incentives", label: "Incentives" },
  { id: "commissions", label: "Commissions" },
  { id: "currency", label: "Multi-Currency" },
  { id: "dashboards", label: "Dashboards" },
  { id: "reporting", label: "Reporting" },
  { id: "approvals", label: "Approvals" },
  { id: "audit", label: "Audit Log" },
  { id: "config", label: "System Config" },
];

export const CMS_PERMISSION_ROLES: CmsPermissionRole[] = [
  { id: "super", title: "Super Admin", subtitle: "Full system control", initials: "SA", color: "#062a48" },
  { id: "admin", title: "Admin", subtitle: "Configuration & settings", initials: "AD", color: "#005BA4" },
  { id: "regional", title: "Regional Manager", subtitle: "Multi-branch oversight", initials: "RM", color: "#2284C5" },
  { id: "branch", title: "Branch Manager", subtitle: "Branch commercial ops", initials: "BM", color: "#0f8a8a" },
  { id: "lead", title: "Team Leader", subtitle: "Pod lead & approvals", initials: "TL", color: "#6b4cc4" },
  { id: "counselor", title: "Counselor", subtitle: "Client-facing discounts", initials: "CO", color: "#c98a00" },
  { id: "visa", title: "Visa Officer", subtitle: "Permits & allied services", initials: "VO", color: "#1f9d63" },
  { id: "finance", title: "Finance", subtitle: "Revenue & commissions", initials: "FI", color: "#c4131b" },
];

/** FLC CMS spec §3 — default capability matrix (governance reference). */
export const CMS_PERMISSION_MATRIX: Record<string, CmsCapability[]> = {
  super: ["F", "F", "F", "F", "F", "F", "F", "F", "F", "F", "F"],
  admin: ["F", "F", "F", "F", "F", "F", "F", "F", "A", "R", "F"],
  regional: ["F", "F", "A", "E", "F", "R", "F", "F", "A", "R", "-"],
  branch: ["E", "E", "C", "R", "R", "R", "F", "F", "A", "R", "-"],
  lead: ["E", "C", "C", "R", "-", "-", "R", "R", "-", "-", "-"],
  counselor: ["R", "R", "C", "R", "-", "-", "R", "R", "-", "-", "-"],
  visa: ["R", "R", "-", "R", "-", "-", "R", "R", "-", "-", "-"],
  finance: ["R", "R", "R", "E", "F", "F", "R", "F", "A", "R", "-"],
};

export const CMS_CAPABILITY_META: Record<CmsCapability, CmsCapabilityMeta> = {
  F: { code: "F", label: "Full", className: "bg-emerald-100 text-emerald-800 border-emerald-200" },
  E: { code: "E", label: "Edit", className: "bg-sky-100 text-sky-800 border-sky-200" },
  C: { code: "C", label: "Create", className: "bg-teal-100 text-teal-800 border-teal-200" },
  A: { code: "A", label: "Approve", className: "bg-violet-100 text-violet-800 border-violet-200" },
  R: { code: "R", label: "Read", className: "bg-amber-100 text-amber-800 border-amber-200" },
  "-": { code: "-", label: "None", className: "bg-muted text-muted-foreground border-border" },
};

export interface RolesPermissionsKpis {
  roles: number;
  modules: number;
  capabilities: number;
  fullAccessCells: number;
}

export function capabilityMeta(code: CmsCapability): CmsCapabilityMeta {
  return CMS_CAPABILITY_META[code];
}

export function matrixRow(roleId: string): CmsCapability[] {
  return CMS_PERMISSION_MATRIX[roleId] ?? CMS_PERMISSION_MODULES.map(() => "-");
}

export function rolesPermissionsKpis(): RolesPermissionsKpis {
  const cells = Object.values(CMS_PERMISSION_MATRIX).flat();
  return {
    roles: CMS_PERMISSION_ROLES.length,
    modules: CMS_PERMISSION_MODULES.length,
    capabilities: Object.keys(CMS_CAPABILITY_META).length - 1,
    fullAccessCells: cells.filter((c) => c === "F").length,
  };
}

export function mapAuthRolesToCmsRole(roles: string[], isAdmin: boolean): string | null {
  if (isAdmin) return roles.includes("administrator") ? "super" : "admin";
  if (roles.includes("director")) return "regional";
  if (roles.includes("manager")) return "branch";
  if (roles.includes("commission_admin")) return "finance";
  if (roles.includes("documentation")) return "visa";
  if (roles.includes("counselor")) return "counselor";
  if (roles.includes("viewer")) return "counselor";
  return null;
}

export function roleById(roleId: string): CmsPermissionRole | undefined {
  return CMS_PERMISSION_ROLES.find((r) => r.id === roleId);
}

export function countCapabilitiesForRole(roleId: string): Record<CmsCapability, number> {
  const counts: Record<CmsCapability, number> = { F: 0, E: 0, C: 0, A: 0, R: 0, "-": 0 };
  for (const code of matrixRow(roleId)) counts[code] += 1;
  return counts;
}
