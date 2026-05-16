import { createPersistedStore, genId } from "./_persist";
import type { CardReconciliation } from "../types/cardReconciliation";

const store = createPersistedStore<CardReconciliation[]>(
  "accounting:card-reconciliation:v1",
  []
);

export const useCardReconciliations = () => store.use();
export const getCardReconciliations = () => store.get();
export const getCardReconciliation = (id: string) =>
  store.get().find((r) => r.id === id);

export function addCardReconciliation(
  input: Omit<CardReconciliation, "id" | "createdAt">
): CardReconciliation {
  const created: CardReconciliation = {
    id: genId("cr"),
    createdAt: new Date().toISOString(),
    ...input,
  };
  store.set([created, ...store.get()]);
  return created;
}

export function updateCardReconciliation(
  id: string,
  patch: Partial<CardReconciliation>
) {
  store.set(
    store.get().map((r) => (r.id === id ? { ...r, ...patch } : r))
  );
}

export function deleteCardReconciliation(id: string) {
  store.set(store.get().filter((r) => r.id !== id));
}

export function nextReconciliationNumber(month: string): string {
  const year = new Date().getFullYear();
  const monthCode = month.slice(0, 3).toUpperCase();
  return `CR-${year}-${monthCode}`;
}