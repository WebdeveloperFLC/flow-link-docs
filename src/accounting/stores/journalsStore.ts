import { createPersistedStore, genId } from "./_persist";
import { MOCK_JOURNALS } from "../data/mockJournals";
import type { Journal } from "../data/mockJournals";

const store = createPersistedStore<Journal[]>("accounting:journals:v3", MOCK_JOURNALS);

export const useJournals = () => store.use();
export const getJournals = () => store.get();
export const getJournal = (id: string) => store.get().find((j) => j.id === id);

export function addJournal(input: Omit<Journal, "id">): Journal {
  const created: Journal = { id: genId("jrn"), ...input } as Journal;
  store.set([created, ...store.get()]);
  return created;
}

export function updateJournal(id: string, patch: Partial<Journal>) {
  store.set(store.get().map((j) => (j.id === id ? { ...j, ...patch } : j)));
}

export function deleteJournal(id: string) {
  store.set(store.get().filter((j) => j.id !== id));
}