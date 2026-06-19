import { supabase } from "@/integrations/supabase/client";
import { postJournal, reverseJournal, type PostingLeg } from "./journalEngine";
import type { Journal } from "../data/mockJournals";

/**
 * Trust Posting (Phase 1).
 *
 * Student money is pass-through LIABILITY, never revenue (decision #3:
 * disbursements clear the liability directly). Every movement posts a
 * balanced journal AND writes a trust subledger entry; the DB balance guard
 * blocks any disbursement that would exceed held funds (decision #6).
 */

const round2 = (n: number) => Math.round((Number(n) || 0) * 100) / 100;

// ── Pure leg builders ────────────────────────────────────────────────

/** Cash received into trust: DR bank, CR trust liability. */
export function trustReceiptLegs(
  amount: number,
  trustRoleKey: string,
  bankRoleKey = "BANK_TRUST",
): PostingLeg[] {
  const amt = round2(amount);
  return [
    { roleKey: bankRoleKey, drCr: "DR", amount: amt, description: "Trust receipt" },
    { roleKey: trustRoleKey, drCr: "CR", amount: amt, description: "Student funds held" },
  ];
}

/** Disbursement of held funds: DR trust liability, CR bank. */
export function trustDisbursementLegs(
  amount: number,
  trustRoleKey: string,
  bankRoleKey = "BANK_TRUST",
): PostingLeg[] {
  const amt = round2(amount);
  return [
    { roleKey: trustRoleKey, drCr: "DR", amount: amt, description: "Trust disbursement" },
    { roleKey: bankRoleKey, drCr: "CR", amount: amt, description: "Paid from trust bank" },
  ];
}

/** Refund to student: DR trust liability, CR bank (same shape as a disbursement). */
export const trustRefundLegs = trustDisbursementLegs;

// ── Subledger helpers ────────────────────────────────────────────────

export interface TrustAccountKey {
  clientId: string;
  roleKey: string;
  entityId: string;
  branchId: string;
  currency: string;
  studentId?: string;
}

/** Find or create the per-(client, bucket, entity, currency) trust subledger account. */
export async function getOrCreateTrustAccount(key: TrustAccountKey): Promise<string> {
  const { data: existing, error: selErr } = await supabase
    .from("accounting_trust_accounts")
    .select("id")
    .eq("client_id", key.clientId)
    .eq("role_key", key.roleKey)
    .eq("entity_id", key.entityId)
    .eq("currency", key.currency)
    .maybeSingle();
  if (selErr) throw selErr;
  if (existing?.id) return existing.id;

  const { data: inserted, error: insErr } = await supabase
    .from("accounting_trust_accounts")
    .insert({
      client_id: key.clientId,
      student_id: key.studentId ?? null,
      role_key: key.roleKey,
      entity_id: key.entityId,
      branch_id: key.branchId,
      currency: key.currency,
      balance: 0,
    } as any)
    .select("id")
    .single();
  if (insErr) throw insErr;
  return inserted.id;
}

/** Read realized available balance for a trust bucket via the DB helper. */
export async function getTrustAvailableBalance(key: Omit<TrustAccountKey, "branchId">): Promise<number> {
  const { data, error } = await supabase.rpc("fn_trust_available_balance", {
    p_client_id: key.clientId,
    p_role_key: key.roleKey,
    p_entity_id: key.entityId,
    p_currency: key.currency,
  });
  if (error) throw error;
  return Number(data) || 0;
}

interface TrustEntryInput {
  trustAccountId: string;
  entryType: "RECEIPT" | "DISBURSEMENT" | "REFUND" | "ADJUSTMENT" | "REVERSAL";
  amount: number; // signed: + increases held funds, - reduces
  currency: string;
  sourceModule: string;
  sourceRecordId?: string;
  journalId?: string;
  memo?: string;
}

async function insertTrustEntry(input: TrustEntryInput): Promise<string> {
  const { data: u } = await supabase.auth.getUser();
  const { data, error } = await supabase
    .from("accounting_trust_entries")
    .insert({
      trust_account_id: input.trustAccountId,
      entry_type: input.entryType,
      amount: input.amount,
      currency: input.currency,
      source_module: input.sourceModule,
      source_record_id: input.sourceRecordId ?? null,
      journal_id: input.journalId ?? null,
      memo: input.memo ?? null,
      created_by: u?.user?.id ?? null,
    } as any)
    .select("id")
    .single();
  if (error) throw error;
  return data.id;
}

