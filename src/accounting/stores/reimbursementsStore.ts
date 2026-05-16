import { createPersistedStore, genId } from "./_persist";
import type { ReimbursementClaim } from "../types/reimbursements";

const store = createPersistedStore<ReimbursementClaim[]>(
  "accounting:reimbursements:v1",
  []
);

export const useReimbursements = () => store.use();
export const getReimbursements = () => store.get();
export const getReimbursement = (id: string) =>
  store.get().find((c) => c.id === id);

export function addReimbursement(
  input: Omit<ReimbursementClaim, "id" | "createdAt" | "updatedAt">
): ReimbursementClaim {
  const now = new Date().toISOString();
  const created: ReimbursementClaim = {
    id: genId("rmb"),
    createdAt: now,
    updatedAt: now,
    ...input,
  };
  store.set([created, ...store.get()]);
  return created;
}

export function updateReimbursement(
  id: string,
  patch: Partial<ReimbursementClaim>
) {
  store.set(
    store.get().map((c) =>
      c.id === id ? { ...c, ...patch, updatedAt: new Date().toISOString() } : c
    )
  );
}

export function deleteReimbursement(id: string) {
  store.set(store.get().filter((c) => c.id !== id));
}

export function nextClaimNumber(): string {
  const year = new Date().getFullYear();
  const n = store.get().filter((c) => c.claimNumber.includes(String(year))).length + 1;
  return `RMB-${year}-${String(n).padStart(3, "0")}`;
}