import type { AppRole } from "@/lib/appRoles";

/** Roles an Administrator can preview in the View-as switcher (matches Team & roles) */
export const PREVIEWABLE_APP_ROLES: AppRole[] = [
  "admin",
  "director",
  "manager",
  "counselor",
  "documentation",
  "telecaller",
  "viewer",
  "commission_admin",
  "client",
];

/** Labels aligned with Admin → Team & roles (Users.tsx) */
export function viewAsRoleLabel(role: AppRole): string {
  if (role === "counselor") return "Edit - Counselor";
  if (role === "documentation") return "Edit - Documentation";
  if (role === "admin" || role === "administrator") return "Administrator";
  if (role === "commission_admin") return "Commission admin";
  if (role === "telecaller") return "Telecaller";
  if (role === "viewer") return "Viewer";
  if (role === "manager") return "Branch manager";
  if (role === "director") return "Director";
  if (role === "client") return "Client portal";
  return role;
}

/** @deprecated use viewAsRoleLabel */
export const VIEW_AS_ROLE_LABELS: Record<AppRole, string> = {
  admin: viewAsRoleLabel("admin"),
  administrator: viewAsRoleLabel("administrator"),
  director: viewAsRoleLabel("director"),
  manager: viewAsRoleLabel("manager"),
  counselor: viewAsRoleLabel("counselor"),
  documentation: viewAsRoleLabel("documentation"),
  telecaller: viewAsRoleLabel("telecaller"),
  viewer: viewAsRoleLabel("viewer"),
  commission_admin: viewAsRoleLabel("commission_admin"),
  client: viewAsRoleLabel("client"),
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
    if (raw === "administrator") return "admin";
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
    return parsed
      .map((r) => (r === "administrator" ? "admin" : r))
      .filter((r): r is AppRole => PREVIEWABLE_APP_ROLES.includes(r as AppRole));
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

/** Administrator (or accounting owner) can preview any role in the catalog */
export function canPreviewAllRoles(
  actualRoles: AppRole[],
  isAccountingOwner: boolean,
): boolean {
  return (
    isAccountingOwner ||
    actualRoles.includes("admin") ||
    actualRoles.includes("administrator")
  );
}

/** @deprecated use canPreviewAllRoles */
export const isSuperRoleViewer = canPreviewAllRoles;

export function effectiveRolesForView(
  actualRoles: AppRole[],
  viewAsRole: AppRole | null,
): AppRole[] {
  if (viewAsRole) return [viewAsRole === "administrator" ? "admin" : viewAsRole];
  return actualRoles;
}

export function viewAsOptionsForUser(
  actualRoles: AppRole[],
  canPreviewAll: boolean,
  previewCatalog: AppRole[],
): AppRole[] {
  if (canPreviewAll) {
    const catalog = previewCatalog.length > 0 ? previewCatalog : PREVIEWABLE_APP_ROLES;
    return [...new Set(catalog.map((r) => (r === "administrator" ? "admin" : r)))];
  }
  const unique = [...new Set(actualRoles.map((r) => (r === "administrator" ? "admin" : r)))];
  return unique.sort((a, b) => viewAsRoleLabel(a).localeCompare(viewAsRoleLabel(b)));
}

export function canShowViewAsSwitcher(
  actualRoles: AppRole[],
  canPreviewAll: boolean,
): boolean {
  if (canPreviewAll) return true;
  return actualRoles.length > 1;
}

export function roleIncludesAdmin(roles: AppRole[]): boolean {
  return roles.includes("admin") || roles.includes("administrator");
}
