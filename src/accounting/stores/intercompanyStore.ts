import { createPersistedStore, genId } from "./_persist";
import type { IntercompanyTransaction } from "../types/intercompany";

const store = createPersistedStore<IntercompanyTransaction[]>(
  "accounting:intercompany:v1",
  []
);

export const useIntercompany = () => store.use();
export const getIntercompany = () => store.get();
export const getIntercompanyTxn = (id: string) =>
  store.get().find((t) => t.id === id);

export function addIntercompany(
  input: Omit<IntercompanyTransaction, "id" | "createdAt" | "updatedAt">
): IntercompanyTransaction {
  const now = new Date().toISOString();
  const created: IntercompanyTransaction = {
    id: genId("ic"),
    createdAt: now,
    updatedAt: now,
    ...input,
  };
  store.set([created, ...store.get()]);
  return created;
}

export function updateIntercompany(
  id: string,
  patch: Partial<IntercompanyTransaction>
) {
  store.set(
    store.get().map((t) =>
      t.id === id ? { ...t, ...patch, updatedAt: new Date().toISOString() } : t
    )
  );
}

export function deleteIntercompany(id: string) {
  store.set(store.get().filter((t) => t.id !== id));
}

export function nextIntercompanyNumber(): string {
  const year = new Date().getFullYear();
  const n = store.get().filter((t) => t.txnNumber.includes(String(year))).length + 1;
  return `IC-${year}-${String(n).padStart(3, "0")}`;
}