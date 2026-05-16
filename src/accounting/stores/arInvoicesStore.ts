import { createPersistedStore, genId } from "./_persist";
import { MOCK_INVOICES } from "../data/mockAR";
import type { CustomerInvoice } from "../data/mockAR";

const store = createPersistedStore<CustomerInvoice[]>("accounting:ar-invoices:v3", MOCK_INVOICES);

export const useArInvoices = () => store.use();
export const getArInvoices = () => store.get();
export const getArInvoice = (id: string) => store.get().find((i) => i.id === id);

export function addArInvoice(input: Omit<CustomerInvoice, "id">): CustomerInvoice {
  const created: CustomerInvoice = { id: genId("inv"), ...input } as CustomerInvoice;
  store.set([created, ...store.get()]);
  return created;
}

export function updateArInvoice(id: string, patch: Partial<CustomerInvoice>) {
  store.set(store.get().map((i) => (i.id === id ? { ...i, ...patch } : i)));
}

export function deleteArInvoice(id: string) {
  store.set(store.get().filter((i) => i.id !== id));
}