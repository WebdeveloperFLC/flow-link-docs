## Root cause

`src/accounting/stores/accountingEntitiesStore.ts` is the only source the bank account dropdown uses (`useEntities()` → `topEntities` filter in `BankAccountFormDialog.tsx`). It contains a hardcoded `SEED` array of ~16 entities with string ids like `e-flc-india`, `e-flc-canada`, `e-fwc-canada`, etc.

On hydration from Supabase, `hydrateFromSupabase()` merges by **id only**:

```ts
const dbIds = new Set(dbMapped.map((e) => e.id));
const localKeep = entities.filter((e) => !dbIds.has(e.id));
entities = [...localKeep, ...dbMapped];
```

Since DB rows use UUIDs and seed rows use `e-*` strings, no id ever matches. Every entity that exists in both the seed and the DB (Future Link Consultants Inc, Future Way Consultants Inc, Ontario Inc 2709223, the 3 India Pvt Ltds, etc.) appears **twice** in the dropdown — exactly what the screenshots show.

The localStorage cache (`accounting:entities:v3`) also persists the merged duplicated list, so a refresh keeps showing duplicates.

## Fix (single file: `src/accounting/stores/accountingEntitiesStore.ts`)

1. When `hydrateFromSupabase()` succeeds and returns ≥1 row, **replace** `entities` with the DB rows entirely. The DB is the source of truth — seed is only a fallback for empty DB / offline first-load.
2. Bump `STORAGE_KEY` from `accounting:entities:v3` → `accounting:entities:v4` to invalidate the existing cached duplicated list in every user's browser.
3. No other files touched. No changes to `BankAccountFormDialog.tsx`, no changes to other modules, no DB changes, no RLS changes.

## Verification

- Reload `/accounting/bank-accounts` → open New bank account → Entity/company dropdown shows exactly the 8 DB entities, no duplicates.
- Other places using `useEntities()` (entity tree on Settings → Entities, branches dropdown, etc.) continue to work because branches in the seed (`e-vad-*`, `e-toronto`, `e-usa-office`) only existed in the seed, not the DB — they will disappear from the UI after the fix. If the user wants those branches preserved, they should be inserted into `accounting_entities` in the DB (out of scope for this fix unless requested).

## Open question before executing

The seed currently contains **branches** (Vadodara — Genda Circle, Toronto — Ontario, Finksburg — Maryland, etc.) that do NOT exist in the DB. After this fix those branches will no longer appear anywhere. Two options:

- **A. Drop them** (cleanest — DB becomes single source of truth, dropdown shows only 8). 
- **B. Migrate them into the DB first** as a one-time insert so they remain available under their parent companies, then apply the fix.

Please confirm A or B before I execute.
