import { useSyncExternalStore } from "react";
import { CoaAccount, CoaAccountInput } from "../types/coa";
import { SEED_ACCOUNTS } from "../data/mockCoa";
import { getTypes, HIDDEN_TYPE_CODES } from "./coaMasterStore";
import { supabase } from "@/integrations/supabase/client";

const STORAGE_KEY = "accounting:coa-accounts:v5";

/** Strip bank-typed rows — banks are owned by the Banks module now. */
function scrubBankAccounts(list: CoaAccount[]): CoaAccount[] {
  return list.filter((a) => !HIDDEN_TYPE_CODES.has(a.typeCode));
}

let accounts: CoaAccount[] = (() => {
  if (typeof window === "undefined") return SEED_ACCOUNTS;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const existing = scrubBankAccounts(JSON.parse(raw) as CoaAccount[]);
      // Merge: add any new seed accounts (by code) that aren't already stored.
      const existingCodes = new Set(existing.map((a) => a.code));
      const additions = scrubBankAccounts(SEED_ACCOUNTS).filter(
        (s) => !existingCodes.has(s.code),
      );
      return additions.length ? [...existing, ...additions] : existing;
    }
  } catch {
    // Ignore malformed local cache and fall back to seed.
  }
  return scrubBankAccounts(SEED_ACCOUNTS);
})();

// Persist the scrub immediately so the migration sticks.
if (typeof window !== "undefined") {
  try { window.localStorage.setItem(STORAGE_KEY, JSON.stringify(accounts)); } catch {
    // Ignore localStorage write failures.
  }
}

const listeners = new Set<() => void>();
function emit() {
  try { window.localStorage.setItem(STORAGE_KEY, JSON.stringify(accounts)); } catch {
    // Ignore localStorage write failures.
  }
  listeners.forEach((l) => l());
}

// ──────────────────────────────────────────────────────────────
// Supabase sync layer (hybrid: localStorage cache + background DB)
// ──────────────────────────────────────────────────────────────

type CoaRow = {
  id: string; code: string; name: string;
  group_code: string; type_code: string | null; sub_type_code: string | null;
  parent_id: string | null; entity_id: string | null;
  currency: string | null; normal_balance: string | null; tax_code: string | null;
  opening_balance: string | number | null; current_balance: string | number | null;
  is_active: boolean | null; is_postable: boolean | null; description: string | null;
  created_at: string;
};

function mapFromDb(r: CoaRow): CoaAccount {
  return {
    id: r.id,
    code: r.code,
    name: r.name,
    groupCode: r.group_code,
    typeCode: r.type_code ?? "",
    subTypeCode: r.sub_type_code,
    parentId: r.parent_id,
    currency: r.currency ?? "CAD",
    entityId: r.entity_id,
    taxCode: r.tax_code,
    normalBalance: (r.normal_balance as "DEBIT" | "CREDIT" | null) ?? undefined,
    openingBalance: Number(r.opening_balance ?? 0),
    currentBalance: Number(r.current_balance ?? 0),
    status: r.is_active === false ? "INACTIVE" : "ACTIVE",
    isPostable: r.is_postable !== false,
    description: r.description ?? undefined,
    txnCount: 0,
    createdAt: r.created_at,
  };
}

function mapToDb(a: CoaAccount | CoaAccountInput) {
  return {
    code: a.code.trim(),
    name: a.name.trim(),
    group_code: a.groupCode,
    type_code: a.typeCode || null,
    sub_type_code: a.subTypeCode ?? null,
    parent_id: a.parentId ?? null,
    entity_id: a.entityId ?? null,
    currency: a.currency,
    normal_balance: a.normalBalance ?? null,
    tax_code: a.taxCode ?? null,
    opening_balance: a.openingBalance,
    current_balance: "currentBalance" in a ? a.currentBalance : a.openingBalance,
    is_active: ("status" in a ? a.status : "ACTIVE") === "ACTIVE",
    is_postable: a.isPostable !== false,
    description: a.description ?? null,
  } as const;
}

