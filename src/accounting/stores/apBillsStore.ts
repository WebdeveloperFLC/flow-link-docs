import { createPersistedStore, genId } from "./_persist";
import { MOCK_BILLS } from "../data/mockAP";
import type { VendorBill } from "../data/mockAP";

const store = createPersistedStore<VendorBill[]>("accounting:ap-bills:v2", MOCK_BILLS);

export const useApBills = () => store.use();
export const getApBills = () => store.get();
export const getApBill = (id: string) => store.get().find((b) => b.id === id);

export function addApBill(input: Omit<VendorBill, "id">): VendorBill {
  const created: VendorBill = { id: genId("bill"), ...input } as VendorBill;
  store.set([created, ...store.get()]);
  return created;
}

export function updateApBill(id: string, patch: Partial<VendorBill>) {
  store.set(store.get().map((b) => (b.id === id ? { ...b, ...patch } : b)));
}

export function deleteApBill(id: string) {
  store.set(store.get().filter((b) => b.id !== id));
}