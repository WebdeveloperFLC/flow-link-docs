
# Connect Accounting Module to Supabase

Migrate the accounting module's localStorage-backed stores to real Supabase tables, one domain at a time. CRM and Commission files will not be touched.

## Scope summary

- 5 SQL migrations (COA, Journals + lines, Bank Accounts, Vendors/AP/AR, Entities + Masters)
- 8 stores rewritten to call Supabase via React Query
- All consuming pages updated to handle async data (loading / error states)
- One-time localStorage → Supabase migration utility surfaced on `AccountingOverviewPage`
- No new npm packages (React Query already present)

## Phase 1 — Database migrations

Each migration is a separate timestamped file in `supabase/migrations/` so they can be reviewed independently.

1. **`accounting_coa`** — chart of accounts with `UNIQUE(code, entity_id)`, self-referencing parent, indexes on code/entity/group.
2. **`accounting_journals` + `accounting_journal_lines`** — header + lines with `ON DELETE CASCADE`. Includes `generate_journal_number()` trigger producing `JE-YYYY-NNNN`. Indexes on date/entity/status and on lines by journal/account.
3. **`accounting_bank_accounts`** — full bank metadata, FK to `accounting_coa`, defaults flags.
4. **`accounting_vendors` + `accounting_ap_bills` + `accounting_ar_invoices`** — AP/AR with FKs and status indexes.
5. **`accounting_entities` + `accounting_masters`** — self-referencing entities (parent_id), masters with `UNIQUE(list_key, code)`.

**Security (every table):**
- `ENABLE ROW LEVEL SECURITY`
- Policy `accounting_users_all FOR ALL USING (EXISTS … accounting_users WHERE auth_user_id = auth.uid() AND status = 'ACTIVE')`
  - Note: existing `is_accounting_user()` helper uses `status = 'ACTIVE'` (uppercase). The user's spec uses `'active'`. I will use **`'ACTIVE'`** to match the existing function and seeded data — otherwise no one will be able to read anything. Will flag this in the plan.
- `journal_lines` policy gates via parent journal access (same EXISTS check works since access is module-wide).

**Triggers:** Add `updated_at` touch triggers (`public.touch_updated_at` already exists) on every table that has `updated_at`.

## Phase 2 — Store rewrites

Each store keeps its **exported function names** but becomes async + React-Query backed. Files affected:

| Store | Table(s) |
|---|---|
| `coaStore.ts` | `accounting_coa` |
| `journalsStore.ts` | `accounting_journals` + `accounting_journal_lines` |
| `bankAccountsStore.ts` | `accounting_bank_accounts` |
| `vendorsStore.ts` | `accounting_vendors` |
| `apBillsStore.ts` | `accounting_ap_bills` |
| `arInvoicesStore.ts` | `accounting_ar_invoices` |
| `accountingEntitiesStore.ts` | `accounting_entities` |
| `accountingMastersStore.ts` | `accounting_masters` |

Pattern per store:
- `mapFromDb` / `mapToDb` converters between snake_case DB rows and existing camelCase TS types.
- `getX()` async, returns `[]` on error (console-logged).
- `addX / updateX / deleteX` async; invalidate the relevant query key after mutation.
- `useX()` becomes a React-Query hook returning `{ data, isLoading, error }`.

**Important breaking-shape considerations:**
- Today `useAccounts()` etc. return `T[]` synchronously. Switching to `{ data, isLoading }` is a **breaking API change** for every call site. To minimize churn I will:
  - Provide `useX()` that returns `{ data: T[], isLoading, error }` (new shape).
  - Update **every** call site in the accounting module that destructures the old array form. List of pages will be enumerated during implementation; expect ~20–30 files.
- Validation logic currently in stores (e.g. COA `validate()`, bank account `validate()`) is preserved client-side and runs before the Supabase insert. Server-side uniqueness will rely on DB constraints; errors mapped back to `{ ok: false, error }` shape.
- `deleteBankAccount` / `canDeleteAccount` txn-count checks: `txnCount` field doesn't exist server-side yet. For now, these checks degrade to "always allowed" with a TODO; will be re-implemented after journals are wired and we can count journal lines per account.

## Phase 3 — Page updates

Every page that calls `useAccounts/useJournals/useBankAccounts/useVendors/useApBills/useArInvoices/useEntities/useMasters` (or `getX()` synchronously) gets:
- `isLoading` → skeleton loader (use existing skeleton components where present, otherwise a simple `<Skeleton />` row list)
- `error` → small inline error block with retry (`refetch()`)
- Empty results → existing `AccountingEmptyState`

Mutation call sites (Add/Edit/Delete dialogs) become `async` and `await` the store function, then `queryClient.invalidateQueries`. Sonner toasts and `DeleteRecordDialog` flows remain unchanged.

## Phase 4 — One-time data migration

New file `src/accounting/lib/migrateToSupabase.ts`:
- Reads each known localStorage key (`accounting:coa-accounts:v5`, `accounting:journals:v3`, `accounting:bank-accounts:v3`, `accounting:vendors:v3`, `accounting:ap-bills:v3`, `accounting:ar-invoices:v3`, `accounting:entities:v3`, `accounting:masters:v?`).
- Counts records per domain.
- `migrateLocalStorageToSupabase()` inserts in dependency order: entities → masters → COA → bank accounts → vendors → journals (+ lines) → AP bills → AR invoices.
- Uses upserts on natural keys (`code` for COA, `journal_number`, `bill_number`, `invoice_number`) so re-runs are idempotent.
- On success: removes the migrated localStorage keys, returns `{ migrated, errors[] }`.

UI hook in `AccountingOverviewPage.tsx` "Developer & Testing Tools" section:
- "Scan local data" → shows per-domain counts.
- "Migrate N records to cloud" button → runs migration, shows progress + success toast, then clears local keys.
- Hidden once no local data is detected.

## Open items / decisions

1. **`accounting_users.status` casing** — existing helper uses `'ACTIVE'`; the spec text says `'active'`. I'll use `'ACTIVE'` so policies actually match existing rows. Confirm if you'd rather lowercase the seed data instead.
2. **`profiles(id)` FK on `created_by`** — `profiles` table exists per existing functions, so this is fine.
3. **Auth requirement** — accounting routes are already gated by `AccountingProtectedRoute`; assuming user is always authenticated when these stores run. No anonymous fallback.
4. **Realtime** — not enabled in this pass. Can be added later per table if needed.
5. **`accountingMastersStore`** — I'll inspect the current localStorage shape during implementation to map fields correctly; structure shown in plan is the target schema.

## Deliverables checklist

- [ ] 5 migration files in `supabase/migrations/`
- [ ] 8 stores rewritten (signatures preserved where possible, return shape becomes async)
- [ ] All accounting pages updated for `isLoading` / `error`
- [ ] `migrateToSupabase.ts` utility + Overview page button
- [ ] RLS enabled + verified on all 9 new tables
- [ ] No CRM or Commission file touched
- [ ] No new npm packages
