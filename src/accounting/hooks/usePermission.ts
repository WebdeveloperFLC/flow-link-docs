import { useEffect } from "react";
import { create } from "zustand";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import type { AccountingRole } from "../types/accountingUsers";
import { acctEmptyMap, AcctPermissionMap, ACCT_MODULES } from "../lib/accountingModulePermissions";

export type AcctSectionKey = string;
export type AcctLevel = "view" | "edit" | "delete";

interface PermState {
  loading: boolean;
  loaded: boolean;
  accountingUserId: string | null;
  role: AccountingRole | null;
  isAdmin: boolean;
  map: AcctPermissionMap;
  load: (authUserId: string) => Promise<void>;
  reset: () => void;
}

function isAdminRole(role: AccountingRole | null) {
  return role === "SUPER_ADMIN" || role === "FINANCE_ADMIN";
}

export const useAccountingPermissionsStore = create<PermState>((set, get) => ({
  loading: false,
  loaded: false,
  accountingUserId: null,
  role: null,
  isAdmin: false,
  map: acctEmptyMap(),
  reset: () =>
    set({ loading: false, loaded: false, accountingUserId: null, role: null, isAdmin: false, map: acctEmptyMap() }),
  load: async (authUserId: string) => {
    if (get().loading) return;
    set({ loading: true });
    try {
      const { data: rows } = await supabase
        .from("accounting_users" as any)
        .select("id, role, status")
        .eq("auth_user_id", authUserId)
        .limit(1);
      const row: any = rows?.[0];
      if (!row || row.status !== "ACTIVE") {
        set({ loading: false, loaded: true, accountingUserId: null, role: null, isAdmin: false, map: acctEmptyMap() });
        return;
      }
      const role = row.role as AccountingRole;
      const admin = isAdminRole(role);
      const map = acctEmptyMap();
      if (admin) {
        for (const m of ACCT_MODULES) map[m.key] = { view: true, edit: true, delete: true };
        set({ loading: false, loaded: true, accountingUserId: row.id, role, isAdmin: true, map });
        return;
      }
      const { data: perms } = await supabase
        .from("accounting_user_module_permissions" as any)
        .select("module, can_view, can_edit, can_delete")
        .eq("accounting_user_id", row.id);
      for (const p of (perms ?? []) as any[]) {
        if (!map[p.module]) continue;
        map[p.module] = { view: !!p.can_view, edit: !!p.can_edit, delete: !!p.can_delete };
      }
      set({ loading: false, loaded: true, accountingUserId: row.id, role, isAdmin: false, map });
    } catch {
      set({ loading: false, loaded: true });
    }
  },
}));

/** Bootstraps permission load; safe to call from any top-level accounting screen. */
export function useAccountingPermissionsBootstrap() {
  const { user } = useAuth();
  const load = useAccountingPermissionsStore((s) => s.load);
  const reset = useAccountingPermissionsStore((s) => s.reset);
  const loaded = useAccountingPermissionsStore((s) => s.loaded);
  useEffect(() => {
    if (!user) { reset(); return; }
    if (!loaded) load(user.id);
  }, [user, loaded, load, reset]);
}

export function usePermission(section: AcctSectionKey, level: AcctLevel = "view") {
  useAccountingPermissionsBootstrap();
  const s = useAccountingPermissionsStore();
  const entry = s.map[section] ?? { view: false, edit: false, delete: false };
  let allowed = false;
  if (s.isAdmin) allowed = true;
  else if (level === "view") allowed = entry.view;
  else if (level === "edit") allowed = entry.edit;
  else if (level === "delete") allowed = entry.delete;
  return { allowed, loading: s.loading || !s.loaded };
}

export function useCan() {
  useAccountingPermissionsBootstrap();
  const s = useAccountingPermissionsStore();
  return {
    can: (section: AcctSectionKey, level: AcctLevel = "view") => {
      if (s.isAdmin) return true;
      const e = s.map[section];
      if (!e) return false;
      return level === "view" ? e.view : level === "edit" ? e.edit : e.delete;
    },
    isAdmin: s.isAdmin,
    loading: s.loading || !s.loaded,
  };
}

/** Force refresh, e.g. after the admin matrix saves changes. */
export function refreshAccountingPermissions(authUserId: string) {
  useAccountingPermissionsStore.setState({ loaded: false });
  return useAccountingPermissionsStore.getState().load(authUserId);
}
