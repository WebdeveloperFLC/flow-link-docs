import { useSyncExternalStore } from "react";
import { toast } from "sonner";
import { MOCK_BILLS } from "../data/mockAP";
import type { VendorBill, BillStatus, ExpenseCategory } from "../data/mockAP";
import { supabase } from "@/integrations/supabase/client";
import { addJournal } from "./journalsStore";
import { getAccounts } from "./coaStore";
import { getBankAccounts } from "./bankAccountsStore";
import { toAccountType, nextJournalNumber } from "../lib/journalHelpers";
import type { JournalLine } from "../data/mockJournals";

const STORAGE_KEY = "accounting:ap-bills:v3";
const UUID_RX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const isUuid = (v: string | null | undefined) => !!v && UUID_RX.test(v);

function newUuid(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) return crypto.randomUUID();
  return `${Date.now().toString(16)}-xxxx-4xxx-yxxx-xxxxxxxxxxxx`.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    return (c === "x" ? r : (r & 0x3) | 0x8).toString(16);
  });
}

let bills: VendorBill[] = (() => {
  if (typeof window === "undefined") return MOCK_BILLS;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw) as VendorBill[];
  } catch {}
  return MOCK_BILLS;
})();

const listeners = new Set<() => void>();
function emit() {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(bills));
  } catch {}
  listeners.forEach((l) => l());
}

// ─── DB mapping ─────────────────────────────────────────────────────────────
// DB stores subset of fields; local-only fields (vendorEmail/Phone, vendorCategory,
// branch, branchCountry, department, description, taxCode, linkedDocumentId,
// linkedBankAccountId, linkedCOACode, paymentDate, paymentReference, daysOverdue,
// createdBy, approvedBy, tags) are preserved on hydrate via mergeFromDb.
function mapToDb(b: VendorBill): Record<string, unknown> {
  const paid = +(b.totalAmount - 0).toFixed(2); // outstanding calc handled below
  const isPaid = b.status === "PAID";
  return {
    id: b.id,
    bill_number: b.billNumber,
    vendor_name: b.vendor,
    bill_date: b.billDate,
    due_date: b.dueDate || null,
    entity: b.entity || null,
    currency: b.currency || "INR",
    subtotal: b.subtotal ?? 0,
    tax_amount: b.taxAmount ?? 0,
    total_amount: b.totalAmount ?? 0,
    paid_amount: isPaid ? b.totalAmount : 0,
    outstanding: isPaid ? 0 : (b.totalAmount ?? 0),
    status: b.status || "DRAFT",
    payment_terms: b.notes && b.notes.startsWith("Payment terms:") ? b.notes : null,
    payment_method: b.paymentMethod || null,
    reference: b.paymentReference || null,
    notes: b.notes || null,
    journal_id: isUuid(b.linkedJournalId) ? b.linkedJournalId : null,
    description: b.description || null,
    department: b.department || null,
    linked_coa_code: b.linkedCOACode || null,
    linked_expense_coa_code: b.linkedExpenseCOACode || null,
    linked_bank_account_id: isUuid(b.linkedBankAccountId) ? b.linkedBankAccountId : null,
    tax_code: b.taxCode || null,
    branch: b.branch || null,
    branch_country: b.branchCountry || null,
    vendor_category: b.vendorCategory || null,
    vendor_email: b.vendorEmail || null,
    vendor_phone: b.vendorPhone || null,
    tags: b.tags ?? [],
    payment_proof_path: b.paymentProofPath || null,
  };
}

