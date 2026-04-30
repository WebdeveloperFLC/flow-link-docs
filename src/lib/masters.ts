import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export type MasterListKey =
  | "countries"
  | "application_types"
  | "document_types"
  | "relationships"
  | "qualification_levels"
  | "client_statuses"
  | "letter_kinds";

export interface MasterItem {
  id: string;
  list_key: string;
  code: string;
  label: string;
  metadata: Record<string, unknown>;
  is_active: boolean;
  sort_order: number;
}

/** In-memory cache so dropdowns across the app share one fetch per list. */
const cache = new Map<string, MasterItem[]>();
const subs = new Map<string, Set<(items: MasterItem[]) => void>>();
const inflight = new Map<string, Promise<MasterItem[]>>();

async function fetchList(key: MasterListKey): Promise<MasterItem[]> {
  if (inflight.has(key)) return inflight.get(key)!;
  const p = (async () => {
    const { data, error } = await supabase
      .from("master_items")
      .select("*")
      .eq("list_key", key)
      .eq("is_active", true)
      .order("sort_order", { ascending: true })
      .order("label", { ascending: true });
    if (error) {
      console.error("[masters] fetch failed", key, error);
      return [];
    }
    const items = (data ?? []) as MasterItem[];
    cache.set(key, items);
    inflight.delete(key);
    return items;
  })();
  inflight.set(key, p);
  return p;
}

/** Force a refresh — call after admin edits. */
export async function refreshMaster(key: MasterListKey) {
  cache.delete(key);
  inflight.delete(key);
  const items = await fetchList(key);
  subs.get(key)?.forEach((fn) => fn(items));
  return items;
}

/** Hook: returns active items (label + code) for a master list. */
export function useMasterItems(key: MasterListKey): MasterItem[] {
  const [items, setItems] = useState<MasterItem[]>(() => cache.get(key) ?? []);
  useEffect(() => {
    let alive = true;
    if (!cache.has(key)) {
      fetchList(key).then((it) => alive && setItems(it));
    } else {
      setItems(cache.get(key)!);
    }
    if (!subs.has(key)) subs.set(key, new Set());
    const set = subs.get(key)!;
    const handler = (it: MasterItem[]) => alive && setItems(it);
    set.add(handler);
    return () => {
      alive = false;
      set.delete(handler);
    };
  }, [key]);
  return items;
}

/** Convenience: just the labels (for the many dropdowns that key by label). */
export function useMasterLabels(key: MasterListKey): string[] {
  return useMasterItems(key).map((i) => i.label);
}

export async function loadAllMasters() {
  await Promise.all([
    fetchList("countries"),
    fetchList("application_types"),
    fetchList("document_types"),
    fetchList("relationships"),
    fetchList("qualification_levels"),
    fetchList("client_statuses"),
  ]);
}