// ── Orchestration ────────────────────────────────────────────────────

export interface TrustReceiptInput extends TrustAccountKey {
  amount: number;
  postingDate: string;
  bankRoleKey?: string;
  narration?: string;
  reference?: string;
  sourceModule?: string;
  sourceRecordId?: string;
  attachmentPath?: string;
  applicationId?: string;
  institutionId?: string;
  aggregatorId?: string;
}

/** Record receipt of student funds into trust (journal + subledger +amount). */
export async function postTrustReceipt(input: TrustReceiptInput): Promise<{ journal: Journal; trustAccountId: string; trustEntryId: string }> {
  const amt = round2(input.amount);
  const trustAccountId = await getOrCreateTrustAccount(input);
  const journal = postJournal({
    entityId: input.entityId,
    branchId: input.branchId,
    currency: input.currency,
    sourceModule: (input.sourceModule as any) || "TRUST",
    sourceRecordId: input.sourceRecordId,
    postingDate: input.postingDate,
    narration: input.narration || "Student trust receipt",
    reference: input.reference,
    legs: trustReceiptLegs(amt, input.roleKey, input.bankRoleKey),
    attachmentPath: input.attachmentPath,
    studentId: input.studentId,
    applicationId: input.applicationId,
    institutionId: input.institutionId,
    aggregatorId: input.aggregatorId,
  });
  const trustEntryId = await insertTrustEntry({
    trustAccountId,
    entryType: "RECEIPT",
    amount: amt,
    currency: input.currency,
    sourceModule: (input.sourceModule as any) || "TRUST",
    sourceRecordId: input.sourceRecordId,
    journalId: journal.id,
    memo: input.narration,
  });
  return { journal, trustAccountId, trustEntryId };
}

export interface TrustDisbursementInput extends TrustAccountKey {
  amount: number;
  postingDate: string;
  bankRoleKey?: string;
  isRefund?: boolean;
  narration?: string;
  reference?: string;
  sourceModule?: string;
  sourceRecordId?: string;
  attachmentPath?: string;
  applicationId?: string;
  institutionId?: string;
  aggregatorId?: string;
}

/**
 * Disburse (or refund) held funds. Pre-checks the balance for a friendly
 * error, posts the journal, then writes the subledger entry. If the entry
 * is rejected (race against the DB guard), the journal is reversed.
 */
export async function postTrustDisbursement(
  input: TrustDisbursementInput,
): Promise<{ journal: Journal; trustAccountId: string; trustEntryId: string }> {
  const amt = round2(input.amount);
  if (amt <= 0) throw new Error("Disbursement amount must be positive.");

  const available = await getTrustAvailableBalance(input);
  if (amt > available + 0.005) {
    throw new Error(
      `Disbursement of ${amt.toFixed(2)} exceeds available trust balance of ${available.toFixed(2)}.`,
    );
  }

  const trustAccountId = await getOrCreateTrustAccount(input);
  const journal = postJournal({
    entityId: input.entityId,
    branchId: input.branchId,
    currency: input.currency,
    sourceModule: (input.sourceModule as any) || "TRUST",
    sourceRecordId: input.sourceRecordId,
    postingDate: input.postingDate,
    narration: input.narration || (input.isRefund ? "Student trust refund" : "Student trust disbursement"),
    reference: input.reference,
    legs: trustDisbursementLegs(amt, input.roleKey, input.bankRoleKey),
    attachmentPath: input.attachmentPath,
    studentId: input.studentId,
    applicationId: input.applicationId,
    institutionId: input.institutionId,
    aggregatorId: input.aggregatorId,
  });

  try {
    const trustEntryId = await insertTrustEntry({
      trustAccountId,
      entryType: input.isRefund ? "REFUND" : "DISBURSEMENT",
      amount: -amt,
      currency: input.currency,
      sourceModule: (input.sourceModule as any) || "TRUST",
      sourceRecordId: input.sourceRecordId,
      journalId: journal.id,
      memo: input.narration,
    });
    return { journal, trustAccountId, trustEntryId };
  } catch (e) {
    // Subledger rejected the movement — undo the GL posting to stay consistent.
    reverseJournal(journal.id, { reason: "Trust subledger rejected disbursement" });
    throw e;
  }
}
