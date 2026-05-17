## Goal

Migrate `accountingEntitiesStore` then `accountingMastersStore` to Supabase using the same hybrid optimistic-cache + background sync pattern as `coaStore`. No page/component edits — public API signatures stay identical (`useEntities`, `getEntities`, `addEntity`, `updateEntity`, `deleteEntity`, `useMaster`, `getMaster`, `masterLabel`, `addMasterItem`, `removeMasterItem`).

## Order

1. `accountingEntitiesStore.ts` only — verify build, report, stop.
2. After confirmation: `accountingMastersStore.ts` only — verify build, report, stop.

---

## Step 1 — accountingEntitiesStore

Target table: `accounting_entities` (cols: `id uuid`, `name`, `type`, `parent_id`, `country`, `currency`, `fiscal_year_start`, `tax_ids jsonb`, `is_active`, `created_by`).

Changes inside `accountingEntitiesStore.ts` only:
- Keep `SEED`, localStorage cache, `useSyncExternalStore` subscribe model unchanged.
- Add `mapFromDb` / `mapToDb` (snake_case ↔ camelCase, `taxIds` ↔ `tax_ids` jsonb).
- Add `hydrateFromSupabase()` fired once on module load: SELECT `accounting_entities`, merge by id with local cache (DB rows win), emit. On error: keep local cache, console.warn.
- `addEntity`: generate uuid via `crypto.randomUUID()` (replacing `e${Date.now()...}`), optimistic insert into local array + emit, then background `supabase.from('accounting_entities').insert({...mapToDb, created_by: auth.uid}).select().single()`. On error: revert + sonner toast.
- `updateEntity`: optimistic patch + emit, then background `update(mapToDb(patch)).eq('id', id)`. On error: revert + toast.
- `deleteEntity`: keep current child re-parent logic locally + emit, then background `delete().eq('id', id)` for the deleted row AND `update({ parent_id: newParent }).eq('parent_id', id)` for re-parented children. On error: revert + toast.
- String-id seed rows (e.g. `e-flc-india`) stay local-only — DB inserts skipped for any id not matching uuid regex (these are seed-only references already used by other stores as `entityId` keys, never written by users).

Verify: build passes, `/accounting/settings/entities` still lists seeds, add/edit/delete still works locally, new rows appear in `accounting_entities` table.

---

## Step 2 — accountingMastersStore

Target table: `accounting_masters` (cols: `id uuid`, `list_key`, `code`, `label`, `is_system`, `sort_order`, `metadata jsonb`, `UNIQUE(list_key, code)`).

Shape difference: store holds `Record<MasterListKey, MasterItem[]>` keyed by list. DB stores flat rows with `list_key`. Mapping handled inside store.

Changes inside `accountingMastersStore.ts` only (keep `createPersistedStore` for local cache):
- Add `hydrateFromSupabase()` on module load: SELECT `accounting_masters`, group by `list_key`, merge with local SEED+cache (DB rows override by `(list_key, code)`), call `store.set(merged)`.
- `addMasterItem`: keep existing slug + dedupe logic, optimistic `store.set`, then background `insert({ list_key: key, code, label, metadata, is_system: false })`. On error: revert + toast.
- `removeMasterItem`: keep `system` guard, optimistic remove, then background `delete().eq('list_key', key).eq('code', code)`. On error: revert + toast.
- Keep legacy `accounting:vendor-categories:v1` migration block as-is.
- `useMaster` / `getMaster` / `masterLabel` signatures unchanged.

Seed items stay local; only user-added items (`is_system: false`) round-trip to DB. Hydration merges DB rows over seeds so deletions/edits of seed-overrides work later.

Verify: build passes, `/accounting/settings/masters` (or wherever DynamicSelect is used) still shows all seed lists, adding a new currency/tax code persists to `accounting_masters`.

---

## Out of scope this round

- No changes to `journalsStore`, pages, dialogs, or `accountingEntityStore.ts` (singleton wrapper).
- No realtime, no bulk seed-to-DB migration script.
- No CRM, no commissions.

After Step 1 I will report files changed and wait for your go-ahead before Step 2.