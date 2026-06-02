import { useSyncExternalStore } from "react";

/**
 * Tiny persistence helper used by every Accounting store.
 * Loads from localStorage on first read, writes on every mutation,
 * notifies React subscribers via useSyncExternalStore.
 */
export function createPersistedStore<T>(key: string, seed: T) {
  let state: T = (() => {
    if (typeof window === "undefined") return seed;
    try {
      const raw = window.localStorage.getItem(key);
      if (raw) return JSON.parse(raw) as T;
    } catch {
      // Ignore malformed local cache and use fallback.
    }
    return seed;
  })();

  const listeners = new Set<() => void>();

  const emit = () => {
    try { window.localStorage.setItem(key, JSON.stringify(state)); } catch {
      // Ignore localStorage write failures.
    }
    listeners.forEach((l) => l());
  };

  return {
    get: () => state,
    set: (next: T) => { state = next; emit(); },
    update: (mut: (prev: T) => T) => { state = mut(state); emit(); },
    use: () =>
      useSyncExternalStore(
        (l) => { listeners.add(l); return () => listeners.delete(l); },
        () => state,
        () => state,
      ),
  };
}

export function genId(prefix: string) {
  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;
}