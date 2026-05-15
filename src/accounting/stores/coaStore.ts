import { useSyncExternalStore } from "react";
import { CoaAccount, CoaAccountInput } from "../types/coa";
import { SEED_ACCOUNTS } from "../data/mockCoa";
import { getTypes } from "./coaMasterStore";

const STORAGE_KEY = "accounting:coa-accounts:v1";

let accounts: CoaAccount[] = (() => {
  if (typeof window === "undefined") return SEED_ACCOUNTS;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw) as CoaAccount[];
  } catch {}
  return SEED_ACCOUNTS;
})();

const listeners = new Set<() => void>();
function emit() {
  try { window.localStorage.setItem(STORAGE_KEY, JSON.stringify(accounts)); } catch {}
  listeners.forEach((l) => l());
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
  if (!input.name.trim()) return { field: "name", message: "Account name is required" };
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
  return { ok: true, account: created };
}

export function updateAccount(id: string, input: CoaAccountInput): { ok: true } | { ok: false; error: ValidationError } {
  const err = validate(input, id);
  if (err) return { ok: false, error: err };
  accounts = accounts.map((a) =>
    a.id === id
      ? { ...a, ...input, code: input.code.trim(), name: input.name.trim() }
      : a,
  );
  emit();
  return { ok: true };
}

export function toggleAccountStatus(id: string) {
  accounts = accounts.map((a) =>
    a.id === id ? { ...a, status: a.status === "ACTIVE" ? "INACTIVE" : "ACTIVE" } : a,
  );
  emit();
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
  accounts = accounts.filter((a) => a.id !== id);
  emit();
  return { ok: true };
}