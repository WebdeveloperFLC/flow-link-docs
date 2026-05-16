import { createPersistedStore, genId } from "./_persist";
import { MOCK_VENDORS } from "../data/mockVendors";
import type { Vendor } from "../types/vendors";

const store = createPersistedStore<Vendor[]>("accounting:vendors:v3", MOCK_VENDORS);

export const useVendors = () => store.use();
export const getVendors = () => store.get();
export const getVendor = (id: string) => store.get().find((v) => v.id === id);

export function addVendor(input: Omit<Vendor, "id" | "outstandingBalance" | "ytdSpend" | "lastTxnDate"> & Partial<Pick<Vendor, "outstandingBalance" | "ytdSpend" | "lastTxnDate">>): Vendor {
  const created: Vendor = {
    id: genId("v"),
    outstandingBalance: 0,
    ytdSpend: 0,
    lastTxnDate: new Date().toISOString().slice(0, 10),
    ...input,
  } as Vendor;
  store.set([created, ...store.get()]);
  return created;
}

export function updateVendor(id: string, patch: Partial<Vendor>) {
  store.set(store.get().map((v) => (v.id === id ? { ...v, ...patch } : v)));
}

export function deleteVendor(id: string) {
  store.set(store.get().filter((v) => v.id !== id));
}