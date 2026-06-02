import { useSyncExternalStore } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import type { ReimbursementClaim } from "../types/reimbursements";

const STORAGE_KEY = "accounting:reimbursements:v2";
const UUID_RX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const isUuid = (v: string | null | undefined) => !!v && UUID_RX.test(v);
function newUuid(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) return crypto.randomUUID();
  return `${Date.now().toString(16)}-xxxx-4xxx-yxxx-xxxxxxxxxxxx`.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    return (c === "x" ? r : (r & 0x3) | 0x8).toString(16);
  });
}

let state: ReimbursementClaim[] = (() => {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw) as ReimbursementClaim[];
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

function toDb(c: ReimbursementClaim): Record<string, unknown> {
  return {
    id: c.id,
    claim_number: c.claimNumber,
    claim_date: c.claimDate,
    claimed_by: c.claimedBy,
    entity: c.entity,
    branch: c.branch ?? null,
    personal_card_account: c.personalCardAccount ?? null,
    company_bank_account: c.companyBankAccount ?? null,
    lines: c.lines ?? [],
    total_amount: c.totalAmount ?? 0,
    business_amount: c.businessAmount ?? 0,
    personal_amount: c.personalAmount ?? 0,
    reimbursable_amount: c.reimbursableAmount ?? 0,
    status: c.status ?? "DRAFT",
    submitted_at: c.submittedAt ?? null,
    reviewed_by: c.reviewedBy ?? null,
    reviewed_at: c.reviewedAt ?? null,
    approved_by: c.approvedBy ?? null,
    approved_at: c.approvedAt ?? null,
    rejection_reason: c.rejectionReason ?? null,
    paid_at: c.paidAt ?? null,
    payment_mode: c.paymentMode ?? null,
    payment_reference: c.paymentReference ?? null,
    paid_by_account: c.paidByAccount ?? null,
    expense_journal_id: isUuid(c.expenseJournalId) ? c.expenseJournalId : null,
    payment_journal_id: isUuid(c.paymentJournalId) ? c.paymentJournalId : null,
    notes: c.notes ?? null,
  };
}

function fromDb(row: any): ReimbursementClaim {
  return {
    id: row.id,
    claimNumber: row.claim_number,
    claimDate: row.claim_date,
    claimedBy: row.claimed_by,
    entity: row.entity,
    branch: row.branch ?? undefined,
    personalCardAccount: row.personal_card_account ?? "",
    companyBankAccount: row.company_bank_account ?? "",
    lines: Array.isArray(row.lines) ? row.lines : [],
    totalAmount: Number(row.total_amount) || 0,
    businessAmount: Number(row.business_amount) || 0,
    personalAmount: Number(row.personal_amount) || 0,
    reimbursableAmount: Number(row.reimbursable_amount) || 0,
    status: row.status,
    submittedAt: row.submitted_at ?? undefined,
    reviewedBy: row.reviewed_by ?? undefined,
    reviewedAt: row.reviewed_at ?? undefined,
    approvedBy: row.approved_by ?? undefined,
    approvedAt: row.approved_at ?? undefined,
    rejectionReason: row.rejection_reason ?? undefined,
    paidAt: row.paid_at ?? undefined,
    paymentMode: row.payment_mode ?? undefined,
    paymentReference: row.payment_reference ?? undefined,
    paidByAccount: row.paid_by_account ?? undefined,
    expenseJournalId: row.expense_journal_id ?? undefined,
    paymentJournalId: row.payment_journal_id ?? undefined,
    notes: row.notes ?? undefined,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

async function hydrate() {
  try {
    const { data, error } = await supabase
      .from("accounting_reimbursements" as any)
      .select("*")
      .order("created_at", { ascending: false });
    if (error) throw error;
    if (!data) return;
    const byId = new Map(state.map((c) => [c.id, c]));
    for (const row of data as any[]) byId.set(row.id, fromDb(row));
    state = Array.from(byId.values());
    emit();
  } catch (e) {
    console.warn("[reimbursementsStore] hydrate failed", e);
  }
}
if (typeof window !== "undefined") void hydrate();

export const useReimbursements = (): ReimbursementClaim[] =>
  useSyncExternalStore(
    (l) => { listeners.add(l); return () => listeners.delete(l); },
    () => state,
    () => state,
  );
export const getReimbursements = () => state;
export const getReimbursement = (id: string) => state.find((c) => c.id === id);

export function addReimbursement(
  input: Omit<ReimbursementClaim, "id" | "createdAt" | "updatedAt">
): ReimbursementClaim {
  const now = new Date().toISOString();
  const created: ReimbursementClaim = { id: newUuid(), createdAt: now, updatedAt: now, ...input };
  state = [created, ...state];
  emit();
  void (async () => {
    try {
      const { data: u } = await supabase.auth.getUser();
      const { error } = await supabase
        .from("accounting_reimbursements" as any)
        .insert({ ...toDb(created), created_by: u?.user?.id ?? null } as any);
      if (error) throw error;
    } catch (e: any) {
      console.warn("[reimbursementsStore] insert failed", e);
      state = state.filter((c) => c.id !== created.id);
      emit();
      toast.error(`Failed to save claim: ${e?.message ?? "unknown"}`);
    }
  })();
  return created;
}

export function updateReimbursement(id: string, patch: Partial<ReimbursementClaim>) {
  const prev = state.find((c) => c.id === id);
  if (!prev) return;
  const next: ReimbursementClaim = { ...prev, ...patch, updatedAt: new Date().toISOString() };
  state = state.map((c) => (c.id === id ? next : c));
  emit();
  if (!isUuid(id)) return;
  void (async () => {
    try {
      const { error } = await supabase
        .from("accounting_reimbursements" as any)
        .update(toDb(next) as any)
        .eq("id", id);
      if (error) throw error;
    } catch (e: any) {
      console.warn("[reimbursementsStore] update failed", e);
      state = state.map((c) => (c.id === id ? prev : c));
      emit();
      toast.error(`Failed to update claim: ${e?.message ?? "unknown"}`);
    }
  })();
}

export function deleteReimbursement(id: string) {
  const prev = state;
  state = state.filter((c) => c.id !== id);
  emit();
  if (!isUuid(id)) return;
  void (async () => {
    try {
      const { error } = await supabase.from("accounting_reimbursements" as any).delete().eq("id", id);
      if (error) throw error;
    } catch (e: any) {
      console.warn("[reimbursementsStore] delete failed", e);
      state = prev;
      emit();
      toast.error(`Failed to delete claim: ${e?.message ?? "unknown"}`);
    }
  })();
}

export function nextClaimNumber(): string {
  const year = new Date().getFullYear();
  const n = state.filter((c) => c.claimNumber.includes(String(year))).length + 1;
  return `RMB-${year}-${String(n).padStart(3, "0")}`;
}
