import { useSyncExternalStore } from "react";
import { SettingsEntity } from "../types/settings";
import { supabase } from "@/integrations/supabase/client";

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

// ──────────────────────────────────────────────────────────────
// Supabase sync layer (hybrid: localStorage cache + background DB)
// ──────────────────────────────────────────────────────────────

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const isUuid = (s: string) => UUID_RE.test(s);

type EntityRow = {
  id: string; name: string; type: string;
  parent_id: string | null; country: string | null;
  currency: string | null; fiscal_year_start: string | null;
  tax_ids: unknown; is_active: boolean | null;
};

function mapFromDb(r: EntityRow): SettingsEntity {
  const taxIds = Array.isArray(r.tax_ids)
    ? (r.tax_ids as Array<{ label: string; value: string }>)
    : [];
  return {
    id: r.id,
    name: r.name,
    type: r.type as SettingsEntity["type"],
    parentId: r.parent_id,
    country: r.country ?? "",
    currency: r.currency ?? "",
    fiscalYearStart: r.fiscal_year_start ?? "04-01",
    taxIds,
  };
}

function mapToDb(e: SettingsEntity) {
  return {
    name: e.name,
    type: e.type,
    parent_id: e.parentId && isUuid(e.parentId) ? e.parentId : null,
    country: e.country ?? null,
    currency: e.currency ?? null,
    fiscal_year_start: e.fiscalYearStart ?? null,
    tax_ids: e.taxIds ?? [],
  } as const;
}

let hydrated = false;
let rlsLogged = false;
async function hydrateFromSupabase() {
  if (hydrated || typeof window === "undefined") return;
  hydrated = true;
  try {
    const { data, error } = await supabase
      .from("accounting_entities")
      .select("*");
    if (error) {
      if (!rlsLogged) {
        console.warn("[entitiesStore] Supabase read failed, using local cache:", error.message);
        rlsLogged = true;
      }
      return;
    }
    if (!data || data.length === 0) return;
    const dbMapped = (data as unknown as EntityRow[]).map(mapFromDb);
    const dbIds = new Set(dbMapped.map((e) => e.id));
    // Keep local seed/legacy (non-uuid) rows; DB rows win for any matching id.
    const localKeep = entities.filter((e) => !dbIds.has(e.id));
    entities = [...localKeep, ...dbMapped];
    emit();
  } catch (e) {
    console.warn("[entitiesStore] Supabase hydration error:", e);
  }
}
void hydrateFromSupabase();

async function getUserId(): Promise<string | null> {
  try {
    const { data } = await supabase.auth.getUser();
    return data.user?.id ?? null;
  } catch { return null; }
}

export function useEntities(): SettingsEntity[] {
  return useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
}
export function getEntities(): SettingsEntity[] { return entities; }

export function addEntity(e: Omit<SettingsEntity, "id">): SettingsEntity {
  const id = typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : `e${Date.now().toString(36)}`;
  const created: SettingsEntity = { ...e, id };
  entities = [...entities, created];
  emit();
  if (isUuid(created.id)) {
    void (async () => {
      const userId = await getUserId();
      const payload = { id: created.id, ...mapToDb(created), created_by: userId } as never;
      const { data, error } = await supabase
        .from("accounting_entities")
        .insert(payload)
        .select()
        .single();
      if (error) {
        console.error("[entitiesStore] addEntity failed:", error.message);
        entities = entities.filter((x) => x.id !== created.id);
        emit();
        return;
      }
      if (data) {
        const real = mapFromDb(data as unknown as EntityRow);
        entities = entities.map((x) => (x.id === created.id ? real : x));
        emit();
      }
    })();
  }
  return created;
}

export function updateEntity(id: string, patch: Partial<SettingsEntity>) {
  const prev = entities.find((e) => e.id === id);
  entities = entities.map((e) => (e.id === id ? { ...e, ...patch } : e));
  emit();
  if (isUuid(id)) {
    void (async () => {
      const next = entities.find((e) => e.id === id);
      if (!next) return;
      const { error } = await supabase
        .from("accounting_entities")
        .update(mapToDb(next) as never)
        .eq("id", id);
      if (error) {
        console.error("[entitiesStore] updateEntity failed:", error.message);
        if (prev) {
          entities = entities.map((e) => (e.id === id ? prev : e));
          emit();
        }
      }
    })();
  }
}

export function deleteEntity(id: string) {
  // Re-parent children to the deleted entity's parent
  const target = entities.find((e) => e.id === id);
  const newParent = target?.parentId ?? null;
  const prevAll = entities;
  const reparentedChildIds = entities
    .filter((e) => e.parentId === id)
    .map((e) => e.id);
  entities = entities
    .filter((e) => e.id !== id)
    .map((e) => (e.parentId === id ? { ...e, parentId: newParent } : e));
  emit();
  if (isUuid(id)) {
    void (async () => {
      // Re-parent children that have uuid ids
      const uuidChildren = reparentedChildIds.filter(isUuid);
      if (uuidChildren.length) {
        const { error: upErr } = await supabase
          .from("accounting_entities")
          .update({ parent_id: newParent && isUuid(newParent) ? newParent : null } as never)
          .in("id", uuidChildren);
        if (upErr) console.warn("[entitiesStore] reparent children failed:", upErr.message);
      }
      const { error } = await supabase
        .from("accounting_entities")
        .delete()
        .eq("id", id);
      if (error) {
        console.error("[entitiesStore] deleteEntity failed:", error.message);
        entities = prevAll;
        emit();
      }
    })();
  }
}