import { useSyncExternalStore } from "react";
import { supabase } from "@/integrations/supabase/client";
import { getAccounts } from "./coaStore";
import type { CoaAccount } from "../types/coa";
import { runWhenAuthReady } from "./_hydrationGate";

/**
 * Account role registry — decouples the journal engine from hard-coded COA
 * codes. A role (e.g. AR_STUDENT, TAX_OUTPUT_HST) resolves to a COA account
 * via accounting_account_roles, preferring an entity-specific mapping then a
 * global (entity_id NULL) fallback. The resolved code is matched against the
 * COA cache to obtain the postable account.
 */

export interface AccountRole {
  id: string;
  roleKey: string;
  entityId: string | null;
  accountCode: string;
  description?: string | null;
}

const STORAGE_KEY = "accounting:account-roles:v1";

let roles: AccountRole[] = (() => {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw) as AccountRole[];
  } catch {
    // ignore malformed cache
  }
  return [];
})();

const listeners = new Set<() => void>();
function emit() {
  try { window.localStorage.setItem(STORAGE_KEY, JSON.stringify(roles)); } catch {
    // ignore write failures
  }
  listeners.forEach((l) => l());
}

function fromDb(row: any): AccountRole {
  return {
    id: row.id,
    roleKey: row.role_key,
    entityId: row.entity_id ?? null,
    accountCode: row.account_code,
    description: row.description ?? null,
  };
}

async function hydrate() {
  try {
    const { data, error } = await supabase
      .from("accounting_account_roles")
      .select("*");
    if (error) throw error;
    if (data) { roles = data.map(fromDb); emit(); }
  } catch (e) {
    console.warn("[accountRolesStore] hydrate failed", e);
  }
}
runWhenAuthReady(hydrate);

export function useAccountRoles(): AccountRole[] {
  return useSyncExternalStore(
    (l) => { listeners.add(l); return () => listeners.delete(l); },
    () => roles,
    () => roles,
  );
}

export const getAccountRoles = () => roles;

/** Resolve a role to a COA account code, entity-specific then global. */
export function resolveRoleCode(roleKey: string, entityId?: string | null): string | undefined {
  const scoped = entityId
    ? roles.find((r) => r.roleKey === roleKey && r.entityId === entityId)
    : undefined;
  const global = roles.find((r) => r.roleKey === roleKey && (r.entityId === null || r.entityId === undefined));
  return (scoped ?? global)?.accountCode;
}

/** Resolve a role to a postable COA account (entity-specific code, entity-specific account, then global). */
export function resolveRoleAccount(roleKey: string, entityId?: string | null): CoaAccount | undefined {
  const code = resolveRoleCode(roleKey, entityId);
  if (!code) return undefined;
  const coa = getAccounts();
  const scoped = entityId ? coa.find((a) => a.code === code && a.entityId === entityId) : undefined;
  const global = coa.find((a) => a.code === code && (a.entityId === null || a.entityId === undefined));
  const anyMatch = coa.find((a) => a.code === code);
  return scoped ?? global ?? anyMatch;
}