function mergeFromDb(local: VendorBill | undefined, row: any): VendorBill {
  return {
    id: row.id,
    billNumber: row.bill_number ?? local?.billNumber ?? "",
    vendor: row.vendor_name ?? local?.vendor ?? "",
    vendorEmail: row.vendor_email ?? local?.vendorEmail,
    vendorPhone: row.vendor_phone ?? local?.vendorPhone,
    vendorCategory: (row.vendor_category ?? local?.vendorCategory ?? "OTHER") as ExpenseCategory,
    entity: row.entity ?? local?.entity ?? "",
    branch: row.branch ?? local?.branch ?? "",
    branchCountry: (row.branch_country ?? local?.branchCountry ?? "OTHER") as VendorBill["branchCountry"],
    department: row.department ?? local?.department,
    description: row.description ?? local?.description ?? "",
    linkedBankAccountId: row.linked_bank_account_id ?? local?.linkedBankAccountId,
    taxCode: row.tax_code ?? local?.taxCode ?? "",
    billDate: row.bill_date ?? local?.billDate ?? "",
    dueDate: row.due_date ?? local?.dueDate ?? "",
    currency: (row.currency ?? local?.currency ?? "INR") as VendorBill["currency"],
    subtotal: Number(row.subtotal ?? local?.subtotal ?? 0),
    taxAmount: Number(row.tax_amount ?? local?.taxAmount ?? 0),
    totalAmount: Number(row.total_amount ?? local?.totalAmount ?? 0),
    status: (row.status ?? local?.status ?? "DRAFT") as BillStatus,
    linkedDocumentId: local?.linkedDocumentId,
    linkedJournalId: row.journal_id ?? local?.linkedJournalId,
    linkedPaymentJournalId: local?.linkedPaymentJournalId,
    linkedCOACode: row.linked_coa_code ?? local?.linkedCOACode ?? "2000",
    linkedExpenseCOACode: row.linked_expense_coa_code ?? local?.linkedExpenseCOACode,
    paymentDate: local?.paymentDate,
    paymentReference: row.reference ?? local?.paymentReference,
    paymentMethod: (row.payment_method ?? local?.paymentMethod) as VendorBill["paymentMethod"],
    notes: row.notes ?? local?.notes,
    daysOverdue: local?.daysOverdue,
    paymentProofPath: row.payment_proof_path ?? local?.paymentProofPath,
    createdBy: local?.createdBy ?? "",
    approvedBy: local?.approvedBy,
    tags: local?.tags,
  };
}

async function hydrateFromSupabase() {
  try {
    const { data, error } = await supabase.from("accounting_ap_bills").select("*");
    if (error) throw error;
    if (!data) return;
    const byId = new Map(bills.map((b) => [b.id, b]));
    for (const row of data) byId.set(row.id, mergeFromDb(byId.get(row.id), row));
    bills = Array.from(byId.values());
    emit();
  } catch (e) {
    console.warn("[apBillsStore] hydrate failed", e);
  }
}
import { runWhenAuthReady } from "./_hydrationGate";
runWhenAuthReady(hydrateFromSupabase);

// ─── Public API ─────────────────────────────────────────────────────────────
export function useApBills(): VendorBill[] {
  return useSyncExternalStore(
    (l) => {
      listeners.add(l);
      return () => listeners.delete(l);
    },
    () => bills,
    () => bills,
  );
}
export const getApBills = () => bills;
export const getApBill = (id: string) => bills.find((b) => b.id === id);

export function addApBill(input: Omit<VendorBill, "id">): VendorBill {
  const created: VendorBill = { id: newUuid(), ...input } as VendorBill;
  bills = [created, ...bills];
  emit();
  void (async () => {
    try {
      const { data: u } = await supabase.auth.getUser();
      const { error } = await supabase
        .from("accounting_ap_bills")
        .insert({ ...mapToDb(created), created_by: u?.user?.id ?? null } as any);
      if (error) throw error;
    } catch (e: any) {
      console.warn("[apBillsStore] insert failed", e);
      bills = bills.filter((b) => b.id !== created.id);
      emit();
      toast.error(`Failed to save bill: ${e?.message ?? "unknown error"}`);
    }
  })();
  return created;
}