let rlsBlockedLogged = false;
export async function hydrateFromSupabase() {
  if (typeof window === "undefined") return;
  try {
    const { data, error } = await supabase
      .from("accounting_coa")
      .select("*")
      .order("code");
    if (error) {
      if (!rlsBlockedLogged) {
        console.warn("[coaStore] Supabase read failed, using local cache:", error.message);
        rlsBlockedLogged = true;
      }
      return;
    }
    if (!data) return;
    // If DB is empty, keep local cache as-is so the user still has seeds.
    if (data.length === 0) return;
    accounts = scrubBankAccounts(data.map(mapFromDb));
    emit();
  } catch (e) {
    console.warn("[coaStore] Supabase hydration error:", e);
  }
}
import { runWhenAuthReady } from "./_hydrationGate";
runWhenAuthReady(hydrateFromSupabase);

async function getUserId(): Promise<string | null> {
  try {
    const { data } = await supabase.auth.getUser();
    return data.user?.id ?? null;
  } catch { return null; }
}

export function useAccounts(): CoaAccount[] {
  return useSyncExternalStore(
    (l) => { listeners.add(l); return () => listeners.delete(l); },
    () => accounts,
    () => accounts,
  );
}
export const getAccounts = () => accounts;

export function getDescendantIds(id: string): string[] {
  const out: string[] = [];
  const walk = (pid: string) => {
    accounts.forEach((a) => {
      if (a.parentId === pid) { out.push(a.id); walk(a.id); }
    });
  };
  walk(id);
  return out;
}

export interface ValidationError { field: string; message: string }

function validate(input: CoaAccountInput, idEditing?: string): ValidationError | null {
  if (!input.code.trim()) return { field: "code", message: "Account code is required" };
  if (!/^[A-Za-z0-9.-]{2,20}$/.test(input.code.trim())) {
    return { field: "code", message: "Code must be 2–20 characters: letters, digits, '.' or '-'" };
  }
  if (!input.name.trim()) return { field: "name", message: "Account name is required" };
  if (input.name.trim().length < 2 || input.name.trim().length > 80) {
    return { field: "name", message: "Name must be 2–80 characters" };
  }
  if (!input.groupCode) return { field: "groupCode", message: "Account group is required" };
  if (!input.typeCode) return { field: "typeCode", message: "Account type is required" };
  // Unique code
  if (accounts.some((a) => a.code === input.code.trim() && a.id !== idEditing)) {
    return { field: "code", message: `Account code "${input.code}" already exists` };
  }
  // Type belongs to group
  const type = getTypes().find((t) => t.code === input.typeCode);
  if (type && type.groupCode !== input.groupCode) {
    return { field: "typeCode", message: "Selected type does not belong to chosen group" };
  }
  // Parent: must exist, share group, no circular
  if (input.parentId) {
    const parent = accounts.find((a) => a.id === input.parentId);
    if (!parent) return { field: "parentId", message: "Parent account not found" };
    if (parent.groupCode !== input.groupCode) {
      return { field: "parentId", message: "Parent must belong to the same account group" };
    }
    if (idEditing) {
      if (input.parentId === idEditing) return { field: "parentId", message: "An account cannot be its own parent" };
      const descendants = getDescendantIds(idEditing);
      if (descendants.includes(input.parentId)) {
        return { field: "parentId", message: "Cannot set a descendant as the parent (circular reference)" };
      }
    }
  }
  return null;
}

