## Goal

Remove all institution mock/seed data so every tab shows only real DB rows scoped to the current institution. No cross-leak, no demo fallback. You'll re-seed fresh later.

## Why the leak is still happening

Even after strict scoping, `seedFromTemplate` in `src/institutions/repositories/index.ts` rekeys a deterministic mock template's rows onto each real institution id whenever its DB rows are empty. Two different real institutions whose hashes pick different templates therefore show two different "borrowed" datasets — which looks exactly like Centennial bleeding into Seneca, Seneca into Conestoga, etc.

## Changes (scoped to `src/institutions/` only)

1. **Delete mock data files**
   - `src/institutions/mock/canadianInstitutions.ts`
   - `src/institutions/mock/students.ts`
   - `src/institutions/mock/campaigns.ts`
   - Keep `src/institutions/mock/types.ts` and `src/institutions/mock/fieldDefinitions.ts` (these are type/config, not seed data).

2. **Strip mock seeding from `src/institutions/repositories/index.ts`**
   - Remove all mock imports, `USE_MOCK_DATA` branches, `seedFromTemplate`, and the rekey helper usage.
   - Each repo (`agreementsRepo`, `commissionsRepo` + `rules`, `claimCyclesRepo`, `invoicesRepo`, `promotionsRepo`, `campaignsRepo`, `suggestionsRepo`) returns only live DB rows strictly filtered by `institution_id`.
   - `sourcesMockRepo`, `studentsRepo`, `paymentsRepo` become empty-list stubs (or are removed and their call sites updated to return `[]`).

3. **Update `src/institutions/config.ts`**
   - Remove `USE_MOCK_DATA` (or set default `false` and leave unused) — whichever is least invasive given imports.

4. **Update `src/institutions/lib/scope.ts`**
   - Keep `getInstitutionRecords` (still useful as a strict filter helper).
   - Remove `pickMockTemplate` / `MOCK_TEMPLATE_IDS` / `rekeyToInstitution`.

5. **Audit consumers of removed exports**
   - `useMockSources`, `useStudents`, `usePayments` in `src/institutions/hooks/useInstitutionData.ts` → keep the hook signatures so panels compile, but they now always resolve to `[]`. Panels already render empty states for empty arrays.

6. **No DB writes**
   - We don't touch any Supabase tables. If real DB rows are wrong, you'll handle them via a fresh prompt later. This change only stops the in-memory mock fallback.

## Out of scope

- No UI redesign, no panel renames, no route changes.
- No edits to anything outside `src/institutions/` except where a removed export is imported (none expected).
- No DB migrations or row deletions.

## QA after apply

- Every institution detail tab (Overview, Sources, Documents, Agreements, Commissions, Claims, Promotions, Campaigns, AI Suggestions) shows the panel's empty state for an institution that has no real DB rows.
- Two different institutions never show the same record.
- Admin-only gating on `/institutions*` remains intact.