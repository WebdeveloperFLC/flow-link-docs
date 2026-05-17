import { useSyncExternalStore } from "react";
import { toast } from "sonner";
import { MOCK_BILLS } from "../data/mockAP";
import type { VendorBill, BillStatus, ExpenseCategory } from "../data/mockAP";
import { supabase } from "@/integrations/supabase/client";

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
  try { window.localStorage.setItem(STORAGE_KEY, JSON.stringify(bills)); } catch {}
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
  };
}

function mergeFromDb(local: VendorBill | undefined, row: any): VendorBill {
  return {
    id: row.id,
    billNumber: row.bill_number ?? local?.billNumber ?? "",
    vendor: row.vendor_name ?? local?.vendor ?? "",
    vendorEmail: local?.vendorEmail,
    vendorPhone: local?.vendorPhone,
    vendorCategory: (local?.vendorCategory ?? "OTHER") as ExpenseCategory,
    entity: row.entity ?? local?.entity ?? "",
    branch: local?.branch ?? "",
    branchCountry: (local?.branchCountry ?? "OTHER") as VendorBill["branchCountry"],
    department: local?.department,
    description: local?.description ?? "",
    billDate: row.bill_date ?? local?.billDate ?? "",
    dueDate: row.due_date ?? local?.dueDate ?? "",
    currency: (row.currency ?? local?.currency ?? "INR") as VendorBill["currency"],
    subtotal: Number(row.subtotal ?? local?.subtotal ?? 0),
    taxCode: local?.taxCode ?? "",
    taxAmount: Number(row.tax_amount ?? local?.taxAmount ?? 0),
    totalAmount: Number(row.total_amount ?? local?.totalAmount ?? 0),
    status: (row.status ?? local?.status ?? "DRAFT") as BillStatus,
    linkedDocumentId: local?.linkedDocumentId,
    linkedJournalId: row.journal_id ?? local?.linkedJournalId,
    linkedBankAccountId: local?.linkedBankAccountId,
    linkedCOACode: local?.linkedCOACode ?? "2000",
    paymentDate: local?.paymentDate,
    paymentReference: row.reference ?? local?.paymentReference,
    paymentMethod: (row.payment_method ?? local?.paymentMethod) as VendorBill["paymentMethod"],
    notes: row.notes ?? local?.notes,
    daysOverdue: local?.daysOverdue,
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
if (typeof window !== "undefined") void hydrateFromSupabase();

// ─── Public API ─────────────────────────────────────────────────────────────
export function useApBills(): VendorBill[] {
  return useSyncExternalStore(
    (l) => { listeners.add(l); return () => listeners.delete(l); },
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