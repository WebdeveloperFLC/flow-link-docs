import type { AppRole } from "@/lib/appRoles";
import {
  isPlatformOwner,
  roleIncludesAdmin,
  viewAsOptionsForUser,
  viewAsRoleLabel,
} from "@/lib/roleViewAs";
import {
  PERFORMANCE_WORKSPACE_SIDEBAR,
  PERFORMANCE_WORKSPACE_SUB_LINKS,
} from "@/incentives/lib/performanceWorkspaceNav";

export type PerformanceHubViewAsState = {
  role: AppRole | null;
  branchId: string | null;
  userId: string | null;
};

const STORAGE_PREFIX = "flc-ph-view-as";

export function performanceHubViewAsStorageKey(userId: string): string {
  return `${STORAGE_PREFIX}:${userId}`;
}

export function readPerformanceHubViewAs(userId: string): PerformanceHubViewAsState {
  try {
    const raw = sessionStorage.getItem(performanceHubViewAsStorageKey(userId));
    if (!raw) return { role: null, branchId: null, userId: null };
    const parsed = JSON.parse(raw) as Partial<PerformanceHubViewAsState>;
    return {
      role: (parsed.role as AppRole) ?? null,
      branchId: parsed.branchId ?? null,
      userId: parsed.userId ?? null,
    };
  } catch {
    return { role: null, branchId: null, userId: null };
  }
}

export function writePerformanceHubViewAs(userId: string, state: PerformanceHubViewAsState): void {
  try {
    if (!state.role) {
      sessionStorage.removeItem(performanceHubViewAsStorageKey(userId));
      return;
    }
    sessionStorage.setItem(performanceHubViewAsStorageKey(userId), JSON.stringify(state));
  } catch {
    /* noop */
  }
}

/** Performance Hub administrators who may use View As (preview layer only). */
export function canUsePerformanceHubViewAs(
  actualRoles: AppRole[],
  accountingRole: string | null | undefined,
): boolean {
  if (isPlatformOwner(actualRoles, accountingRole)) return true;
  return roleIncludesAdmin(actualRoles);
}

function normalizeRole(role: string): AppRole {
  return role === "administrator" ? "admin" : (role as AppRole);
}

/** Roles referenced by Performance workspace nav — not hardcoded labels. */
export function performanceHubPreviewRoleCatalog(): AppRole[] {
  const found = new Set<AppRole>();

  for (const item of PERFORMANCE_WORKSPACE_SIDEBAR) {
    item.roles?.forEach((r) => found.add(normalizeRole(r)));
  }

  for (const links of Object.values(PERFORMANCE_WORKSPACE_SUB_LINKS)) {
    for (const link of links) {
      link.roles?.forEach((r) => found.add(normalizeRole(r)));
    }
  }

  // Core hub personas always available for UAT when permitted by catalog filter
  for (const r of ["counselor", "manager", "director", "viewer", "telecaller", "commission_admin", "documentation"] as AppRole[]) {
    found.add(r);
  }

  return [...found].sort((a, b) => viewAsRoleLabel(a).localeCompare(viewAsRoleLabel(b)));
}

export function performanceHubViewAsRoleOptions(
  actualRoles: AppRole[],
  accountingRole: string | null | undefined,
  previewCatalog: AppRole[],
): AppRole[] {
  const hubCatalog = performanceHubPreviewRoleCatalog();
  const useFull = isPlatformOwner(actualRoles, accountingRole);
  const base = viewAsOptionsForUser(actualRoles, useFull, previewCatalog.length ? previewCatalog : hubCatalog);
  return base.filter((r) => hubCatalog.includes(normalizeRole(r)));
}

export function isPerformanceHubViewAsActive(state: PerformanceHubViewAsState): boolean {
  return state.role != null;
}