export function updateApBill(id: string, patch: Partial<VendorBill>) {
  const prev = bills.find((b) => b.id === id);
  if (!prev) return;
  const next = { ...prev, ...patch };
  bills = bills.map((b) => (b.id === id ? next : b));
  emit();

  // Auto-post linked journals on key status transitions.
  if (prev.status !== "APPROVED" && next.status === "APPROVED" && !next.linkedJournalId) {
    autoPostAccrual(next);
  }
  if (prev.status !== "PAID" && next.status === "PAID" && !next.linkedPaymentJournalId) {
    autoPostPayment(next);
  }

  if (!isUuid(id)) return;
  void (async () => {
    try {
      const { error } = await supabase
        .from("accounting_ap_bills")
        .update(mapToDb(next) as any)
        .eq("id", id);
      if (error) throw error;
    } catch (e: any) {
      console.warn("[apBillsStore] update failed", e);
      bills = bills.map((b) => (b.id === id ? prev : b));
      emit();
      toast.error(`Failed to update bill: ${e?.message ?? "unknown error"}`);
    }
  })();
}

export function deleteApBill(id: string) {
  const prev = bills;
  bills = bills.filter((b) => b.id !== id);
  emit();
  if (!isUuid(id)) return;
  void (async () => {
    try {
      const { error } = await supabase.from("accounting_ap_bills").delete().eq("id", id);
      if (error) throw error;
    } catch (e: any) {
      console.warn("[apBillsStore] delete failed", e);
      bills = prev;
      emit();
      toast.error(`Failed to delete bill: ${e?.message ?? "unknown error"}`);
    }
  })();
}

// ─── Auto-posted journals ───────────────────────────────────────────────────
function patchLocal(id: string, patch: Partial<VendorBill>) {
  const prev = bills.find((b) => b.id === id);
  if (!prev) return;
  const next = { ...prev, ...patch };
  bills = bills.map((b) => (b.id === id ? next : b));
  emit();
  if (!isUuid(id)) return;
  void supabase
    .from("accounting_ap_bills")
    .update(mapToDb(next) as any)
    .eq("id", id)
    .then(({ error }) => {
      if (error) console.warn("[apBillsStore] patchLocal sync failed", error);
    });
}

function makeLine(opts: {
  accountId: string;
  accountCode: string;
  accountName: string;
  groupCode: string;
  debit: number;
  credit: number;
  description: string;
}): JournalLine {
  return {
    id: newUuid(),
    accountId: opts.accountId,
    accountCode: opts.accountCode,
    accountName: opts.accountName,
    accountType: toAccountType(opts.groupCode),
    debit: opts.debit,
    credit: opts.credit,
    description: opts.description,
    taxCode: "",
  };
}

function findApAccount(bill?: VendorBill) {
  const coa = getAccounts();
  const postable = (a: any) => a.isPostable !== false && a.status !== "INACTIVE";
  if (bill?.linkedCOACode) {
    const chosen = coa.find((a) => a.code === bill.linkedCOACode && postable(a));
    if (chosen) return chosen;
  }
  return (
    coa.find((a) => a.code === "2000" && postable(a)) ??
    coa.find((a) => a.groupCode === "LIABILITY" && a.typeCode === "AP" && postable(a))
  );
}

function findExpenseAccount(bill: VendorBill) {
  const coa = getAccounts();
  const ap = findApAccount(bill);
  const postable = (a: any) => a.isPostable !== false && a.status !== "INACTIVE";
  // 1. Prefer the explicit expense account chosen on the bill.
  if (bill.linkedExpenseCOACode) {
    const chosen = coa.find((a) => a.code === bill.linkedExpenseCOACode && postable(a));
    if (chosen && (!ap || chosen.id !== ap.id)) return chosen;
  }
  // 2. Back-compat: linkedCOACode used to hold the expense account.
  const linked = coa.find((a) => a.code === bill.linkedCOACode && postable(a));
  if (linked && (!ap || linked.id !== ap.id)) return linked;
  // 3. Fallback: first postable EXPENSE-group account.
  return coa.find((a) => a.groupCode === "EXPENSE" && postable(a));
}

