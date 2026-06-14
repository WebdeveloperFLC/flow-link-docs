import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import {
  ALL_HR_SCREENS,
  HR_ORG_ID,
  HR_PERM_LIST,
  HR_ROLE_LIST,
  type HrPerm,
  type HrRole,
  type HrScreenKey,
} from "../lib/constants";
import type { HrPerms, HrRolePermissionRow, PayrollCycleRow } from "../lib/types";
import { defaultPermsForRole, defaultScreensForRole } from "../lib/defaultAccess";
import { resetHrRolePermissions } from "../lib/hrApi";

type HrAccessContextValue = {
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

const HrAccessContext = createContext<HrAccessContextValue | null>(null);

function rowToPerms(row: HrRolePermissionRow | undefined): HrPerms {
  return {
    view: !!row?.can_view,
    apply: !!row?.can_apply,
    approve: !!row?.can_approve,
    override: !!row?.can_override,
    export: !!row?.can_export,
    configure: !!row?.can_configure,
    manageEmp: !!row?.can_manage_emp,
  };
}

function rowToScreens(row: HrRolePermissionRow | undefined): Record<HrScreenKey, boolean> {
  const s = row?.screens ?? {};
  return Object.fromEntries(ALL_HR_SCREENS.map((k) => [k, !!s[k]])) as Record<HrScreenKey, boolean>;
}

export function HrPayrollProvider({ children }: { children: ReactNode }) {
  const { user, isAdmin } = useAuth();
  const qc = useQueryClient();
  const [role, setRole] = useState<HrRole>("HR Manager");
  const [toast, setToast] = useState<string | null>(null);

  const fire = useCallback((msg: string) => {
    setToast(msg);
    window.setTimeout(() => setToast(null), 2600);
  }, []);

  const {
    data: permissions = [],
    isSuccess: dbReady,
    isLoading: permissionsLoading,
  } = useQuery({
    queryKey: ["hr-role-permissions", HR_ORG_ID],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("role_permissions" as never)
        .select("*")
        .eq("org_id", HR_ORG_ID);
      if (error) {
        console.warn("[HR] role_permissions:", error.message);
        return [] as HrRolePermissionRow[];
      }
      return (data ?? []) as HrRolePermissionRow[];
    },
    retry: false,
  });

  const { data: assignment } = useQuery({
    queryKey: ["hr-role-assignment", user?.id],
    enabled: !!user?.id && dbReady,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("role_assignments" as never)
        .select("role")
        .eq("org_id", HR_ORG_ID)
        .eq("staff_id", user!.id)
        .maybeSingle();
      if (error) throw error;
      return data as { role: HrRole } | null;
    },
    retry: false,
  });

  useEffect(() => {
    if (assignment?.role) setRole(assignment.role);
    else if (isAdmin) setRole("Admin");
  }, [assignment?.role, isAdmin]);

  const { data: cycle = null } = useQuery({
    queryKey: ["hr-payroll-cycle", HR_ORG_ID],
    enabled: !!user?.id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("payroll_cycles" as never)
        .select("*")
        .eq("org_id", HR_ORG_ID)
        .order("start_date", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (error) throw error;
      return data as PayrollCycleRow | null;
    },
    retry: false,
  });

  const { data: pendingCounts = {} } = useQuery({
    queryKey: ["hr-pending-counts", HR_ORG_ID],
    enabled: !!user?.id,
    queryFn: async () => {
      const tables = [
        ["leave", "leave_requests"],
        ["compoff", "compoff_requests"],
        ["late", "late_exemptions"],
        ["mispunch", "mispunch_requests"],
      ] as const;
      const out: Record<string, number> = {};
      for (const [key, table] of tables) {
        const { count, error } = await supabase
          .from(table as never)
          .select("*", { count: "exact", head: true })
          .eq("org_id", HR_ORG_ID)
          .eq("status", "Pending");
        if (!error) out[key] = count ?? 0;
      }
      return out;
    },
    retry: false,
  });

  const roleRow = useMemo(
    () => permissions.find((p) => p.role === role),
    [permissions, role],
  );

  const assignedRole: HrRole | null = assignment?.role ?? (isAdmin ? "Admin" : null);

  const assignedRoleRow = useMemo(
    () => (assignedRole ? permissions.find((p) => p.role === assignedRole) : undefined),
    [permissions, assignedRole],
  );

  const useFallbackAccess = permissions.length === 0 || !roleRow;
  const useFallbackActual =
    permissions.length === 0 || (assignedRole != null && !assignedRoleRow);

  const perms = useMemo(
    () => (useFallbackAccess ? defaultPermsForRole(role) : rowToPerms(roleRow)),
    [useFallbackAccess, role, roleRow],
  );
  const actualPerms = useMemo(
    () =>
      assignedRole == null
        ? { view: false, apply: false, approve: false, override: false, export: false, configure: false, manageEmp: false }
        : useFallbackActual
          ? defaultPermsForRole(assignedRole)
          : rowToPerms(assignedRoleRow),
    [assignedRole, useFallbackActual, assignedRoleRow],
  );
  const screens = useMemo(
    () => (useFallbackAccess ? defaultScreensForRole(role) : rowToScreens(roleRow)),
    [useFallbackAccess, role, roleRow],
  );

  const can = useCallback((p: HrPerm) => !!perms[p], [perms]);
  const actualCan = useCallback((p: HrPerm) => !!actualPerms[p], [actualPerms]);
  const canSee = useCallback((s: HrScreenKey) => !!screens[s], [screens]);

  const refreshPermissions = useCallback(() => {
    void qc.invalidateQueries({ queryKey: ["hr-role-permissions"] });
  }, [qc]);

  const updatePerm = useCallback(
    async (targetRole: HrRole, perm: HrPerm, val: boolean) => {
      const col = `can_${perm === "manageEmp" ? "manage_emp" : perm}` as keyof HrRolePermissionRow;
      const row = permissions.find((p) => p.role === targetRole);
      if (!row) return;
      if (perm === "configure" && !val) {
        const others = permissions.filter((p) => p.role !== targetRole).some((p) => p.can_configure);
        if (!others && row.can_configure) {
          fire("Locked — at least one role must keep Configure");
          return;
        }
      }
      const { error } = await supabase
        .from("role_permissions" as never)
        .update({ [col]: val } as never)
        .eq("id", row.id);
      if (error) {
        fire(error.message);
        return;
      }
      refreshPermissions();
      fire(`${targetRole}: ${perm} ${val ? "granted" : "revoked"}`);
    },
    [permissions, fire, refreshPermissions],
  );

  const updateScreen = useCallback(
    async (targetRole: HrRole, screen: HrScreenKey, val: boolean) => {
      const row = permissions.find((p) => p.role === targetRole);
      if (!row) return;
      const next = { ...row.screens, [screen]: val };
      const { error } = await supabase
        .from("role_permissions" as never)
        .update({ screens: next } as never)
        .eq("id", row.id);
      if (error) {
        fire(error.message);
        return;
      }
      refreshPermissions();
      fire(`${targetRole}: ${screen} ${val ? "shown" : "hidden"}`);
    },
    [permissions, fire, refreshPermissions],
  );

  const resetAccess = useCallback(async () => {
    try {
      await resetHrRolePermissions(HR_ORG_ID);
      refreshPermissions();
      fire("Role matrix reset to defaults");
    } catch (e) {
      fire(e instanceof Error ? e.message : "Reset failed — apply migration 11");
    }
  }, [fire, refreshPermissions]);

  const value: HrAccessContextValue = {
    orgId: HR_ORG_ID,
    role,
    assignedRole,
    setRole,
    perms,
    actualPerms,
    screens,
    can,
    actualCan,
    canSee,
    cycle,
    pendingCounts,
    toast,
    fire,
    dbReady,
    permissionsLoading,
    permissions,
    refreshPermissions,
    updatePerm,
    updateScreen,
    resetAccess,
  };

  return <HrAccessContext.Provider value={value}>{children}</HrAccessContext.Provider>;
}

export function useHrAccess() {
  const ctx = useContext(HrAccessContext);
  if (!ctx) throw new Error("useHrAccess must be used within HrPayrollProvider");
  return ctx;
}

export { HR_ROLE_LIST };
