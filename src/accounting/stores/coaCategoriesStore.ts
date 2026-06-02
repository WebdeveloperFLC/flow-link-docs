import { useSyncExternalStore } from "react";

/**
 * Side store mapping CoA account `code` → list of AP expense categories
 * and AR revenue category labels the account serves.
 *
 * Lives in localStorage only — no DB column, no migration. Keyed by the
 * stable account `code` (not id) so it survives Supabase re-hydration.
 */

const STORAGE_KEY = "accounting:coa-categories:v1";

export interface CoaCategoryLinks {
  expense?: string[]; // ExpenseCategory codes
  revenue?: string[]; // free-text service-type labels (lowercased)
}

type Store = Record<string, CoaCategoryLinks>;

let store: Store = (() => {
  if (typeof window === "undefined") return {};
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as Store) : {};
  } catch {
    return {};
  }
})();

const listeners = new Set<() => void>();
function emit() {
  try {
    if (typeof window !== "undefined") {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(store));
    }
  } catch {
    // Ignore localStorage write failures.
  }
  listeners.forEach((l) => l());
}

export function useCoaCategories(): Store {
  return useSyncExternalStore(
    (l) => { listeners.add(l); return () => listeners.delete(l); },
    () => store,
    () => store,
  );
}

export const getCoaCategories = () => store;

export function getExpenseCategories(code: string): string[] {
  return store[code]?.expense ?? [];
}

export function getRevenueCategories(code: string): string[] {
  return store[code]?.revenue ?? [];
}

export function setAccountCategories(
  code: string,
  links: CoaCategoryLinks,
): void {
  const next: CoaCategoryLinks = {};
  if (links.expense && links.expense.length) next.expense = [...links.expense];
  if (links.revenue && links.revenue.length) {
    next.revenue = links.revenue.map((s) => s.trim().toLowerCase()).filter(Boolean);
  }
  if (!next.expense && !next.revenue) {
    const { [code]: _, ...rest } = store;
    store = rest;
  } else {
    store = { ...store, [code]: next };
  }
  emit();
}