function findBankCoaAccount(bill: VendorBill) {
  const coa = getAccounts();
  const banks = getBankAccounts();
  let coaId: string | undefined;
  if (bill.linkedBankAccountId) {
    const b = banks.find((x) => x.id === bill.linkedBankAccountId);
    if (b?.coaAccountId) coaId = b.coaAccountId;
  }
  if (!coaId) {
    // Fallback: first bank in matching currency with a linked COA.
    const fallback = banks.find((b) => b.currency === bill.currency && b.coaAccountId);
    if (fallback?.coaAccountId) coaId = fallback.coaAccountId;
  }
  if (!coaId) return undefined;
  return coa.find((a) => a.id === coaId || a.code === coaId);
}

function autoPostAccrual(bill: VendorBill) {
  const ap = findApAccount(bill);
  const expense = findExpenseAccount(bill);
  if (!ap || !expense || ap.id === expense.id) {
    toast.error("Could not auto-post accrual journal — open it manually");
    return;
  }
  try {
    const entryNumber = nextJournalNumber();
    const j = addJournal({
      entryNumber,
      entryDate: bill.billDate,
      entity: bill.entity,
      narration: `AP bill ${bill.billNumber} — ${bill.vendor}`,
      sourceType: "AP",
      reference: bill.billNumber,
      currency: bill.currency as any,
      status: "POSTED",
      createdBy: "Auto-post",
      postedAt: new Date().toISOString(),
      lines: [
        makeLine({
          accountId: expense.id,
          accountCode: expense.code,
          accountName: expense.name,
          groupCode: expense.groupCode,
          debit: bill.totalAmount,
          credit: 0,
          description: bill.description || bill.vendor,
        }),
        makeLine({
          accountId: ap.id,
          accountCode: ap.code,
          accountName: ap.name,
          groupCode: ap.groupCode,
          debit: 0,
          credit: bill.totalAmount,
          description: `Payable to ${bill.vendor}`,
        }),
      ],
    });
    patchLocal(bill.id, { linkedJournalId: j.id });
    toast.success(`Accrual journal posted (${entryNumber})`);
  } catch (e: any) {
    console.warn("[apBillsStore] autoPostAccrual failed", e);
    toast.error("Could not auto-post accrual journal — open it manually");
  }
}

function autoPostPayment(bill: VendorBill) {
  const ap = findApAccount(bill);
  const bank = findBankCoaAccount(bill);
  if (!ap || !bank) {
    toast.error("Could not auto-post payment journal — payment journal pending");
    return;
  }
  try {
    const entryNumber = nextJournalNumber();
    const j = addJournal({
      entryNumber,
      entryDate: bill.paymentDate || new Date().toISOString().slice(0, 10),
      entity: bill.entity,
      narration: `Payment for ${bill.billNumber}`,
      sourceType: "AP",
      reference: `PAY-${bill.billNumber}`,
      currency: bill.currency as any,
      status: "POSTED",
      createdBy: "Auto-post",
      postedAt: new Date().toISOString(),
      lines: [
        makeLine({
          accountId: ap.id,
          accountCode: ap.code,
          accountName: ap.name,
          groupCode: ap.groupCode,
          debit: bill.totalAmount,
          credit: 0,
          description: `Settle ${bill.vendor}`,
        }),
        makeLine({
          accountId: bank.id,
          accountCode: bank.code,
          accountName: bank.name,
          groupCode: bank.groupCode,
          debit: 0,
          credit: bill.totalAmount,
          description: bill.paymentReference || bill.billNumber,
        }),
      ],
    });
    patchLocal(bill.id, { linkedPaymentJournalId: j.id });
    toast.success(`Payment journal posted (${entryNumber})`);
  } catch (e: any) {
    console.warn("[apBillsStore] autoPostPayment failed", e);
    toast.error("Could not auto-post payment journal — payment journal pending");
  }
}
