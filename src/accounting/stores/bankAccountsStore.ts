import { useSyncExternalStore } from "react";
import { toast } from "sonner";
import { BankAccount, BankAccountInput, DefaultKind } from "../types/bankAccounts";
import { SEED_BANK_ACCOUNTS } from "../data/mockBankAccounts";
import { getAccounts } from "./coaStore";
import { supabase } from "@/integrations/supabase/client";

const STORAGE_KEY = "accounting:bank-accounts:v3";

const UUID_RX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const isUuid = (v: string | null | undefined) => !!v && UUID_RX.test(v);

let bankAccounts: BankAccount[] = (() => {
  if (typeof window === "undefined") return SEED_BANK_ACCOUNTS;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw) as BankAccount[];
  } catch {}
  return SEED_BANK_ACCOUNTS;
})();

const listeners = new Set<() => void>();
function emit() {
  try { window.localStorage.setItem(STORAGE_KEY, JSON.stringify(bankAccounts)); } catch {}
  listeners.forEach((l) => l());
}

export function useBankAccounts(): BankAccount[] {
  return useSyncExternalStore(
    (l) => { listeners.add(l); return () => listeners.delete(l); },
    () => bankAccounts,
    () => bankAccounts,
  );
}
export const getBankAccounts = () => bankAccounts;
export const getBankAccount = (id: string) => bankAccounts.find((b) => b.id === id);

// ────────────────────────────────────────────────────────────────────────────
// DB mapping — only the subset of fields stored in accounting_bank_accounts.
// Other fields (ownerProfileId, isDefaultTax, rm*, branchCode/Name/Address)
// are local-only and preserved from cache on hydrate.
// ────────────────────────────────────────────────────────────────────────────
function mapToDb(b: BankAccount): Record<string, unknown> {
  return {
    id: b.id,
    nickname: b.nickname,
    bank_name: b.bankName || null,
    account_holder: b.holderName || null,
    account_number: b.accountNumber || null,
    transit_number: b.transitNumber || null,
    institution_number: b.routingNumber || null,
    ifsc_code: b.ifsc || null,
    swift_bic: b.swift || null,
    iban: b.iban || null,
    entity: b.entityId,
    branch: b.branchId,
    country: b.country,
    currency: b.currency,
    linked_coa_id: isUuid(b.coaAccountId) ? b.coaAccountId : null,
    linked_coa_code: !isUuid(b.coaAccountId) ? b.coaAccountId || null : null,
    is_default_payment: b.isDefaultPayment,
    is_default_payroll: b.isDefaultPayroll,
    reconciliation_enabled: b.reconciliationEnabled,
    reconciliation_status: b.lastReconciliationStatus,
    last_reconciled_date: b.lastReconciledAt ? b.lastReconciledAt.slice(0, 10) : null,
    status: b.status,
  };
}

function mergeFromDb(local: BankAccount | undefined, row: any): BankAccount {
  const base: BankAccount = local ?? {
    id: row.id,
    country: row.country ?? "",
    entityId: row.entity ?? "",
    branchId: row.branch ?? null,
    ownerProfileId: "",
    coaAccountId: row.linked_coa_id ?? row.linked_coa_code ?? "",
    currency: row.currency ?? "",
    bankName: row.bank_name ?? "",
    nickname: row.nickname ?? "",
    holderName: row.account_holder ?? "",
    accountNumber: row.account_number ?? "",
    isDefaultPayment: false,
    isDefaultPayroll: false,
    isDefaultTax: false,
    reconciliationEnabled: true,
    status: "ACTIVE",
    createdAt: row.created_at ?? new Date().toISOString(),
    lastReconciledAt: null,
    lastReconciliationStatus: null,
  };
  return {
    ...base,
    country: row.country ?? base.country,
    entityId: row.entity ?? base.entityId,
    branchId: row.branch ?? base.branchId,
    coaAccountId: row.linked_coa_id ?? row.linked_coa_code ?? base.coaAccountId,
    currency: row.currency ?? base.currency,
    bankName: row.bank_name ?? base.bankName,
    nickname: row.nickname ?? base.nickname,
    holderName: row.account_holder ?? base.holderName,
    accountNumber: row.account_number ?? base.accountNumber,
    transitNumber: row.transit_number ?? base.transitNumber,
    routingNumber: row.institution_number ?? base.routingNumber,
    ifsc: row.ifsc_code ?? base.ifsc,
    swift: row.swift_bic ?? base.swift,
    iban: row.iban ?? base.iban,
    isDefaultPayment: row.is_default_payment ?? base.isDefaultPayment,
    isDefaultPayroll: row.is_default_payroll ?? base.isDefaultPayroll,
    reconciliationEnabled: row.reconciliation_enabled ?? base.reconciliationEnabled,
    lastReconciliationStatus: row.reconciliation_status ?? base.lastReconciliationStatus,
    lastReconciledAt: row.last_reconciled_date ?? base.lastReconciledAt,
    status: row.status ?? base.status,
  };
}

