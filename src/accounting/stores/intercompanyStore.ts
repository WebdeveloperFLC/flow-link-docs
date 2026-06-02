import { useSyncExternalStore } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import type { IntercompanyTransaction } from "../types/intercompany";

const STORAGE_KEY = "accounting:intercompany:v2";
const UUID_RX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const isUuid = (v: string | null | undefined) => !!v && UUID_RX.test(v);
function newUuid(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) return crypto.randomUUID();
  return `${Date.now().toString(16)}-xxxx-4xxx-yxxx-xxxxxxxxxxxx`.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    return (c === "x" ? r : (r & 0x3) | 0x8).toString(16);
  });
}

let state: IntercompanyTransaction[] = (() => {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw) as IntercompanyTransaction[];
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

function toDb(t: IntercompanyTransaction): Record<string, unknown> {
  return {
    id: t.id,
    txn_number: t.txnNumber,
    txn_date: t.txnDate,
    from_entity: t.fromEntity,
    to_entity: t.toEntity,
    transaction_type: t.transactionType ?? null,
    description: t.description,
    currency: t.currency,
    fx_rate: t.fxRate ?? 1,
    amount: t.amount,
    tax_type: t.taxType ?? null,
    tax_rate: t.taxRate ?? null,
    tax_amount: t.taxAmount ?? 0,
    net_amount: t.netAmount,
    from_debit_account: t.fromDebitAccount ?? null,
    from_credit_account: t.fromCreditAccount ?? null,
    to_debit_account: t.toDebitAccount ?? null,
    to_credit_account: t.toCreditAccount ?? null,
    from_journal_id: isUuid(t.fromJournalId) ? t.fromJournalId : null,
    to_journal_id: isUuid(t.toJournalId) ? t.toJournalId : null,
    status: t.status ?? "DRAFT",
    reference: t.reference ?? null,
    notes: t.notes ?? null,
    attachments: t.attachments ?? [],
    posted_at: t.postedAt ?? null,
  };
}

function fromDb(row: any): IntercompanyTransaction {
  return {
    id: row.id,
    txnNumber: row.txn_number,
    txnDate: row.txn_date,
    fromEntity: row.from_entity,
    toEntity: row.to_entity,
    transactionType: row.transaction_type ?? undefined,
    description: row.description ?? "",
    currency: row.currency,
    fxRate: Number(row.fx_rate) || 1,
    amount: Number(row.amount) || 0,
    taxType: row.tax_type ?? undefined,
    taxRate: row.tax_rate != null ? Number(row.tax_rate) : undefined,
    taxAmount: Number(row.tax_amount) || 0,
    netAmount: Number(row.net_amount) || 0,
    fromDebitAccount: row.from_debit_account ?? "",
    fromCreditAccount: row.from_credit_account ?? "",
    toDebitAccount: row.to_debit_account ?? "",
    toCreditAccount: row.to_credit_account ?? "",
    fromJournalId: row.from_journal_id ?? undefined,
    toJournalId: row.to_journal_id ?? undefined,
    status: row.status,
    reference: row.reference ?? undefined,
    notes: row.notes ?? undefined,
    attachments: row.attachments ?? [],
    createdBy: row.created_by ?? undefined,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    postedAt: row.posted_at ?? undefined,
  };
}

async function hydrate() {
  try {
    const { data, error } = await supabase
      .from("accounting_intercompany" as any)
      .select("*")
      .order("created_at", { ascending: false });
    if (error) throw error;
    if (!data) return;
    const byId = new Map(state.map((t) => [t.id, t]));
    for (const row of data as any[]) byId.set(row.id, fromDb(row));
    state = Array.from(byId.values());
    emit();
  } catch (e) {
    console.warn("[intercompanyStore] hydrate failed", e);
  }
}
if (typeof window !== "undefined") void hydrate();

export const useIntercompany = (): IntercompanyTransaction[] =>
  useSyncExternalStore(
    (l) => { listeners.add(l); return () => listeners.delete(l); },
    () => state,
    () => state,
  );
export const getIntercompany = () => state;
export const getIntercompanyTxn = (id: string) => state.find((t) => t.id === id);

export function addIntercompany(
  input: Omit<IntercompanyTransaction, "id" | "createdAt" | "updatedAt">
): IntercompanyTransaction {
  const now = new Date().toISOString();
  const created: IntercompanyTransaction = { id: newUuid(), createdAt: now, updatedAt: now, ...input };
  state = [created, ...state];
  emit();
  void (async () => {
    try {
      const { data: u } = await supabase.auth.getUser();
      const { error } = await supabase
        .from("accounting_intercompany" as any)
        .insert({ ...toDb(created), created_by: u?.user?.id ?? null } as any);
      if (error) throw error;
    } catch (e: any) {
      console.warn("[intercompanyStore] insert failed", e);
      state = state.filter((t) => t.id !== created.id);
      emit();
      toast.error(`Failed to save intercompany: ${e?.message ?? "unknown"}`);
    }
  })();
  return created;
}

export function updateIntercompany(id: string, patch: Partial<IntercompanyTransaction>) {
  const prev = state.find((t) => t.id === id);
  if (!prev) return;
  const next: IntercompanyTransaction = { ...prev, ...patch, updatedAt: new Date().toISOString() };
  state = state.map((t) => (t.id === id ? next : t));
  emit();
  if (!isUuid(id)) return;
  void (async () => {
    try {
      const { error } = await supabase
        .from("accounting_intercompany" as any)
        .update(toDb(next) as any)
        .eq("id", id);
      if (error) throw error;
    } catch (e: any) {
      console.warn("[intercompanyStore] update failed", e);
      state = state.map((t) => (t.id === id ? prev : t));
      emit();
      toast.error(`Failed to update intercompany: ${e?.message ?? "unknown"}`);
    }
  })();
}

export function deleteIntercompany(id: string) {
  const prev = state;
  state = state.filter((t) => t.id !== id);
  emit();
  if (!isUuid(id)) return;
  void (async () => {
    try {
      const { error } = await supabase.from("accounting_intercompany" as any).delete().eq("id", id);
      if (error) throw error;
    } catch (e: any) {
      console.warn("[intercompanyStore] delete failed", e);
      state = prev;
      emit();
      toast.error(`Failed to delete intercompany: ${e?.message ?? "unknown"}`);
    }
  })();
}

export function nextIntercompanyNumber(): string {
  const year = new Date().getFullYear();
  const n = state.filter((t) => t.txnNumber.includes(String(year))).length + 1;
  return `IC-${year}-${String(n).padStart(3, "0")}`;
}
