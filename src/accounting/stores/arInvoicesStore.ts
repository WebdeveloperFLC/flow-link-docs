import { useSyncExternalStore } from "react";
import { toast } from "sonner";
import { MOCK_INVOICES } from "../data/mockAR";
import type { CustomerInvoice, InvoiceStatus, ServiceType } from "../data/mockAR";
import { supabase } from "@/integrations/supabase/client";

const STORAGE_KEY = "accounting:ar-invoices:v3";
const UUID_RX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const isUuid = (v: string | null | undefined) => !!v && UUID_RX.test(v);

function newUuid(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) return crypto.randomUUID();
  return `${Date.now().toString(16)}-xxxx-4xxx-yxxx-xxxxxxxxxxxx`.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    return (c === "x" ? r : (r & 0x3) | 0x8).toString(16);
  });
}

let invoices: CustomerInvoice[] = (() => {
  if (typeof window === "undefined") return MOCK_INVOICES;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw) as CustomerInvoice[];
  } catch {
    // Ignore malformed local cache and fall back to seed data.
  }
  return MOCK_INVOICES;
})();

const listeners = new Set<() => void>();
function emit() {
  try { window.localStorage.setItem(STORAGE_KEY, JSON.stringify(invoices)); } catch {
    // Ignore localStorage write failures.
  }
  listeners.forEach((l) => l());
}

// ─── DB mapping ─────────────────────────────────────────────────────────────
// DB stores subset; local-only fields (clientEmail/Phone/Passport, counselor,
// coCounselor, branch, branchCountry, destinationCountry, programName,
// universityName, intakeMonth, description, taxCode, linkedDocumentId,
// linkedBankAccountId, linkedCOACode, paidDate, paymentReference, daysOverdue,
// viewedAt, installmentPlan/totalInstallments/installmentsPaid, tags) are
// preserved on hydrate via mergeFromDb.
function mapToDb(i: CustomerInvoice): Record<string, unknown> {
  return {
    id: i.id,
    invoice_number: i.invoiceNumber,
    client_id: isUuid(i.clientId) ? i.clientId : null,
    client_name: i.client,
    invoice_date: i.invoiceDate,
    due_date: i.dueDate || null,
    entity: i.entity || null,
    currency: i.currency || "INR",
    subtotal: i.subtotal ?? 0,
    tax_amount: i.taxAmount ?? 0,
    total_amount: i.totalAmount ?? 0,
    paid_amount: i.receivedAmount ?? 0,
    outstanding_balance: i.outstandingBalance ?? 0,
    status: i.status || "DRAFT",
    service_type: i.serviceType || null,
    payment_method: i.paymentMethod || null,
    reference: i.paymentReference || null,
    notes: i.notes || null,
    journal_id: isUuid(i.linkedJournalId) ? i.linkedJournalId : null,
  };
}

function mergeFromDb(local: CustomerInvoice | undefined, row: any): CustomerInvoice {
  return {
    id: row.id,
    clientId: row.client_id ?? local?.clientId,
    invoiceNumber: row.invoice_number ?? local?.invoiceNumber ?? "",
    client: row.client_name ?? local?.client ?? "",
    clientEmail: local?.clientEmail ?? "",
    clientPhone: local?.clientPhone,
    clientPassportNumber: local?.clientPassportNumber,
    counselor: local?.counselor ?? "—",
    coCounselor: local?.coCounselor,
    entity: row.entity ?? local?.entity ?? "",
    branch: local?.branch ?? "",
    branchCountry: (local?.branchCountry ?? "OTHER") as CustomerInvoice["branchCountry"],
    serviceType: (row.service_type ?? local?.serviceType ?? "OTHER") as ServiceType,
    destinationCountry: local?.destinationCountry,
    programName: local?.programName,
    universityName: local?.universityName,
    intakeMonth: local?.intakeMonth,
    description: local?.description ?? "",
    invoiceDate: row.invoice_date ?? local?.invoiceDate ?? "",
    dueDate: row.due_date ?? local?.dueDate ?? "",
    currency: (row.currency ?? local?.currency ?? "INR") as CustomerInvoice["currency"],
    subtotal: Number(row.subtotal ?? local?.subtotal ?? 0),
    taxCode: local?.taxCode ?? "",
    taxAmount: Number(row.tax_amount ?? local?.taxAmount ?? 0),
    totalAmount: Number(row.total_amount ?? local?.totalAmount ?? 0),
    receivedAmount: Number(row.paid_amount ?? local?.receivedAmount ?? 0),
    outstandingBalance: Number(row.outstanding_balance ?? local?.outstandingBalance ?? 0),
    status: (row.status ?? local?.status ?? "DRAFT") as InvoiceStatus,
    linkedDocumentId: local?.linkedDocumentId,
    linkedJournalId: row.journal_id ?? local?.linkedJournalId,
    linkedBankAccountId: local?.linkedBankAccountId,
    linkedCOACode: local?.linkedCOACode ?? "1200",
    paidDate: local?.paidDate,
    paymentMethod: (row.payment_method ?? local?.paymentMethod) as CustomerInvoice["paymentMethod"],
    paymentReference: row.reference ?? local?.paymentReference,
    notes: row.notes ?? local?.notes,
    daysOverdue: local?.daysOverdue,
    viewedAt: local?.viewedAt,
    installmentPlan: local?.installmentPlan,
    totalInstallments: local?.totalInstallments,
    installmentsPaid: local?.installmentsPaid,
    tags: local?.tags,
  };
}

