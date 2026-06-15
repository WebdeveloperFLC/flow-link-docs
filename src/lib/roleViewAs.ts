import type { AppRole } from "@/lib/appRoles";

/**
 * Team-assignable roles in View-as (matches Admin → Team & roles).
 * `admin` = Administrator — for team members who manage the system, NOT the company owner.
 */
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

/** Label when not previewing a single role */
export function viewAsFullAccessLabel(isPlatformOwner: boolean, actualRoles: AppRole[]): string {
  if (isPlatformOwner) return "Owner (full access)";
  if (actualRoles.length === 1) return viewAsRoleLabel(actualRoles[0]);
  return "All my roles";
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

/** Minimum assigned roles (including admin) to treat CRM account as owner vs single-role team admin */
const OWNER_MULTI_ROLE_THRESHOLD = 3;

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

export function roleIncludesAdmin(roles: AppRole[]): boolean {
  return roles.includes("admin") || roles.includes("administrator");
}

/**
 * Company owner — full View-as catalog and "Owner (full access)" default.
 * Team Administrator (`admin` role alone) is NOT the owner.
 */
export function isPlatformOwner(
  actualRoles: AppRole[],
  accountingRole: string | null | undefined,
): boolean {
  if (accountingRole === "SUPER_ADMIN") return true;
  return roleIncludesAdmin(actualRoles) && actualRoles.length >= OWNER_MULTI_ROLE_THRESHOLD;
}

/** Owner can preview any role; team admin only switches among roles assigned to them */
export function canUseFullPreviewCatalog(
  actualRoles: AppRole[],
  accountingRole: string | null | undefined,
): boolean {
  return isPlatformOwner(actualRoles, accountingRole);
}

/** @deprecated use canUseFullPreviewCatalog */
export function canPreviewAllRoles(
  actualRoles: AppRole[],
  accountingRole: string | null | undefined,
): boolean {
  return canUseFullPreviewCatalog(actualRoles, accountingRole);
}

/** @deprecated use canUseFullPreviewCatalog */
export const isSuperRoleViewer = canUseFullPreviewCatalog;

export function effectiveRolesForView(
  actualRoles: AppRole[],
  viewAsRole: AppRole | null,
): AppRole[] {
  if (viewAsRole) return [viewAsRole === "administrator" ? "admin" : viewAsRole];
  return actualRoles;
}

export function viewAsOptionsForUser(
  actualRoles: AppRole[],
  useFullCatalog: boolean,
  previewCatalog: AppRole[],
): AppRole[] {
  if (useFullCatalog) {
    const catalog = previewCatalog.length > 0 ? previewCatalog : PREVIEWABLE_APP_ROLES;
    return [...new Set(catalog.map((r) => (r === "administrator" ? "admin" : r)))];
  }
  const unique = [...new Set(actualRoles.map((r) => (r === "administrator" ? "admin" : r)))];
  return unique.sort((a, b) => viewAsRoleLabel(a).localeCompare(viewAsRoleLabel(b)));
}

export function canShowViewAsSwitcher(
  actualRoles: AppRole[],
  useFullCatalog: boolean,
): boolean {
  if (useFullCatalog) return true;
  return actualRoles.length > 1;
}

export function isViewAsRoleAllowed(
  role: AppRole,
  actualRoles: AppRole[],
  useFullCatalog: boolean,
): boolean {
  if (!role) return true;
  const normalized = role === "administrator" ? "admin" : role;
  if (useFullCatalog) {
    return PREVIEWABLE_APP_ROLES.includes(normalized);
  }
  return actualRoles.some((r) => (r === "administrator" ? "admin" : r) === normalized);
}