export function addAccount(input: CoaAccountInput): { ok: true; account: CoaAccount } | { ok: false; error: ValidationError } {
  const err = validate(input);
  if (err) return { ok: false, error: err };
  const created: CoaAccount = {
    ...input,
    code: input.code.trim(),
    name: input.name.trim(),
    id: `ac-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`,
    currentBalance: input.openingBalance,
    txnCount: 0,
    createdAt: new Date().toISOString(),
  };
  accounts = [...accounts, created];
  emit();
  // Background: persist to Supabase, then swap temp id for real id.
  void (async () => {
    const userId = await getUserId();
    const payload = { ...mapToDb(created), created_by: userId } as never;
    const { data, error } = await supabase
      .from("accounting_coa")
      .insert(payload)
      .select()
      .single();
    if (error) {
      console.error("[coaStore] addAccount failed:", error.message);
      // Revert optimistic insert
      accounts = accounts.filter((a) => a.id !== created.id);
      emit();
      return;
    }
    if (data) {
      const real = mapFromDb(data as CoaRow);
      accounts = accounts.map((a) => (a.id === created.id ? real : a));
      emit();
      void hydrateFromSupabase();
    }
  })();
  return { ok: true, account: created };
}

export function updateAccount(id: string, input: CoaAccountInput): { ok: true } | { ok: false; error: ValidationError } {
  const err = validate(input, id);
  if (err) return { ok: false, error: err };
  const prev = accounts.find((a) => a.id === id);
  accounts = accounts.map((a) =>
    a.id === id
      ? { ...a, ...input, code: input.code.trim(), name: input.name.trim() }
      : a,
  );
  emit();
  void (async () => {
    const updated = accounts.find((a) => a.id === id);
    if (!updated) return;
    const { error } = await supabase
      .from("accounting_coa")
      .update(mapToDb(updated) as never)
      .eq("id", id);
    if (error) {
      console.error("[coaStore] updateAccount failed:", error.message);
      if (prev) {
        accounts = accounts.map((a) => (a.id === id ? prev : a));
        emit();
      }
      return;
    }
    void hydrateFromSupabase();
  })();
  return { ok: true };
}

export function toggleAccountStatus(id: string) {
  const prev = accounts.find((a) => a.id === id);
  accounts = accounts.map((a) =>
    a.id === id ? { ...a, status: a.status === "ACTIVE" ? "INACTIVE" : "ACTIVE" } : a,
  );
  emit();
  void (async () => {
    const next = accounts.find((a) => a.id === id);
    if (!next) return;
    const { error } = await supabase
      .from("accounting_coa")
      .update({ is_active: next.status === "ACTIVE" })
      .eq("id", id);
    if (error) {
      console.error("[coaStore] toggleAccountStatus failed:", error.message);
      if (prev) {
        accounts = accounts.map((a) => (a.id === id ? prev : a));
        emit();
      }
      return;
    }
    void hydrateFromSupabase();
  })();
}

export interface DeleteCheck { canDelete: boolean; reason?: string }

export function canDeleteAccount(id: string): DeleteCheck {
  const target = accounts.find((a) => a.id === id);
  if (!target) return { canDelete: false, reason: "Account not found" };
  if (target.txnCount > 0) {
    return { canDelete: false, reason: `Account has ${target.txnCount} linked transaction${target.txnCount === 1 ? "" : "s"}. Reassign or void them first.` };
  }
  if (accounts.some((a) => a.parentId === id)) {
    return { canDelete: false, reason: "Account has child accounts. Delete or reassign children first." };
  }
  return { canDelete: true };
}

export function deleteAccount(id: string): { ok: boolean; error?: string } {
  const check = canDeleteAccount(id);
  if (!check.canDelete) return { ok: false, error: check.reason };
  const removed = accounts.find((a) => a.id === id);
  accounts = accounts.filter((a) => a.id !== id);
  emit();
  void (async () => {
    const { error } = await supabase
      .from("accounting_coa")
      .delete()
      .eq("id", id);
    if (error) {
      console.error("[coaStore] deleteAccount failed:", error.message);
      if (removed) {
        accounts = [...accounts, removed];
        emit();
      }
    }
  })();
  return { ok: true };
}