async function hydrateFromSupabase() {
  try {
    const { data, error } = await supabase.from("accounting_ar_invoices").select("*");
    if (error) throw error;
    if (!data) return;
    const byId = new Map(invoices.map((i) => [i.id, i]));
    for (const row of data) byId.set(row.id, mergeFromDb(byId.get(row.id), row));
    invoices = Array.from(byId.values());
    emit();
  } catch (e) {
    console.warn("[arInvoicesStore] hydrate failed", e);
  }
}
import { runWhenAuthReady } from "./_hydrationGate";
runWhenAuthReady(hydrateFromSupabase);

// ─── Public API ─────────────────────────────────────────────────────────────
export function useArInvoices(): CustomerInvoice[] {
  return useSyncExternalStore(
    (l) => { listeners.add(l); return () => listeners.delete(l); },
    () => invoices,
    () => invoices,
  );
}
export const getArInvoices = () => invoices;
export const getArInvoice = (id: string) => invoices.find((i) => i.id === id);

export function addArInvoice(input: Omit<CustomerInvoice, "id">): CustomerInvoice {
  const created: CustomerInvoice = { id: newUuid(), ...input } as CustomerInvoice;
  invoices = [created, ...invoices];
  emit();
  void (async () => {
    try {
      const { data: u } = await supabase.auth.getUser();
      const { error } = await supabase
        .from("accounting_ar_invoices")
        .insert({ ...mapToDb(created), created_by: u?.user?.id ?? null } as any);
      if (error) throw error;
    } catch (e: any) {
      console.warn("[arInvoicesStore] insert failed", e);
      invoices = invoices.filter((i) => i.id !== created.id);
      emit();
      toast.error(`Failed to save invoice: ${e?.message ?? "unknown error"}`);
    }
  })();
  return created;
}

export function updateArInvoice(id: string, patch: Partial<CustomerInvoice>) {
  const prev = invoices.find((i) => i.id === id);
  if (!prev) return;
  const next = { ...prev, ...patch };
  invoices = invoices.map((i) => (i.id === id ? next : i));
  emit();
  if (!isUuid(id)) return;
  void (async () => {
    try {
      const { error } = await supabase
        .from("accounting_ar_invoices")
        .update(mapToDb(next) as any)
        .eq("id", id);
      if (error) throw error;
    } catch (e: any) {
      console.warn("[arInvoicesStore] update failed", e);
      invoices = invoices.map((i) => (i.id === id ? prev : i));
      emit();
      toast.error(`Failed to update invoice: ${e?.message ?? "unknown error"}`);
    }
  })();
}

export function deleteArInvoice(id: string) {
  const prev = invoices;
  invoices = invoices.filter((i) => i.id !== id);
  emit();
  if (!isUuid(id)) return;
  void (async () => {
    try {
      const { error } = await supabase.from("accounting_ar_invoices").delete().eq("id", id);
      if (error) throw error;
    } catch (e: any) {
      console.warn("[arInvoicesStore] delete failed", e);
      invoices = prev;
      emit();
      toast.error(`Failed to delete invoice: ${e?.message ?? "unknown error"}`);
    }
  })();
}