import { useSyncExternalStore } from "react";
import { SettingsEntity } from "../types/settings";

const STORAGE_KEY = "accounting:entities:v3";

const SEED: SettingsEntity[] = [
  // ── INDIA — 3 registered companies ──
  {
    id: "e-flc-india",
    name: "Future Link Consultants Pvt Ltd",
    type: "COMPANY",
    parentId: null,
    country: "IN",
    currency: "INR",
    fiscalYearStart: "04-01",
    // TODO: Add real GSTIN/PAN/CIN before going live
    taxIds: [
      { label: "GSTIN", value: "" },
      { label: "PAN", value: "" },
      { label: "CIN", value: "" },
    ],
  },
  {
    id: "e-flvc-india",
    name: "Future Link Visa Consultants Pvt Ltd",
    type: "COMPANY",
    parentId: null,
    country: "IN",
    currency: "INR",
    fiscalYearStart: "04-01",
    // TODO: Add real GSTIN/PAN/CIN before going live
    taxIds: [
      { label: "GSTIN", value: "" },
      { label: "PAN", value: "" },
      { label: "CIN", value: "" },
    ],
  },
  {
    id: "e-flae-india",
    name: "Future Link Academic Excellence Pvt Ltd",
    type: "COMPANY",
    parentId: null,
    country: "IN",
    currency: "INR",
    fiscalYearStart: "04-01",
    // TODO: Add real GSTIN/PAN/CIN before going live
    taxIds: [
      { label: "GSTIN", value: "" },
      { label: "PAN", value: "" },
      { label: "CIN", value: "" },
    ],
  },
  // ── INDIA — Gujarat branches (parented to primary entity) ──
  { id: "e-vad-genda", name: "Vadodara — Genda Circle", type: "BRANCH", parentId: "e-flc-india", country: "IN", currency: "INR", fiscalYearStart: "04-01", taxIds: [] },
  { id: "e-vad-bhayli", name: "Vadodara — Bhayli", type: "BRANCH", parentId: "e-flc-india", country: "IN", currency: "INR", fiscalYearStart: "04-01", taxIds: [] },
  { id: "e-vad-karelibaug", name: "Vadodara — Karelibaug", type: "BRANCH", parentId: "e-flc-india", country: "IN", currency: "INR", fiscalYearStart: "04-01", taxIds: [] },
  { id: "e-vad-manjalpur", name: "Vadodara — Manjalpur", type: "BRANCH", parentId: "e-flc-india", country: "IN", currency: "INR", fiscalYearStart: "04-01", taxIds: [] },
  { id: "e-vad-ajwa", name: "Vadodara — Ajwa Road", type: "BRANCH", parentId: "e-flc-india", country: "IN", currency: "INR", fiscalYearStart: "04-01", taxIds: [] },
  { id: "e-anand", name: "Anand — Gujarat", type: "BRANCH", parentId: "e-flc-india", country: "IN", currency: "INR", fiscalYearStart: "04-01", taxIds: [] },

  // ── CANADA — 3 registered companies (Toronto, ON) ──
  {
    id: "e-flc-canada",
    name: "Future Link Consultants Inc",
    type: "COMPANY",
    parentId: null,
    country: "CA",
    currency: "CAD",
    fiscalYearStart: "04-01",
    // TODO: Add real GST/HST and BN before going live
    taxIds: [
      { label: "GST/HST", value: "" },
      { label: "BN", value: "" },
    ],
  },
  {
    id: "e-fwc-canada",
    name: "Future Way Consultants Inc",
    type: "COMPANY",
    parentId: null,
    country: "CA",
    currency: "CAD",
    fiscalYearStart: "04-01",
    // TODO: Add real GST/HST and BN before going live
    taxIds: [
      { label: "GST/HST", value: "" },
      { label: "BN", value: "" },
    ],
  },
  {
    id: "e-ontario-inc",
    name: "Ontario Inc 2709223",
    type: "COMPANY",
    parentId: null,
    country: "CA",
    currency: "CAD",
    fiscalYearStart: "04-01",
    // TODO: Add real BN before going live
    taxIds: [{ label: "BN", value: "" }],
  },
  { id: "e-toronto", name: "Toronto — Ontario", type: "BRANCH", parentId: "e-flc-canada", country: "CA", currency: "CAD", fiscalYearStart: "04-01", taxIds: [] },

  // ── USA — office only, no legal entity. Payments via Canada or India. ──
  { id: "e-usa-office", name: "Finksburg — Maryland (Office)", type: "BRANCH", parentId: "e-flc-canada", country: "US", currency: "USD", fiscalYearStart: "04-01", taxIds: [] },
];

let entities: SettingsEntity[] = (() => {
  if (typeof window === "undefined") return SEED;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw) as SettingsEntity[];
  } catch {}
  return SEED;
})();

const listeners = new Set<() => void>();
function emit() {
  try { window.localStorage.setItem(STORAGE_KEY, JSON.stringify(entities)); } catch {}
  listeners.forEach((l) => l());
}
function subscribe(l: () => void) { listeners.add(l); return () => listeners.delete(l); }
function getSnapshot() { return entities; }

export function useEntities(): SettingsEntity[] {
  return useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
}
export function getEntities(): SettingsEntity[] { return entities; }

export function addEntity(e: Omit<SettingsEntity, "id">): SettingsEntity {
  const created: SettingsEntity = { ...e, id: `e${Date.now().toString(36)}` };
  entities = [...entities, created];
  emit();
  return created;
}

export function updateEntity(id: string, patch: Partial<SettingsEntity>) {
  entities = entities.map((e) => (e.id === id ? { ...e, ...patch } : e));
  emit();
}

export function deleteEntity(id: string) {
  // Re-parent children to the deleted entity's parent
  const target = entities.find((e) => e.id === id);
  const newParent = target?.parentId ?? null;
  entities = entities
    .filter((e) => e.id !== id)
    .map((e) => (e.parentId === id ? { ...e, parentId: newParent } : e));
  emit();
}