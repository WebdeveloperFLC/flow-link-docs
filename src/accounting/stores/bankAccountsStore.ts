import { useSyncExternalStore } from "react";
import { BankAccount, BankAccountInput, DefaultKind } from "../types/bankAccounts";
import { SEED_BANK_ACCOUNTS } from "../data/mockBankAccounts";
import { getAccounts } from "./coaStore";

const STORAGE_KEY = "accounting:bank-accounts:v2";

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
  // Currency must match the linked COA ledger
  const ledger = getAccounts().find((a) => a.id === input.coaAccountId);
  if (!ledger) return { field: "coaAccountId", message: "Linked ledger not found" };
  if (ledger.currency !== input.currency) {
    return { field: "currency", message: `Currency must match linked ledger (${ledger.currency})` };
  }
  return null;
}

export function addBankAccount(input: BankAccountInput): { ok: true; account: BankAccount } | { ok: false; error: ValidationError } {
  const err = validate(input);
  if (err) return { ok: false, error: err };
  const created: BankAccount = {
    ...input,
    id: `ba-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`,
    createdAt: new Date().toISOString(),
    lastReconciledAt: null,
    lastReconciliationStatus: null,
  };
  bankAccounts = applyDefaults([...bankAccounts, created], created);
  emit();
  return { ok: true, account: created };
}

export function updateBankAccount(id: string, input: BankAccountInput): { ok: true } | { ok: false; error: ValidationError } {
  const err = validate(input);
  if (err) return { ok: false, error: err };
  const next = bankAccounts.map((b) => (b.id === id ? { ...b, ...input } : b));
  const updated = next.find((b) => b.id === id)!;
  bankAccounts = applyDefaults(next, updated);
  emit();
  return { ok: true };
}

function applyDefaults(list: BankAccount[], target: BankAccount): BankAccount[] {
  // For each default flag set on target, clear it on other accounts that share entity+currency
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
  bankAccounts = bankAccounts.map((b) => {
    if (b.entityId !== target.entityId || b.currency !== target.currency) return b;
    return { ...b, [flag]: b.id === id };
  });
  emit();
}

export function toggleStatus(id: string) {
  bankAccounts = bankAccounts.map((b) =>
    b.id === id ? { ...b, status: b.status === "ACTIVE" ? "INACTIVE" : "ACTIVE" } : b,
  );
  emit();
}

export function deleteBankAccount(id: string): { ok: boolean; error?: string } {
  const target = bankAccounts.find((b) => b.id === id);
  if (!target) return { ok: false, error: "Bank account not found" };
  const ledger = getAccounts().find((a) => a.id === target.coaAccountId);
  if (ledger && ledger.txnCount > 0) {
    return { ok: false, error: `Linked ledger has ${ledger.txnCount} transactions. Reassign before deleting.` };
  }
  bankAccounts = bankAccounts.filter((b) => b.id !== id);
  emit();
  return { ok: true };
}