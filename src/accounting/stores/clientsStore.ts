import { createPersistedStore, genId } from "./_persist";
import { MOCK_CLIENTS } from "../data/mockClients";
import type { Client } from "../types/clients";

const store = createPersistedStore<Client[]>("accounting:clients:v1", MOCK_CLIENTS);

export const useClients = () => store.use();
export const getClients = () => store.get();
export const getClient = (id: string) => store.get().find((c) => c.id === id);

export function addClient(input: Omit<Client, "id" | "outstandingReceivable" | "ytdRevenue" | "lastTxnDate"> & Partial<Pick<Client, "outstandingReceivable" | "ytdRevenue" | "lastTxnDate">>): Client {
  const created: Client = {
    id: genId("c"),
    outstandingReceivable: 0,
    ytdRevenue: 0,
    lastTxnDate: new Date().toISOString().slice(0, 10),
    ...input,
  } as Client;
  store.set([created, ...store.get()]);
  return created;
}

export function updateClient(id: string, patch: Partial<Client>) {
  store.set(store.get().map((c) => (c.id === id ? { ...c, ...patch } : c)));
}

export function deleteClient(id: string) {
  store.set(store.get().filter((c) => c.id !== id));
}