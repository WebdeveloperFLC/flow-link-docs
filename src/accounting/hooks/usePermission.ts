import { useEffect, useSyncExternalStore } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import type { AccountingRole } from "../types/accountingUsers";
import { acctEmptyMap, AcctPermissionMap, ACCT_MODULES } from "../lib/accountingModulePermissions";

export type AcctSectionKey = string;
export type AcctLevel = "view" | "edit" | "delete";

interface PermStateData {
  loading: boolean;
  loaded: boolean;
  accountingUserId: string | null;
  role: AccountingRole | null;
  isAdmin: boolean;
  map: AcctPermissionMap;
}

type AccountingUserPermRow = {
  id: string;
  role: AccountingRole;
  status: string;
};

type ModulePermissionRow = {
  module: string;
  can_view: boolean | null;
  can_edit: boolean | null;
  can_delete: boolean | null;
};

function isAdminRole(role: AccountingRole | null) {
  return role === "SUPER_ADMIN" || role === "FINANCE_ADMIN";
}

let state: PermStateData = {
  loading: false,
  loaded: false,
  accountingUserId: null,
  role: null,
  isAdmin: false,
  map: acctEmptyMap(),
};
const listeners = new Set<() => void>();
function setState(patch: Partial<PermStateData>) {
  state = { ...state, ...patch };
  listeners.forEach((l) => l());
}
function subscribe(l: () => void) { listeners.add(l); return () => { listeners.delete(l); }; }
function getSnapshot() { return state; }

async function loadPermissions(authUserId: string) {
  if (state.loading) return;
  setState({ loading: true });
  try {
    const { data: rows } = await supabase
      .from("accounting_users" as never)
      .select("id, role, status")
      .eq("auth_user_id", authUserId)
      .limit(1);
    const row = (rows?.[0] ?? null) as AccountingUserPermRow | null;
    if (!row || row.status !== "ACTIVE") {
      setState({ loading: false, loaded: true, accountingUserId: null, role: null, isAdmin: false, map: acctEmptyMap() });
      return;
    }
    const role = row.role as AccountingRole;
    const admin = isAdminRole(role);
    const map = acctEmptyMap();
    if (admin) {
      for (const m of ACCT_MODULES) map[m.key] = { view: true, edit: true, delete: true };
      setState({ loading: false, loaded: true, accountingUserId: row.id, role, isAdmin: true, map });
      return;
    }
    const { data: perms } = await supabase
      .from("accounting_user_module_permissions" as never)
      .select("module, can_view, can_edit, can_delete")
      .eq("accounting_user_id", row.id);
    for (const p of ((perms ?? []) as unknown as ModulePermissionRow[])) {
      if (!map[p.module]) continue;
      map[p.module] = { view: !!p.can_view, edit: !!p.can_edit, delete: !!p.can_delete };
    }
    setState({ loading: false, loaded: true, accountingUserId: row.id, role, isAdmin: false, map });
  } catch {
    setState({ loading: false, loaded: true });
  }
}
function resetPermissions() {
  setState({ loading: false, loaded: false, accountingUserId: null, role: null, isAdmin: false, map: acctEmptyMap() });
}

function useStore() {
  return useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
}

/** Bootstraps permission load; safe to call from any top-level accounting screen. */
export function useAccountingPermissionsBootstrap() {
  const { user } = useAuth();
  const s = useStore();
  useEffect(() => {
    if (!user) { resetPermissions(); return; }
    if (!s.loaded) loadPermissions(user.id);
  }, [user, s.loaded]);
}

export function usePermission(section: AcctSectionKey, level: AcctLevel = "view") {
  useAccountingPermissionsBootstrap();
  const s = useStore();
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
  const s = useStore();
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
  setState({ loaded: false });
  return loadPermissions(authUserId);
}
