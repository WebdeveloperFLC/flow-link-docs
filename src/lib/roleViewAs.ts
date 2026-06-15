import type { AppRole } from "@/lib/appRoles";

/** Roles a super admin / owner can preview in the View-as switcher */
export const PREVIEWABLE_APP_ROLES: AppRole[] = [
  "admin",
  "administrator",
  "director",
  "manager",
  "counselor",
  "documentation",
  "telecaller",
  "viewer",
  "commission_admin",
  "client",
];

export const VIEW_AS_ROLE_LABELS: Record<AppRole, string> = {
  admin: "Super admin",
  administrator: "Administrator",
  director: "Director",
  manager: "Branch manager",
  counselor: "Counselor",
  documentation: "Documentation",
  telecaller: "Telecaller",
  viewer: "Viewer",
  commission_admin: "Finance / commissions",
  client: "Client portal",
};

const SESSION_KEY = "flc-view-as-role";
const CATALOG_KEY = "flc-view-as-catalog";

export function viewAsSessionKey(userId: string): string {
  return `${SESSION_KEY}:${userId}`;
}

export function viewAsCatalogKey(userId: string): string {
  return `${CATALOG_KEY}:${userId}`;
}

export function readViewAsRole(userId: string): AppRole | null {
  try {
    const raw = sessionStorage.getItem(viewAsSessionKey(userId));
    if (!raw || raw === "__all__") return null;
    return PREVIEWABLE_APP_ROLES.includes(raw as AppRole) ? (raw as AppRole) : null;
  } catch {
    return null;
  }
}

export function writeViewAsRole(userId: string, role: AppRole | null): void {
  try {
    if (role) sessionStorage.setItem(viewAsSessionKey(userId), role);
    else sessionStorage.setItem(viewAsSessionKey(userId), "__all__");
  } catch {
    /* noop */
  }
}

export function readPreviewCatalog(userId: string): AppRole[] {
  try {
    const raw = localStorage.getItem(viewAsCatalogKey(userId));
    if (!raw) return [...PREVIEWABLE_APP_ROLES];
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [...PREVIEWABLE_APP_ROLES];
    return parsed.filter((r): r is AppRole => PREVIEWABLE_APP_ROLES.includes(r as AppRole));
  } catch {
    return [...PREVIEWABLE_APP_ROLES];
  }
}

export function writePreviewCatalog(userId: string, roles: AppRole[]): void {
  try {
    localStorage.setItem(viewAsCatalogKey(userId), JSON.stringify(roles));
  } catch {
    /* noop */
  }
}

export function isSuperRoleViewer(
  actualRoles: AppRole[],
  isAccountingSuperAdmin: boolean,
): boolean {
  return (
    isAccountingSuperAdmin ||
    actualRoles.includes("admin") ||
    actualRoles.includes("administrator")
  );
}

export function effectiveRolesForView(
  actualRoles: AppRole[],
  viewAsRole: AppRole | null,
): AppRole[] {
  if (viewAsRole) return [viewAsRole];
  return actualRoles;
}

export function viewAsOptionsForUser(
  actualRoles: AppRole[],
  isSuperViewer: boolean,
  previewCatalog: AppRole[],
): AppRole[] {
  if (isSuperViewer) {
    const catalog = previewCatalog.length > 0 ? previewCatalog : PREVIEWABLE_APP_ROLES;
    return catalog;
  }
  const unique = [...new Set(actualRoles)];
  return unique.sort((a, b) =>
    VIEW_AS_ROLE_LABELS[a].localeCompare(VIEW_AS_ROLE_LABELS[b]),
  );
}

export function canShowViewAsSwitcher(
  actualRoles: AppRole[],
  isSuperViewer: boolean,
): boolean {
  if (isSuperViewer) return true;
  return actualRoles.length > 1;
}

export function roleIncludesAdmin(roles: AppRole[]): boolean {
  return roles.includes("admin") || roles.includes("administrator");
}
