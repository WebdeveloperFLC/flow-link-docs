import { useSyncExternalStore } from "react";
import { toast } from "sonner";
import { MOCK_VENDORS } from "../data/mockVendors";
import type { Vendor, VendorCategory, VendorStatus } from "../types/vendors";
import { supabase } from "@/integrations/supabase/client";

const STORAGE_KEY = "accounting:vendors:v3";
const UUID_RX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const isUuid = (v: string | null | undefined) => !!v && UUID_RX.test(v);

function newUuid(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) return crypto.randomUUID();
  return `${Date.now().toString(16)}-xxxx-4xxx-yxxx-xxxxxxxxxxxx`.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    return (c === "x" ? r : (r & 0x3) | 0x8).toString(16);
  });
}

let vendors: Vendor[] = (() => {
  if (typeof window === "undefined") return MOCK_VENDORS;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw) as Vendor[];
  } catch {}
  return MOCK_VENDORS;
})();

const listeners = new Set<() => void>();
function emit() {
  try { window.localStorage.setItem(STORAGE_KEY, JSON.stringify(vendors)); } catch {}
  listeners.forEach((l) => l());
}

// ─── DB mapping ─────────────────────────────────────────────────────────────
// DB stores subset; address, outstandingBalance, ytdSpend, lastTxnDate,
// contact* are local-only and preserved on hydrate.
function mapToDb(v: Vendor): Record<string, unknown> {
  return {
    id: v.id,
    name: v.name,
    company_name: v.legalName || null,
    category: v.category || null,
    email: v.email || null,
    phone: v.phone || null,
    country: v.country || null,
    currency: v.currency || "INR",
    payment_terms: v.paymentTerms || null,
    tax_id: v.taxId || null,
    bank_account: v.bankAccount || null,
    status: v.status || "ACTIVE",
  };
}

function mergeFromDb(local: Vendor | undefined, row: any): Vendor {
  return {
    id: row.id,
    name: row.name ?? local?.name ?? "",
    legalName: row.company_name ?? local?.legalName ?? "",
    category: (row.category ?? local?.category ?? "PROFESSIONAL_SERVICES") as VendorCategory,
    country: row.country ?? local?.country ?? "",
    taxId: row.tax_id ?? local?.taxId ?? "",
    paymentTerms: row.payment_terms ?? local?.paymentTerms ?? "Net 30",
    currency: (row.currency ?? local?.currency ?? "INR") as Vendor["currency"],
    status: (row.status ?? local?.status ?? "ACTIVE") as VendorStatus,
    outstandingBalance: local?.outstandingBalance ?? 0,
    ytdSpend: local?.ytdSpend ?? 0,
    lastTxnDate: local?.lastTxnDate ?? new Date().toISOString().slice(0, 10),
    email: row.email ?? local?.email ?? "",
    phone: row.phone ?? local?.phone ?? "",
    address: local?.address ?? "",
    bankAccount: row.bank_account ?? local?.bankAccount,
    contactName: local?.contactName,
    contactEmail: local?.contactEmail,
    contactPhone: local?.contactPhone,
  };
}

async function hydrateFromSupabase() {
  try {
    // Read from the safe view so non-admin accounting users get masked
    // banking fields (column-level REVOKE on the base table would otherwise
    // return null for these columns). Writes still go to accounting_vendors.
    const { data, error } = await supabase
      .from("accounting_vendors_safe" as any)
      .select("*");
    if (error) throw error;
    if (!data) return;
    const rows = data as any[];
    const byId = new Map(vendors.map((v) => [v.id, v]));
    for (const row of rows) byId.set(row.id, mergeFromDb(byId.get(row.id), row));
    vendors = Array.from(byId.values());
    emit();
  } catch (e) {
    console.warn("[vendorsStore] hydrate failed", e);
  }
}
import { runWhenAuthReady } from "./_hydrationGate";
runWhenAuthReady(hydrateFromSupabase);

// ─── Public API ─────────────────────────────────────────────────────────────
export function useVendors(): Vendor[] {
  return useSyncExternalStore(
    (l) => { listeners.add(l); return () => listeners.delete(l); },
    () => vendors,
    () => vendors,
  );
}
export const getVendors = () => vendors;
export const getVendor = (id: string) => vendors.find((v) => v.id === id);

export function addVendor(
  input: Omit<Vendor, "id" | "outstandingBalance" | "ytdSpend" | "lastTxnDate"> &
    Partial<Pick<Vendor, "outstandingBalance" | "ytdSpend" | "lastTxnDate">>
): Vendor {
  const created: Vendor = {
    id: newUuid(),
    outstandingBalance: 0,
    ytdSpend: 0,
    lastTxnDate: new Date().toISOString().slice(0, 10),
    ...input,
  } as Vendor;
  vendors = [created, ...vendors];
  emit();
  void (async () => {
    try {
      const { data: u } = await supabase.auth.getUser();
      const { error } = await supabase
        .from("accounting_vendors")
        .insert({ ...mapToDb(created), created_by: u?.user?.id ?? null } as any);
      if (error) throw error;
    } catch (e: any) {
      console.warn("[vendorsStore] insert failed", e);
      vendors = vendors.filter((v) => v.id !== created.id);
      emit();
      toast.error(`Failed to save vendor: ${e?.message ?? "unknown error"}`);
    }
  })();
  return created;
}

export function updateVendor(id: string, patch: Partial<Vendor>) {
  const prev = vendors.find((v) => v.id === id);
  if (!prev) return;
  const next = { ...prev, ...patch };
  vendors = vendors.map((v) => (v.id === id ? next : v));
  emit();
  if (!isUuid(id)) return;
  void (async () => {
    try {
      const { error } = await supabase
        .from("accounting_vendors")
        .update(mapToDb(next) as any)
        .eq("id", id);
      if (error) throw error;
    } catch (e: any) {
      console.warn("[vendorsStore] update failed", e);
      vendors = vendors.map((v) => (v.id === id ? prev : v));
      emit();
      toast.error(`Failed to update vendor: ${e?.message ?? "unknown error"}`);
    }
  })();
}

export function deleteVendor(id: string) {
  const prev = vendors;
  vendors = vendors.filter((v) => v.id !== id);
  emit();
  if (!isUuid(id)) return;
  void (async () => {
    try {
      const { error } = await supabase.from("accounting_vendors").delete().eq("id", id);
      if (error) throw error;
    } catch (e: any) {
      console.warn("[vendorsStore] delete failed", e);
      vendors = prev;
      emit();
      toast.error(`Failed to delete vendor: ${e?.message ?? "unknown error"}`);
    }
  })();
}
