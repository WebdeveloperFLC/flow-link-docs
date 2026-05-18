
## Personal Wealth — Real persistence (DB + store wiring)

### 1. Migration (single file)

`supabase/migrations/<ts>_personal_wealth_owners_accounts.sql`

Creates two tables matching `src/accounting/types/owners.ts` exactly.

**`public.owner_profiles`** — all columns from the spec, with:
- `category` CHECK in (`BUSINESS`,`PERSONAL`,`FAMILY_OFFICE`)
- `personal_type` CHECK in (`INDIVIDUAL`,`HUF`,`TRUST`,`NRI`,`MINOR`)
- `tenant_id uuid` (not FK to `auth.users` — those FKs are disallowed; column is `NOT NULL`, defaulted from `auth.uid()` via trigger on insert)
- `updated_at` trigger using existing `public.touch_updated_at()`

**`public.financial_accounts`** — all columns from the spec, with:
- `owner_profile_id` FK → `owner_profiles(id) ON DELETE CASCADE`
- `premium_frequency` CHECK (`MONTHLY|QUARTERLY|HALF_YEARLY|YEARLY|SINGLE`)
- `status` CHECK (`ACTIVE|INACTIVE|MATURED|CLOSED|SURRENDERED`)
- `tenant_id` defaulted from `auth.uid()` via trigger
- `updated_at` trigger
- Indexes on `owner_profile_id`, `(tenant_id, status)`

**RLS** (both tables, enabled):
- `SELECT`: `auth.uid() = tenant_id OR public.is_accounting_user(auth.uid())`
- `INSERT / UPDATE / DELETE`: `public.is_accounting_user(auth.uid())`
  (`is_accounting_user` already exists.)

**Seed** — insert 6 owner_profiles only (no financial_accounts):

| legal_name | personal_type | extra |
|---|---|---|
| Santosh D Ramrakhiani | INDIVIDUAL | tags `['NRI']` |
| Krishaa S Ramrakhiani | INDIVIDUAL | tags `['NRI']` |
| Viven S Ramrakhiani   | INDIVIDUAL | tags `['NRI']` |
| Krish Ramrakhiani     | MINOR      | — |
| Nirmala Ramrakhiani   | INDIVIDUAL | — |
| Santosh Ramrakhiani HUF | HUF | `karta_name='Santosh D Ramrakhiani'` |

All `category='PERSONAL'`, `country='IN'`, `is_active=true`, `tenant_id=NULL` (visible via `is_accounting_user` branch — owners are tenant-wide reference data, like vendors).

### 2. New store: `src/accounting/stores/ownersStore.ts`

Mirrors `coaStore` / `vendorsStore` pattern:

- In-memory `owners[]` and `accounts[]`, `useSyncExternalStore` hooks `useOwners()`, `useFinancialAccounts()`, `useAccountsForOwner(id)`.
- `mapOwnerFromDb` / `mapOwnerToDb`, same for `FinancialAccount` (snake→camel).
- `hydrateFromSupabase()` does two parallel `select('*')` calls and overwrites in-memory lists.
- Mutators `createOwner`, `updateOwner`, `createFinancialAccount`, `updateFinancialAccount`, `deleteFinancialAccount` — each does the DB op then re-hydrates.
- Bottom of file: `runWhenAuthReady(hydrateFromSupabase)` using the existing `_hydrationGate.ts`.

### 3. UI rewiring (no visual/markup changes)

Replace `MOCK_OWNERS` / `MOCK_FINANCIAL_ACCOUNTS` reads in these 5 files with the new hooks:

- `src/accounting/pages/owners/AccountingOwnersPage.tsx`
- `src/accounting/pages/owners/AccountingOwnerDetailPage.tsx` — also wire `AccountForm` submit → `createFinancialAccount`, and the "Add owner" flow (if present) → `createOwner`
- `src/accounting/pages/owners/AccountingWealthPage.tsx`
- `src/accounting/components/shared/AccountOwnerSelect.tsx`
- Bank-account pages keep their existing fallback default but read live data when present (1-line default swap)

Helpers in `mockOwners.ts` that are pure (`categoryOf`, `formatMaskedAccount`, `ownerDisplayName`, `ownerInitials`, `avatarColorClass`, `countryFlag`, `formatINR`, `formatAccountAmount`, `maskTaxId`, `MOCK_FX`, `convertTo`) stay — only the two mock arrays become unused exports (left in place as `[]` to avoid touching unrelated imports).

### 4. Verification

After migration approval:
1. Load `/accounting/owners` → 6 owner cards render from DB.
2. Open Santosh D Ramrakhiani → detail page renders (0 accounts).
3. Add a Fixed Deposit via the existing form → row appears in `financial_accounts`, persists on hard refresh, visible under that owner.
4. Sign in as Balveer (ACCOUNTANT) → same data visible (RLS via `is_accounting_user`).
5. `BRIDGE_ENABLED` untouched; no commission/CRM files in diff.

### Files changed
- **new** `supabase/migrations/<ts>_personal_wealth_owners_accounts.sql`
- **new** `src/accounting/stores/ownersStore.ts`
- **edit** `src/accounting/pages/owners/AccountingOwnersPage.tsx`
- **edit** `src/accounting/pages/owners/AccountingOwnerDetailPage.tsx`
- **edit** `src/accounting/pages/owners/AccountingWealthPage.tsx`
- **edit** `src/accounting/components/shared/AccountOwnerSelect.tsx`
- **edit** `src/accounting/components/bank-accounts/BankAccountFormDialog.tsx` (default arg only)
- **edit** `src/accounting/pages/bank-accounts/AccountingBankAccountsPage.tsx` (default arg only)
- **edit** `src/accounting/pages/bank-accounts/AccountingBankAccountDetailPage.tsx` (default arg only)
