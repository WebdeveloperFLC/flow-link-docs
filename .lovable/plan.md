## Goal

Three things, accounting module only (no CRM, no Commission, no Institutions, no new routes/pages):

1. Truly empty all accounting data (entities, dashboards, reports, P&L, balance sheet, eliminations, drill-downs, quick approvals lists, fraud lists, tax items, KPI numbers, masters, COA, petty cash seeds, etc.) — keep ONLY users & roles (`MOCK_ACCOUNTING_USERS`, `accounting_users` table, roles).
2. Invalidate the old persisted localStorage caches so previously-seeded data disappears on next load (this is why data is "still visible" after the last sweep — the persisted stores still have v2 cached arrays).
3. Add a clearly visible **Back** button at the top of every accounting page.

## Why data is still visible

- `accountingEntitiesStore.ts` `SEED` still has 3 entities → Settings → Entities still lists Canada HQ / USA Corp / India Pvt Ltd.
- `accountingEntityStore.ts` `FALLBACK` still has entities → header entity switcher.
- `mockReports.ts` still has `PL_DRILLDOWN`, `ELIMINATIONS`, `MOCK_ENTITIES`, `SAMPLE_COUNTERPARTIES` populated → consolidated report shows `($72,000)` and elimination details.
- `AccountingOverviewPage.tsx` has **hardcoded** arrays inside the component (revenueByEntity, monthly, approvals, fraud, taxItems) and KPI numbers (`$4.8M`, `$3.1M`, etc.) — not driven by mock files at all.
- Persisted stores (`accounting:journals:v2`, masters, COA, vendors, etc.) hold cached arrays in the user's browser from before the previous wipe — bumping their version key forces a fresh empty state.

## Changes

### A. Clear remaining seeded data (no logic changes, only replace arrays with `[]` / zeros)

- `src/accounting/stores/accountingEntitiesStore.ts` — `SEED = []`
- `src/accounting/stores/accountingEntityStore.ts` — `FALLBACK = []` (and guard any `[0]` usage)
- `src/accounting/data/mockReports.ts` — empty `PL_DRILLDOWN`, `ELIMINATIONS`, `MOCK_ENTITIES`, `SAMPLE_COUNTERPARTIES`; keep type exports and `FX_RATES`
- `src/accounting/pages/AccountingOverviewPage.tsx` — empty the inline arrays (`revenueByEntity`, `monthly`, `approvals`, `fraud`, `taxItems`, `quickActions` kept since it's navigation) and zero out the hardcoded KPI strings
- Scan other pages for inline hardcoded arrays/numbers (reports pages, fraud page, tax page, approvals page) and zero them the same way
- `src/accounting/stores/accountingMastersStore.ts`, `coaMasterStore.ts`, `pettyCashStore.tsx` — empty any remaining seed arrays

### B. Force-flush old persisted state

Bump every `createPersistedStore` key suffix from `:v2` → `:v3` (and `:v1` → `:v2`) across:
- `journalsStore`, `apBillsStore`, `arInvoicesStore`, `bankAccountsStore`, `clientsStore`, `coaStore`, `vendorsStore`, `vendorCategoriesStore`, `accountingMastersStore`, `coaMasterStore`, `accountingEntitiesStore`, `pettyCashStore`

This makes existing users load the new empty seeds instead of cached arrays.

### C. Add visible Back button on every accounting page

Modify `src/accounting/components/shared/AccountingPageHeader.tsx` only:

- Add a left-aligned **Back** button (ArrowLeft icon + "Back" label, `variant="outline"`, `size="sm"`) above/left of the title.
- Wire to `navigate(-1)` via `useNavigate`.
- Optional prop `hideBack` (default `false`) so the top-level Overview page can opt out if desired — but by default every page gets it.

Because every accounting page already renders `<AccountingPageHeader />`, this single change adds the Back button everywhere with no per-page edits.

### D. Explicitly out of scope

- `MOCK_ACCOUNTING_USERS` (kept)
- `accounting_users` table, roles, auth (untouched)
- CRM, Commission, Institutions files (untouched)
- No new routes, no new pages, no new packages

## Verification

- Reload `/accounting`: KPIs show `$0` / `—`, charts empty, approvals/fraud/tax lists empty.
- `/accounting/settings/entities`: empty list, only "Add entity" button.
- `/accounting/reports/consolidated`: zero rows, no `$72,000`, no elimination details.
- Every accounting route shows a Back button at the top that returns to the previous page.
- No runtime errors (existing null-safety guards already in place).

## Question before I build

The user message says "fix error" but doesn't name one. I'm reading it as "the data-still-visible issue is the error to fix" (matches the screenshots showing $72,000 + entities + $4.8M dashboard). If there's a different runtime error in the console, please paste it and I'll fold the fix in — otherwise I'll proceed with the plan above on approval.
