
# Migrate coaStore to Supabase (hybrid, zero-breakage)

## Strategy: keep sync API, hydrate from Supabase in background

Rewriting `useAccounts()` to async React Query would force changes in 14 consumer files (pages, dialogs, helpers, even another store) and risks breaking working flows. Instead, keep every exported signature identical and add Supabase as the source of truth behind the cache.

**No page or component file gets edited in this turn.** Only `coaStore.ts` changes.

## File changes (this turn)

Only `src/accounting/stores/coaStore.ts`.

## Behavior

### Cache
- Module-level `accounts: CoaAccount[]` cache, same as today.
- Initial value: localStorage (current behavior) so the UI renders instantly.
- On module import, kick off an async `fetchFromSupabase()` that replaces the cache and notifies subscribers when it resolves.
- LocalStorage is still written on every change as a fallback so offline reloads keep working.

### Reads (unchanged signatures)
- `useAccounts(): CoaAccount[]` — sync, via `useSyncExternalStore` (unchanged).
- `getAccounts(): CoaAccount[]` — sync, returns cache (unchanged).
- `getDescendantIds(id)` — unchanged.

### Mutations (unchanged signatures, optimistic + background sync)
- `addAccount(input)`:
  1. Run existing client-side `validate()` (unchanged).
  2. Optimistically push into cache with a temp UUID; emit.
  3. Fire `supabase.from('accounting_coa').insert(...).select().single()` in background.
  4. On success: swap temp record for the DB row (real id, timestamps); emit again.
  5. On error: revert the optimistic insert, console.error, surface via `sonner` toast.
- `updateAccount(id, input)`:
  - Same pattern: optimistic update, background `update().eq('id', id)`, revert on failure.
- `deleteAccount(id)`:
  - Run `canDeleteAccount(id)` first (txnCount/children guard preserved).
  - Optimistic remove, background `delete().eq('id', id)`, revert on failure.
- `toggleAccountStatus(id)`:
  - Optimistic flip, background `update({is_active: ...})`.

Return shapes (`{ ok: true } | { ok: false; error }`) are preserved exactly so call sites in `AccountFormDialog.tsx` and `AccountingCOAPage.tsx` keep compiling.

### Mapping
- Internal helpers `mapFromDb(row)` and `mapToDb(account)` translate between snake_case DB columns and camelCase TS type.
- `automation_tags`, `ai_category`, `reporting_group`, `notes`, `is_active`, `reconciliation_enabled`, `requires_approval`, `manual_entries_allowed`, `sub_type_code` columns map back/forth even though current `CoaAccount` type doesn't expose them all yet — extra fields are preserved on round-trip via a private `__raw` stash so we don't lose data when reading & writing back.

### Auth handling
- `created_by` is set to `auth.user.id` if available; otherwise null.
- If the user isn't an `accounting_users` member, RLS blocks reads — the store falls back to localStorage cache and logs a single console warning. No UI crash.

## Phase 2 verification

After the edit:
- Build must pass (`tsc` runs automatically in the harness).
- Smoke check: visiting `/accounting/coa` shows the existing seed accounts (from localStorage cache) immediately, then quietly refreshes with whatever is in Supabase (initially empty, so cache wins until first write).
- Add/Edit/Delete from the COA page should now persist to Supabase.

## Out of scope (this turn)

- Other stores (`journalsStore`, `bankAccountsStore`, etc.) — unchanged.
- Page/component edits — unchanged.
- One-time `migrateToSupabase.ts` utility — deferred until the user is ready to wire up the Overview "Migrate data" button (recommended after a few stores are done).
- Realtime subscriptions — not enabled.

## Stop condition

After the file edit + build verification, stop and wait for confirmation before moving to `journalsStore`.