async function hydrateFromSupabase() {
  try {
    const { data, error } = await supabase.from("accounting_bank_accounts").select("*");
    if (error) throw error;
    if (!data) return;
    const byId = new Map(bankAccounts.map((b) => [b.id, b]));
    for (const row of data as any[]) {
      byId.set(row.id, mergeFromDb(byId.get(row.id), row));
    }
    bankAccounts = Array.from(byId.values());
    emit();
  } catch (e) {
    console.warn("[bankAccountsStore] hydrate failed, using local cache", e);
  }
}
import { runWhenAuthReady } from "./_hydrationGate";
runWhenAuthReady(hydrateFromSupabase);

export interface ValidationError { field: string; message: string }

const RX_IBAN = /^[A-Z0-9]{15,34}$/;
const RX_SWIFT = /^[A-Z0-9]{8}([A-Z0-9]{3})?$/;
const RX_IFSC = /^[A-Z]{4}0[A-Z0-9]{6}$/;
const RX_EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const RX_ACC_NUM = /^[A-Za-z0-9 \-]{4,34}$/;

function validate(input: BankAccountInput): ValidationError | null {
  if (!input.country) return { field: "country", message: "Country is required" };
  if (!input.entityId) return { field: "entityId", message: "Entity is required" };
  if (!input.ownerProfileId) return { field: "ownerProfileId", message: "Owner is required" };
  if (!input.coaAccountId) return { field: "coaAccountId", message: "Linked Chart of Accounts ledger is required" };
  if (!input.currency) return { field: "currency", message: "Currency is required" };
  if (!input.bankName.trim()) return { field: "bankName", message: "Bank name is required" };
  if (!input.nickname.trim()) return { field: "nickname", message: "Nickname is required" };
  if (!input.holderName.trim()) return { field: "holderName", message: "Account holder name is required" };
  if (!input.accountNumber.trim()) return { field: "accountNumber", message: "Account number is required" };
  if (!RX_ACC_NUM.test(input.accountNumber.trim())) {
    return { field: "accountNumber", message: "Account number must be 4–34 letters / digits / dashes" };
  }
  if (input.iban && !RX_IBAN.test(input.iban.replace(/\s+/g, "").toUpperCase())) {
    return { field: "iban", message: "Invalid IBAN format" };
  }
  if (input.swift && !RX_SWIFT.test(input.swift.toUpperCase())) {
    return { field: "swift", message: "SWIFT/BIC must be 8 or 11 alphanumeric characters" };
  }
  if (input.ifsc && !RX_IFSC.test(input.ifsc.toUpperCase())) {
    return { field: "ifsc", message: "IFSC must follow AAAA0NNNNNN format (e.g. HDFC0000123)" };
  }
  if (input.rmEmail && !RX_EMAIL.test(input.rmEmail)) {
    return { field: "rmEmail", message: "Invalid email format" };
  }
  const ledger = getAccounts().find((a) => a.id === input.coaAccountId);
  if (!ledger) return { field: "coaAccountId", message: "Linked ledger not found" };
  if (ledger.currency !== input.currency) {
    return { field: "currency", message: `Currency must match linked ledger (${ledger.currency})` };
  }
  return null;
}

function newUuid(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) return crypto.randomUUID();
  return `${Date.now().toString(16)}-xxxx-4xxx-yxxx-xxxxxxxxxxxx`.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    return (c === "x" ? r : (r & 0x3) | 0x8).toString(16);
  });
}

async function dbInsert(b: BankAccount) {
  if (!isUuid(b.id)) return;
  try {
    const { data: u } = await supabase.auth.getUser();
    const payload = { ...mapToDb(b), created_by: u?.user?.id ?? null };
    const { error } = await supabase.from("accounting_bank_accounts").insert(payload as any);
    if (error) throw error;
  } catch (e: any) {
    console.warn("[bankAccountsStore] insert failed", e);
    bankAccounts = bankAccounts.filter((x) => x.id !== b.id);
    emit();
    toast.error(`Failed to save bank account: ${e?.message ?? "unknown error"}`);
  }
}

