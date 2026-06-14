import { createContext, useContext } from "react";
import type { HrPerm, HrRole, HrScreenKey } from "../lib/constants";
import type { HrPerms, HrRolePermissionRow, PayrollCycleRow } from "../lib/types";

export type HrAccessContextValue = {
  orgId: string;
  role: HrRole;
  assignedRole: HrRole | null;
  setRole: (r: HrRole) => void;
  perms: HrPerms;
  actualPerms: HrPerms;
  screens: Record<HrScreenKey, boolean>;
  can: (p: HrPerm) => boolean;
  actualCan: (p: HrPerm) => boolean;
  canSee: (s: HrScreenKey) => boolean;
  cycle: PayrollCycleRow | null;
  pendingCounts: Record<string, number>;
  toast: string | null;
  fire: (msg: string) => void;
  dbReady: boolean;
  permissionsLoading: boolean;
  permissions: HrRolePermissionRow[];
  refreshPermissions: () => void;
  updatePerm: (role: HrRole, perm: HrPerm, val: boolean) => Promise<void>;
  updateScreen: (role: HrRole, screen: HrScreenKey, val: boolean) => Promise<void>;
  resetAccess: () => Promise<void>;
};

export const HrAccessContext = createContext<HrAccessContextValue | null>(null);

export function useHrAccess() {
  const ctx = useContext(HrAccessContext);
  if (!ctx) throw new Error("useHrAccess must be used within HrPayrollProvider");
  return ctx;
}
