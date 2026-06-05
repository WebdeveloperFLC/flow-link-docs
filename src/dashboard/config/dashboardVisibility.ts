import type { AppRole } from "@/contexts/AuthContext";

export type DashboardProfile = "admin" | "counselor" | "telecaller" | "commission_admin";

export type ExecutiveMode = "full" | "summary" | "revenue";
export type OperationsMode = "full" | "counselor" | "telecaller" | "none";

export type DashboardVisibility = {
  profile: DashboardProfile;
  executive: { mode: ExecutiveMode };
  operations: { enabled: boolean; mode: OperationsMode };
  modules: { enabled: boolean; defaultExpanded: string[] };
};

const HIGHER_THAN_TELECALLER: AppRole[] = [
  "admin",
  "administrator",
  "manager",
  "counselor",
  "documentation",
  "commission_admin",
];

export function resolveDashboardProfile(
  roles: AppRole[],
  opts: { isAdmin: boolean; isCommissionAdmin: boolean },
): DashboardProfile {
  if (opts.isAdmin || roles.includes("manager")) return "admin";
  if (opts.isCommissionAdmin || roles.includes("commission_admin")) return "commission_admin";
  if (roles.includes("telecaller") && !roles.some((r) => HIGHER_THAN_TELECALLER.includes(r))) return "telecaller";
  if (roles.includes("counselor") || roles.includes("documentation")) return "counselor";
  return "admin";
}

export function getDashboardVisibility(profile: DashboardProfile): DashboardVisibility {
  switch (profile) {
    case "counselor":
      return {
        profile,
        executive: { mode: "full" },
        operations: { enabled: true, mode: "counselor" },
        modules: { enabled: false, defaultExpanded: [] },
      };
    case "telecaller":
      return {
        profile,
        executive: { mode: "summary" },
        operations: { enabled: true, mode: "telecaller" },
        modules: { enabled: false, defaultExpanded: [] },
      };
    case "commission_admin":
      return {
        profile,
        executive: { mode: "revenue" },
        operations: { enabled: false, mode: "none" },
        modules: { enabled: true, defaultExpanded: ["institutions"] },
      };
    default:
      return {
        profile: "admin",
        executive: { mode: "full" },
        operations: { enabled: true, mode: "full" },
        modules: { enabled: true, defaultExpanded: [] },
      };
  }
}

export function profileLabel(profile: DashboardProfile): string {
  switch (profile) {
    case "counselor":
      return "Counselor view";
    case "telecaller":
      return "Telecaller view";
    case "commission_admin":
      return "Commission admin view";
    default:
      return "Manager view";
  }
}
