import { useCallback, useEffect, useState } from "react";

/**
 * Saved views for CRM list workspaces (Clients, Leads).
 *
 * A "view" is a named snapshot of the list's filter/sort state, stored as a
 * URL query string. Persistence is per-browser via localStorage — no schema,
 * no server, no business-logic impact. This mirrors the "saved views" pattern
 * users expect from Salesforce/HubSpot without any backend change.
 *
 * NOTE (needs local validation): localStorage is per-device and not synced
 * across browsers/users. A server-backed, shareable version is listed as a
 * future enhancement in the release readiness report.
 */

export type SavedView = {
  id: string;
  name: string;
  /** URLSearchParams string, e.g. "status=qualified&sort=full_name". */
  query: string;
};

export type SavedViewNamespace = "clients" | "leads";

const KEY_PREFIX = "crm:savedViews:";

function storageKey(ns: SavedViewNamespace) {
  return `${KEY_PREFIX}${ns}`;
}

function read(ns: SavedViewNamespace): SavedView[] {
  try {
    const raw = localStorage.getItem(storageKey(ns));
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(
      (v): v is SavedView =>
        v && typeof v.id === "string" && typeof v.name === "string" && typeof v.query === "string",
    );
  } catch {
    return [];
  }
}

function write(ns: SavedViewNamespace, views: SavedView[]) {
  try {
    localStorage.setItem(storageKey(ns), JSON.stringify(views));
  } catch {
    /* storage unavailable (private mode / quota) — degrade gracefully */
  }
}

/**
 * Params that should NOT be captured in a saved view (they are transient and
 * would make an otherwise-identical view look "unmatched").
 */
const IGNORED_PARAMS = new Set(["page"]);

/** Normalize a query string for storage/comparison (sorted, transient keys removed). */
export function normalizeViewQuery(search: string | URLSearchParams): string {
  const params = new URLSearchParams(search);
  const entries: Array<[string, string]> = [];
  params.forEach((value, key) => {
    if (!IGNORED_PARAMS.has(key) && value !== "") entries.push([key, value]);
  });
  entries.sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0));
  const out = new URLSearchParams();
  for (const [k, v] of entries) out.append(k, v);
  return out.toString();
}

export function useSavedViews(ns: SavedViewNamespace) {
  const [views, setViews] = useState<SavedView[]>(() => read(ns));

  // Re-read when the namespace changes.
  useEffect(() => {
    setViews(read(ns));
  }, [ns]);

  const addView = useCallback(
    (name: string, query: string) => {
      const trimmed = name.trim();
      if (!trimmed) return;
      const normalized = normalizeViewQuery(query);
      setViews((prev) => {
        // Replace a same-named view rather than duplicating.
        const withoutDup = prev.filter((v) => v.name.toLowerCase() !== trimmed.toLowerCase());
        const next = [
          ...withoutDup,
          { id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`, name: trimmed, query: normalized },
        ];
        write(ns, next);
        return next;
      });
    },
    [ns],
  );

  const removeView = useCallback(
    (id: string) => {
      setViews((prev) => {
        const next = prev.filter((v) => v.id !== id);
        write(ns, next);
        return next;
      });
    },
    [ns],
  );

  return { views, addView, removeView };
}
