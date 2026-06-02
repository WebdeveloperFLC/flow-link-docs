import { useSyncExternalStore } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import type { CardReconciliation } from "../types/cardReconciliation";

const STORAGE_KEY = "accounting:card-reconciliation:v2";
const UUID_RX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const isUuid = (v: string | null | undefined) => !!v && UUID_RX.test(v);
function newUuid(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) return crypto.randomUUID();
  return `${Date.now().toString(16)}-xxxx-4xxx-yxxx-xxxxxxxxxxxx`.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    return (c === "x" ? r : (r & 0x3) | 0x8).toString(16);
  });
}

let state: CardReconciliation[] = (() => {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw) as CardReconciliation[];
  } catch {
    // Ignore malformed local cache and fall back to seed data.
  }
  return [];
})();
const listeners = new Set<() => void>();
function emit() {
  try { window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state)); } catch {
    // Ignore localStorage write failures.
  }
  listeners.forEach((l) => l());
}

function toDb(r: CardReconciliation): Record<string, unknown> {
  return {
    id: r.id,
    reconciliation_number: r.reconciliationNumber,
    statement_month: r.statementMonth,
    statement_from: r.statementFrom || null,
    statement_to: r.statementTo || null,
    card_account_id: r.cardAccountId ?? null,
    card_account_name: r.cardAccountName ?? null,
    card_holder_name: r.cardHolderName ?? null,
    card_type: r.cardType ?? "BUSINESS",
    entity: r.entity ?? null,
    currency: r.currency ?? "CAD",
    opening_balance: r.openingBalance ?? 0,
    closing_balance: r.closingBalance ?? 0,
    total_transactions: r.totalTransactions ?? 0,
    total_business: r.totalBusinessAmount ?? 0,
    total_personal: r.totalPersonalAmount ?? 0,
    total_uncategorised: r.totalUncategorised ?? 0,
    lines: r.lines ?? [],
    generated_journal_id: isUuid(r.generatedJournalId) ? r.generatedJournalId : null,
    status: r.status ?? "DRAFT",
    imported_at: r.importedAt ?? new Date().toISOString(),
    completed_at: r.completedAt ?? null,
    notes: r.notes ?? null,
  };
}

function fromDb(row: any): CardReconciliation {
  return {
    id: row.id,
    reconciliationNumber: row.reconciliation_number,
    statementMonth: row.statement_month,
    statementFrom: row.statement_from ?? "",
    statementTo: row.statement_to ?? "",
    cardAccountId: row.card_account_id ?? "",
    cardAccountName: row.card_account_name ?? "",
    cardHolderName: row.card_holder_name ?? "",
    cardType: (row.card_type ?? "BUSINESS") as CardReconciliation["cardType"],
    entity: row.entity ?? "",
    currency: row.currency ?? "CAD",
    openingBalance: Number(row.opening_balance) || 0,
    closingBalance: Number(row.closing_balance) || 0,
    totalTransactions: Number(row.total_transactions) || 0,
    totalBusinessAmount: Number(row.total_business) || 0,
    totalPersonalAmount: Number(row.total_personal) || 0,
    totalUncategorised: Number(row.total_uncategorised) || 0,
    lines: Array.isArray(row.lines) ? row.lines : [],
    generatedJournalId: row.generated_journal_id ?? undefined,
    status: row.status,
    importedAt: row.imported_at,
    completedAt: row.completed_at ?? undefined,
    notes: row.notes ?? undefined,
    createdAt: row.created_at,
  };
}

async function hydrate() {
  try {
    const { data, error } = await supabase
      .from("accounting_card_reconciliation" as any)
      .select("*")
      .order("created_at", { ascending: false });
    if (error) throw error;
    if (!data) return;
    const byId = new Map(state.map((r) => [r.id, r]));
    for (const row of data as any[]) byId.set(row.id, fromDb(row));
    state = Array.from(byId.values());
    emit();
  } catch (e) {
    console.warn("[cardReconciliationStore] hydrate failed", e);
  }
}
if (typeof window !== "undefined") void hydrate();

export const useCardReconciliations = (): CardReconciliation[] =>
  useSyncExternalStore(
    (l) => { listeners.add(l); return () => listeners.delete(l); },
    () => state,
    () => state,
  );
export const getCardReconciliations = () => state;
export const getCardReconciliation = (id: string) => state.find((r) => r.id === id);

export function addCardReconciliation(
  input: Omit<CardReconciliation, "id" | "createdAt">
): CardReconciliation {
  const created: CardReconciliation = { id: newUuid(), createdAt: new Date().toISOString(), ...input };
  state = [created, ...state];
  emit();
  void (async () => {
    try {
      const { data: u } = await supabase.auth.getUser();
      const { error } = await supabase
        .from("accounting_card_reconciliation" as any)
        .insert({ ...toDb(created), created_by: u?.user?.id ?? null } as any);
      if (error) throw error;
    } catch (e: any) {
      console.warn("[cardReconciliationStore] insert failed", e);
      state = state.filter((r) => r.id !== created.id);
      emit();
      toast.error(`Failed to save reconciliation: ${e?.message ?? "unknown"}`);
    }
  })();
  return created;
}

export function updateCardReconciliation(id: string, patch: Partial<CardReconciliation>) {
  const prev = state.find((r) => r.id === id);
  if (!prev) return;
  const next: CardReconciliation = { ...prev, ...patch };
  state = state.map((r) => (r.id === id ? next : r));
  emit();
  if (!isUuid(id)) return;
  void (async () => {
    try {
      const { error } = await supabase
        .from("accounting_card_reconciliation" as any)
        .update(toDb(next) as any)
        .eq("id", id);
      if (error) throw error;
    } catch (e: any) {
      console.warn("[cardReconciliationStore] update failed", e);
      state = state.map((r) => (r.id === id ? prev : r));
      emit();
      toast.error(`Failed to update reconciliation: ${e?.message ?? "unknown"}`);
    }
  })();
}

export function deleteCardReconciliation(id: string) {
  const prev = state;
  state = state.filter((r) => r.id !== id);
  emit();
  if (!isUuid(id)) return;
  void (async () => {
    try {
      const { error } = await supabase.from("accounting_card_reconciliation" as any).delete().eq("id", id);
      if (error) throw error;
    } catch (e: any) {
      console.warn("[cardReconciliationStore] delete failed", e);
      state = prev;
      emit();
      toast.error(`Failed to delete reconciliation: ${e?.message ?? "unknown"}`);
    }
  })();
}

export function nextReconciliationNumber(month: string): string {
  const year = new Date().getFullYear();
  const monthCode = month.slice(0, 3).toUpperCase();
  return `CR-${year}-${monthCode}`;
}
