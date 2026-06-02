import { useSyncExternalStore } from "react";
import { SettingsEntity } from "../types/settings";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

const STORAGE_KEY = "accounting:entities:v4";

type SeedEntity = SettingsEntity & {
  registeredAddress?: string;
  incorporatedOn?: string;
  directors?: string[];
  note?: string;
  legalName?: string;
  taxYearEnd?: string;
};

const SEED: SettingsEntity[] = ([
  // ── INDIA — 3 registered companies ──
  {
    id: "e-flc-india",
    name: "Future Link Consultants Pvt Ltd",
    type: "COMPANY",
    parentId: null,
    country: "IN",
    currency: "INR",
    fiscalYearStart: "04-01",
    taxIds: [
      { label: "CIN", value: "U74999GJ2021PTC123559" },
      { label: "PAN", value: "AAECF6140K" },
      { label: "TAN", value: "BRDF00780D" },
      { label: "GSTIN", value: "24AAECF6140K1ZP" },
    ],
    registeredAddress: "Shop 215-216, Atlantis, Vadivadi, Sarabhai Compound, Vadodara, Gujarat 390023, India",
    incorporatedOn: "2021-06-24",
    directors: ["Santosh Dwarkadas Ramrakhiani", "Krishaa Santosh Ramrakhiani"],
  },
  {
    id: "e-flvc-india",
    name: "Future Link Visa Consultants Pvt Ltd",
    type: "COMPANY",
    parentId: null,
    country: "IN",
    currency: "INR",
    fiscalYearStart: "04-01",
    taxIds: [
      { label: "CIN", value: "U74900GJ2009PTC057220" },
      { label: "PAN", value: "AABCF3724G" },
      { label: "GSTIN", value: "24AABCF3724G1Z1" },
    ],
    registeredAddress: "216 Atlantis, Opp Vadodara Central, Nr. Genda Circle, Vadodara, Gujarat 390023, India",
    incorporatedOn: "2009-06-10",
    directors: ["Santosh Dwarkadas Ramrakhiani", "Krishaa Santosh Ramrakhiani"],
  },
  {
    id: "e-flae-india",
    name: "Future Link Academic Excellence Pvt Ltd",
    type: "COMPANY",
    parentId: null,
    country: "IN",
    currency: "INR",
    fiscalYearStart: "04-01",
    taxIds: [
      { label: "CIN", value: "U74991GJ2017PTC096530" },
      { label: "PAN", value: "AADCF0528Q" },
      { label: "GSTIN", value: "" },
    ],
    registeredAddress: "216 Atlantis Complex, Opp Vadodara Central, Nr. Genda Circle, Vadodara, Gujarat 390023, India",
    incorporatedOn: "2017-03-27",
    directors: ["Santosh Dwarkadas Ramrakhiani", "Krishaa Santosh Ramrakhiani"],
    note: "Formerly Future Link Educational and Immigration Services Pvt Ltd. Name changed April 2017.",
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
    fiscalYearStart: "09-01",
    taxIds: [
      { label: "BN", value: "851089714" },
      { label: "GST/HST RT", value: "851089714RT0001" },
      { label: "Payroll RP", value: "851089714RP0001" },
      { label: "Corporate Tax RC", value: "851089714RC0001" },
    ],
    legalName: "FUTURE LINK CONSULTANTS INC.",
    taxYearEnd: "August 31",
  },
  {
    id: "e-fwc-canada",
    name: "Future Way Consultants Inc",
    type: "COMPANY",
    parentId: null,
    country: "CA",
    currency: "CAD",
    fiscalYearStart: "01-01",
    taxIds: [
      { label: "BN", value: "819356389" },
      { label: "GST/HST RT", value: "819356389RT0001" },
      { label: "Payroll RP", value: "819356389RP0001" },
      { label: "Corporate Tax RC", value: "819356389RC0001" },
    ],
    legalName: "FUTUREWAY CONSULTANTS INC.",
    taxYearEnd: "December 31",
  },
  {
    id: "e-ontario-inc",
    name: "Ontario Inc 2709223",
    type: "COMPANY",
    parentId: null,
    country: "CA",
    currency: "CAD",
    fiscalYearStart: "01-01",
    taxIds: [
      { label: "BN", value: "778840876" },
      { label: "GST/HST RT", value: "778840876RT0001" },
      { label: "Payroll RP", value: "778840876RP0001" },
      { label: "Corporate Tax RC", value: "778840876RC0001" },
    ],
    legalName: "2709223 ONTARIO INC.",
    taxYearEnd: "December 31",
  },
  { id: "e-toronto", name: "Toronto — Ontario", type: "BRANCH", parentId: "e-flc-canada", country: "CA", currency: "CAD", fiscalYearStart: "04-01", taxIds: [] },

  // ── USA — office only, no legal entity. Payments via Canada or India. ──
  { id: "e-usa-office", name: "Finksburg — Maryland (Office)", type: "BRANCH", parentId: "e-flc-canada", country: "US", currency: "USD", fiscalYearStart: "04-01", taxIds: [] },
] as SeedEntity[]) as SettingsEntity[];

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
let hydrating = false;
let rlsLogged = false;
async function hydrateFromSupabase() {
  if (hydrated || hydrating || typeof window === "undefined") return;
  hydrating = true;
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
    // DB is the source of truth. Replace local seed entirely to avoid
    // duplicate names appearing (seed rows use string ids, DB uses UUIDs,
    // so id-based merge never dedupes by name).
    entities = dbMapped;
    emit();
    hydrated = true;
  } catch (e) {
    console.warn("[entitiesStore] Supabase hydration error:", e);
  } finally {
    hydrating = false;
  }
}
import { runWhenAuthReady } from "./_hydrationGate";
runWhenAuthReady(hydrateFromSupabase);

export function useEntities(): SettingsEntity[] {
  const all = useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
  // Entity dropdowns across the app should only show legal ledger owners
  // (COMPANY rows). BRANCH/SUB_BRANCH rows live in the same table but are
  // not selectable as an "Entity". Admin screens that manage the full list
  // (incl. branches) should use `useAllEntities`.
  return all.filter((e) => e.type === "COMPANY");
}
export function getEntities(): SettingsEntity[] {
  return entities.filter((e) => e.type === "COMPANY");
}

// Unfiltered access — for the entities admin page and parent-entity pickers
// that legitimately need to see BRANCH / SUB_BRANCH rows too.
export function useAllEntities(): SettingsEntity[] {
  return useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
}
export function getAllEntities(): SettingsEntity[] { return entities; }

export function addEntity(e: Omit<SettingsEntity, "id">): SettingsEntity {
  const id = typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : `e${Date.now().toString(36)}`;
  const created: SettingsEntity = { ...e, id };
  entities = [...entities, created];
  emit();
  if (isUuid(created.id)) {
    void (async () => {
      const payload = { id: created.id, ...mapToDb(created) } as never;
      const { data, error } = await supabase
        .from("accounting_entities")
        .insert(payload)
        .select()
        .single();
      if (error) {
        console.error("[entitiesStore] addEntity failed:", error.message);
        toast.error(`Failed to save entity: ${error.message}`);
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
        toast.error(`Failed to update entity: ${error.message}`);
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
        toast.error(`Failed to delete entity: ${error.message}`);
        entities = prevAll;
        emit();
      }
    })();
  }
}