async function dbUpdate(id: string, prev: BankAccount, next: BankAccount) {
  if (!isUuid(id)) return;
  try {
    const { error } = await supabase
      .from("accounting_bank_accounts")
      .update(mapToDb(next) as any)
      .eq("id", id);
    if (error) throw error;
  } catch (e: any) {
    console.warn("[bankAccountsStore] update failed", e);
    bankAccounts = bankAccounts.map((x) => (x.id === id ? prev : x));
    emit();
    toast.error(`Failed to update bank account: ${e?.message ?? "unknown error"}`);
  }
}

async function dbDelete(id: string, prev: BankAccount[]) {
  if (!isUuid(id)) return;
  try {
    const { error } = await supabase.from("accounting_bank_accounts").delete().eq("id", id);
    if (error) throw error;
  } catch (e: any) {
    console.warn("[bankAccountsStore] delete failed", e);
    bankAccounts = prev;
    emit();
    toast.error(`Failed to delete bank account: ${e?.message ?? "unknown error"}`);
  }
}

export function addBankAccount(input: BankAccountInput): { ok: true; account: BankAccount } | { ok: false; error: ValidationError } {
  const err = validate(input);
  if (err) return { ok: false, error: err };
  const created: BankAccount = {
    ...input,
    id: newUuid(),
    createdAt: new Date().toISOString(),
    lastReconciledAt: null,
    lastReconciliationStatus: null,
  };
  bankAccounts = applyDefaults([...bankAccounts, created], created);
  emit();
  void dbInsert(created);
  return { ok: true, account: created };
}

export function updateBankAccount(id: string, input: BankAccountInput): { ok: true } | { ok: false; error: ValidationError } {
  const err = validate(input);
  if (err) return { ok: false, error: err };
  const prev = bankAccounts.find((b) => b.id === id);
  if (!prev) return { ok: false, error: { field: "id", message: "Bank account not found" } };
  const next = bankAccounts.map((b) => (b.id === id ? { ...b, ...input } : b));
  const updated = next.find((b) => b.id === id)!;
  bankAccounts = applyDefaults(next, updated);
  emit();
  void dbUpdate(id, prev, updated);
  return { ok: true };
}

function applyDefaults(list: BankAccount[], target: BankAccount): BankAccount[] {
  return list.map((b) => {
    if (b.id === target.id) return b;
    if (b.entityId !== target.entityId || b.currency !== target.currency) return b;
    return {
      ...b,
      isDefaultPayment: target.isDefaultPayment ? false : b.isDefaultPayment,
      isDefaultPayroll: target.isDefaultPayroll ? false : b.isDefaultPayroll,
      isDefaultTax: target.isDefaultTax ? false : b.isDefaultTax,
    };
  });
}

export function setDefault(kind: DefaultKind, id: string) {
  const target = bankAccounts.find((b) => b.id === id);
  if (!target) return;
  const flag = kind === "payment" ? "isDefaultPayment" : kind === "payroll" ? "isDefaultPayroll" : "isDefaultTax";
  const prev = bankAccounts;
  const affected: BankAccount[] = [];
  bankAccounts = bankAccounts.map((b) => {
    if (b.entityId !== target.entityId || b.currency !== target.currency) return b;
    const updated = { ...b, [flag]: b.id === id } as BankAccount;
    if (updated[flag] !== b[flag]) affected.push(updated);
    return updated;
  });
  emit();
  // Only payment/payroll round-trip to DB (tax not in schema)
  if (kind === "tax") return;
  for (const b of affected) {
    void dbUpdate(b.id, prev.find((p) => p.id === b.id)!, b);
  }
}

export function toggleStatus(id: string) {
  const prev = bankAccounts.find((b) => b.id === id);
  if (!prev) return;
  const next: BankAccount = { ...prev, status: prev.status === "ACTIVE" ? "INACTIVE" : "ACTIVE" };
  bankAccounts = bankAccounts.map((b) => (b.id === id ? next : b));
  emit();
  void dbUpdate(id, prev, next);
}

export function deleteBankAccount(id: string): { ok: boolean; error?: string } {
  const target = bankAccounts.find((b) => b.id === id);
  if (!target) return { ok: false, error: "Bank account not found" };
  const ledger = getAccounts().find((a) => a.id === target.coaAccountId);
  if (ledger && ledger.txnCount > 0) {
    return { ok: false, error: `Linked ledger has ${ledger.txnCount} transactions. Reassign before deleting.` };
  }
  const prev = bankAccounts;
  bankAccounts = bankAccounts.filter((b) => b.id !== id);
  emit();
  void dbDelete(id, prev);
  return { ok: true };
}
