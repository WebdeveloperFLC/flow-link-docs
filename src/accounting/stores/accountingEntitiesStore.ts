import { useSyncExternalStore } from "react";
import { SettingsEntity } from "../types/settings";

const STORAGE_KEY = "accounting:entities:v2";

const SEED: SettingsEntity[] = [];

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