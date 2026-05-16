import { createPersistedStore, genId } from "./_persist";
import type { MockDocument } from "../data/mockDocuments";

const store = createPersistedStore<MockDocument[]>(
  "accounting:documents:v1",
  []
);

/** In-memory cache of the original File blob for the current session only.
 *  Raw PDF bytes are too large to keep in localStorage, so they're kept here
 *  and lost on hard refresh — metadata + extracted JSON persist. */
const fileBlobs = new Map<string, File>();

export const useDocuments = () => store.use();
export const getDocuments = () => store.get();
export const getDocument = (id: string) =>
  store.get().find((d) => d.id === id);

export function addDocument(
  input: Omit<MockDocument, "id">,
  file?: File,
): MockDocument {
  const created: MockDocument = {
    id: genId("doc"),
    ...input,
    tags: input.tags ?? [],
  };
  if (file) fileBlobs.set(created.id, file);
  store.set([created, ...store.get()]);
  return created;
}

export function updateDocument(id: string, patch: Partial<MockDocument>) {
  store.set(store.get().map((d) => (d.id === id ? { ...d, ...patch } : d)));
}

export function deleteDocument(id: string) {
  fileBlobs.delete(id);
  store.set(store.get().filter((d) => d.id !== id));
}

export function getDocumentFile(id: string): File | undefined {
  return fileBlobs.get(id);
}

export function hasDocumentFile(id: string): boolean {
  return fileBlobs.has(id);
}