import { useSyncExternalStore } from "react";
import { supabase } from "@/integrations/supabase/client";
import { runWhenAuthReady } from "./_hydrationGate";
import {
  postTrustDisbursement,
  getTrustAvailableBalance,
  type TrustDisbursementInput,
} from "../lib/trustPosting";

/**
 * Student Trust store — reactive view over the trust subledger:
 *   accounts (per client/bucket balances), entries (movements), and
 *   disbursements (cash-out records). All mutations go through the journal
 *   engine + subledger (trustPosting), so balances stay GL-consistent.
 */

export interface TrustAccount {
  id: string;
  clientId: string;
  clientName?: string;
  studentId?: string | null;
  entityId: string;
  branchId: string;
  roleKey: string;
  currency: string;
  balance: number;
  updatedAt: string;
}

export interface TrustEntry {
  id: string;
  trustAccountId: string;
  entryType: string;
  amount: number;
  currency: string;
  sourceModule: string;
  sourceRecordId?: string | null;
  journalId?: string | null;
  memo?: string | null;
  createdAt: string;
}

export interface TrustDisbursement {
  id: string;
  clientId: string;
  entityId: string;
  branchId: string;
  roleKey: string;
  payeeType: string;
  payeeName: string;
  amount: number;
  currency: string;
  paymentMethod?: string | null;
  reference?: string | null;
  postingDate: string;
  memo?: string | null;
  attachmentPath?: string | null;
  status: string;
  isRefund: boolean;
  journalId?: string | null;
  createdAt: string;
}

interface TrustState {
  loading: boolean;
  accounts: TrustAccount[];
  entries: TrustEntry[];
  disbursements: TrustDisbursement[];
}

let state: TrustState = { loading: false, accounts: [], entries: [], disbursements: [] };
const listeners = new Set<() => void>();
function set(patch: Partial<TrustState>) {
  state = { ...state, ...patch };
  listeners.forEach((l) => l());
}

function accountFromDb(row: any): TrustAccount {
  return {
    id: row.id,
    clientId: row.client_id,
    studentId: row.student_id ?? null,
    entityId: row.entity_id,
    branchId: row.branch_id,
    roleKey: row.role_key,
    currency: row.currency,
    balance: Number(row.balance) || 0,
    updatedAt: row.updated_at,
  };
}

export async function refreshTrust() {
  set({ loading: true });
  try {
    const [accRes, entRes, disbRes] = await Promise.all([
      supabase.from("accounting_trust_accounts").select("*").order("updated_at", { ascending: false }).limit(1000),
      supabase.from("accounting_trust_entries").select("*").order("created_at", { ascending: false }).limit(500),
      supabase.from("accounting_trust_disbursements").select("*").order("created_at", { ascending: false }).limit(500),
    ]);
    const accounts = (accRes.data ?? []).map(accountFromDb);

    // Resolve client names.
    const clientIds = Array.from(new Set(accounts.map((a) => a.clientId).filter(Boolean)));
    const nameMap = new Map<string, string>();
    if (clientIds.length) {
      const { data: clients } = await supabase.from("clients").select("id, name").in("id", clientIds);
      for (const c of (clients ?? []) as any[]) nameMap.set(c.id, c.name);
    }
    accounts.forEach((a) => { a.clientName = nameMap.get(a.clientId) ?? a.clientId; });

    set({
      loading: false,
      accounts,
      entries: (entRes.data ?? []).map((r: any) => ({
        id: r.id, trustAccountId: r.trust_account_id, entryType: r.entry_type,
        amount: Number(r.amount) || 0, currency: r.currency, sourceModule: r.source_module,
        sourceRecordId: r.source_record_id, journalId: r.journal_id, memo: r.memo, createdAt: r.created_at,
      })),
      disbursements: (disbRes.data ?? []).map((r: any) => ({
        id: r.id, clientId: r.client_id, entityId: r.entity_id, branchId: r.branch_id,
        roleKey: r.role_key, payeeType: r.payee_type, payeeName: r.payee_name,
        amount: Number(r.amount) || 0, currency: r.currency, paymentMethod: r.payment_method,
        reference: r.reference, postingDate: r.posting_date, memo: r.memo,
        attachmentPath: r.attachment_path, status: r.status, isRefund: !!r.is_refund,
        journalId: r.journal_id, createdAt: r.created_at,
      })),
    });
  } catch (e) {
    console.warn("[trustStore] refresh failed", e);
    set({ loading: false });
  }
}
runWhenAuthReady(refreshTrust);

export function useTrustState(): TrustState {
  return useSyncExternalStore(
    (l) => { listeners.add(l); return () => listeners.delete(l); },
    () => state,
    () => state,
  );
}

export const getTrustState = () => state;

/** Available balances grouped by client → bucket. */
export function trustBalancesByClient(): Map<string, TrustAccount[]> {
  const m = new Map<string, TrustAccount[]>();
  for (const a of state.accounts) {
    const list = m.get(a.clientId) ?? [];
    list.push(a);
    m.set(a.clientId, list);
  }
  return m;
}

export { getTrustAvailableBalance };

/**
 * Create + post a trust disbursement (or refund). Records the disbursement
 * row, posts the journal + subledger entry via the engine, then refreshes.
 */
export async function createTrustDisbursement(
  input: TrustDisbursementInput & {
    payeeType: "INSTITUTION" | "VENDOR" | "STUDENT_REFUND" | "THIRD_PARTY";
    payeeName: string;
    paymentMethod?: string;
  },
): Promise<void> {
  const { data: u } = await supabase.auth.getUser();

  // 1. Disbursement record (DRAFT).
  const { data: disb, error: dErr } = await supabase
    .from("accounting_trust_disbursements")
    .insert({
      client_id: input.clientId,
      entity_id: input.entityId,
      branch_id: input.branchId,
      role_key: input.roleKey,
      payee_type: input.payeeType,
      payee_name: input.payeeName,
      amount: input.amount,
      currency: input.currency,
      payment_method: input.paymentMethod ?? null,
      reference: input.reference ?? null,
      posting_date: input.postingDate,
      memo: input.narration ?? null,
      attachment_path: input.attachmentPath ?? null,
      is_refund: input.isRefund ?? false,
      student_id: input.studentId ?? null,
      application_id: input.applicationId ?? null,
      institution_id: input.institutionId ?? null,
      aggregator_id: input.aggregatorId ?? null,
      status: "DRAFT",
      created_by: u?.user?.id ?? null,
    } as any)
    .select("id")
    .single();
  if (dErr) throw dErr;

  try {
    // 2. Post journal + subledger entry (DB balance guard enforces #6).
    const { journal, trustEntryId } = await postTrustDisbursement({
      ...input,
      sourceModule: "TRUST",
      sourceRecordId: disb.id,
    });

    // 3. Finalize disbursement.
    await supabase
      .from("accounting_trust_disbursements")
      .update({
        status: "POSTED",
        journal_id: journal.id,
        trust_entry_id: trustEntryId,
        posted_by: u?.user?.id ?? null,
        posted_at: new Date().toISOString(),
      } as any)
      .eq("id", disb.id);
  } catch (e) {
    // Posting failed (e.g. insufficient funds) — drop the draft record.
    await supabase.from("accounting_trust_disbursements").delete().eq("id", disb.id);
    throw e;
  }

  await refreshTrust();
}
