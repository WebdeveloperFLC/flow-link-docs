import { useSyncExternalStore } from "react";
import { toast } from "sonner";
import { MOCK_CLIENTS } from "../data/mockClients";
import type { Client, ClientSegment, ClientStatus, ClientType } from "../types/clients";
import { supabase } from "@/integrations/supabase/client";

const STORAGE_KEY = "accounting:clients:v3";
const UUID_RX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const isUuid = (v: string | null | undefined) => !!v && UUID_RX.test(v);

function newUuid(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) return crypto.randomUUID();
  return `${Date.now().toString(16)}-xxxx-4xxx-yxxx-xxxxxxxxxxxx`.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    return (c === "x" ? r : (r & 0x3) | 0x8).toString(16);
  });
}

let clients: Client[] = (() => {
  if (typeof window === "undefined") return MOCK_CLIENTS;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw) as Client[];
  } catch {
    // Ignore malformed local cache and fall back to seed data.
  }
  return MOCK_CLIENTS;
})();

const listeners = new Set<() => void>();
function emit() {
  try { window.localStorage.setItem(STORAGE_KEY, JSON.stringify(clients)); } catch {
    // Ignore localStorage write failures.
  }
  listeners.forEach((l) => l());
}

type ErrorLike = { message?: string };
const errMsg = (e: unknown) => ((e as ErrorLike)?.message ?? "unknown error");

type ClientRow = {
  id: string;
  name: string | null;
  legal_name: string | null;
  segment: ClientSegment | null;
  client_type: ClientType | null;
  country: string | null;
  tax_id: string | null;
  payment_terms: string | null;
  currency: Client["currency"] | null;
  status: ClientStatus | null;
  email: string | null;
  phone: string | null;
  address: string | null;
  account_manager: string | null;
  counselor_id: string | null;
  counselor_name: string | null;
  service_package: string | null;
  visa_category: string | null;
  intake: string | null;
  lead_source: string | null;
  notes: string | null;
  linked_crm_client_id: string | null;
};

// ─── DB mapping ─────────────────────────────────────────────────────────────
// Local-only: outstandingReceivable, ytdRevenue, lastTxnDate, totalRefunds, totalDiscounts.
function mapToDb(c: Client): Record<string, unknown> {
  return {
    id: c.id,
    name: c.name,
    legal_name: c.legalName || null,
    segment: c.segment || null,
    client_type: c.clientType || null,
    country: c.country || null,
    tax_id: c.taxId || null,
    payment_terms: c.paymentTerms || null,
    currency: c.currency || "INR",
    status: c.status || "ACTIVE",
    email: c.email || null,
    phone: c.phone || null,
    address: c.address || null,
    account_manager: c.accountManager || null,
    counselor_id: c.counselorId || null,
    counselor_name: c.counselorName || null,
    service_package: c.servicePackage || null,
    visa_category: c.visaCategory || null,
    intake: c.intake || null,
    lead_source: c.leadSource || null,
    notes: c.notes || null,
    linked_crm_client_id: isUuid(c.linkedCrmClientId) ? c.linkedCrmClientId : null,
  };
}

function mergeFromDb(local: Client | undefined, row: ClientRow): Client {
  return {
    id: row.id,
    name: row.name ?? local?.name ?? "",
    legalName: row.legal_name ?? local?.legalName ?? "",
    segment: (row.segment ?? local?.segment ?? "SMB") as ClientSegment,
    clientType: (row.client_type ?? local?.clientType) as ClientType | undefined,
    country: row.country ?? local?.country ?? "",
    taxId: row.tax_id ?? local?.taxId ?? "",
    paymentTerms: row.payment_terms ?? local?.paymentTerms ?? "Net 30",
    currency: (row.currency ?? local?.currency ?? "INR") as Client["currency"],
    status: (row.status ?? local?.status ?? "ACTIVE") as ClientStatus,
    outstandingReceivable: local?.outstandingReceivable ?? 0,
    ytdRevenue: local?.ytdRevenue ?? 0,
    lastTxnDate: local?.lastTxnDate ?? new Date().toISOString().slice(0, 10),
    email: row.email ?? local?.email ?? "",
    phone: row.phone ?? local?.phone ?? "",
    address: row.address ?? local?.address ?? "",
    accountManager: row.account_manager ?? local?.accountManager ?? "",
    counselorId: row.counselor_id ?? local?.counselorId,
    counselorName: row.counselor_name ?? local?.counselorName,
    servicePackage: row.service_package ?? local?.servicePackage,
    visaCategory: row.visa_category ?? local?.visaCategory,
    intake: row.intake ?? local?.intake,
    leadSource: row.lead_source ?? local?.leadSource,
    notes: row.notes ?? local?.notes,
    linkedCrmClientId: row.linked_crm_client_id ?? local?.linkedCrmClientId,
    totalRefunds: local?.totalRefunds,
    totalDiscounts: local?.totalDiscounts,
  };
}

async function hydrateFromSupabase() {
  try {
    const { data, error } = await (supabase.from as never)("accounting_clients").select("*");
    if (error) throw error;
    if (!data) return;
    const byId = new Map(clients.map((c) => [c.id, c]));
    for (const row of (data as unknown as ClientRow[])) byId.set(row.id, mergeFromDb(byId.get(row.id), row));
    clients = Array.from(byId.values());
    emit();
  } catch (e) {
    console.warn("[clientsStore] hydrate failed", e);
  }
}
import { runWhenAuthReady } from "./_hydrationGate";
runWhenAuthReady(hydrateFromSupabase);

// ─── Public API ─────────────────────────────────────────────────────────────
export function useClients(): Client[] {
  return useSyncExternalStore(
    (l) => { listeners.add(l); return () => listeners.delete(l); },
    () => clients,
    () => clients,
  );
}
export const getClients = () => clients;
export const getClient = (id: string) => clients.find((c) => c.id === id);

export function addClient(
  input: Omit<Client, "id" | "outstandingReceivable" | "ytdRevenue" | "lastTxnDate"> &
    Partial<Pick<Client, "outstandingReceivable" | "ytdRevenue" | "lastTxnDate">>
): Client {
  const created: Client = {
    id: newUuid(),
    outstandingReceivable: 0,
    ytdRevenue: 0,
    lastTxnDate: new Date().toISOString().slice(0, 10),
    ...input,
  } as Client;
  clients = [created, ...clients];
  emit();
  void (async () => {
    try {
      const { data: u } = await supabase.auth.getUser();
      const { error } = await (supabase.from as never)("accounting_clients")
        .insert({ ...mapToDb(created), created_by: u?.user?.id ?? null });
      if (error) throw error;
    } catch (e: unknown) {
      console.warn("[clientsStore] insert failed", e);
      clients = clients.filter((c) => c.id !== created.id);
      emit();
      toast.error(`Failed to save client: ${errMsg(e)}`);
    }
  })();
  return created;
}

export function updateClient(id: string, patch: Partial<Client>) {
  const prev = clients.find((c) => c.id === id);
  if (!prev) return;
  const next = { ...prev, ...patch };
  clients = clients.map((c) => (c.id === id ? next : c));
  emit();
  if (!isUuid(id)) return;
  void (async () => {
    try {
      const { error } = await (supabase.from as never)("accounting_clients")
        .update(mapToDb(next))
        .eq("id", id);
      if (error) throw error;
    } catch (e: unknown) {
      console.warn("[clientsStore] update failed", e);
      clients = clients.map((c) => (c.id === id ? prev : c));
      emit();
      toast.error(`Failed to update client: ${errMsg(e)}`);
    }
  })();
}

export function deleteClient(id: string) {
  const prev = clients;
  clients = clients.filter((c) => c.id !== id);
  emit();
  if (!isUuid(id)) return;
  void (async () => {
    try {
      const { error } = await (supabase.from as never)("accounting_clients").delete().eq("id", id);
      if (error) throw error;
    } catch (e: unknown) {
      console.warn("[clientsStore] delete failed", e);
      clients = prev;
      emit();
      toast.error(`Failed to delete client: ${errMsg(e)}`);
    }
  })();
}
