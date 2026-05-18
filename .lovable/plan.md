# Fix blank Journal Entry form (empty account picker)

## Root cause

`src/accounting/pages/journals/AccountingNewJournalPage.tsx` renders the line account picker via the local `AccountCombobox` component (lines 429–476). That combobox reads from `MOCK_ACCOUNTS` imported from `src/accounting/data/mockJournals.ts` — which is now an **empty array** (`export const MOCK_ACCOUNTS: Account[] = [];`). The real Chart of Accounts lives in `coaStore` (`useAccounts()` / `getAccounts()`), so the dropdown always shows "No accounts found" and every line stays blank. That's why both "+ New journal entry" and the AP "⋯ → Create journal entry" path open a form you can't fill in.

The journals list itself works because it reads from `journalsStore` (already gated on auth). Only the line-entry account selector is broken.

## Fix

Rewrite `AccountCombobox` to use the live COA store instead of the empty mock array. No DB or store changes needed.

In `src/accounting/pages/journals/AccountingNewJournalPage.tsx`:

1. Drop the `MOCK_ACCOUNTS` reference from the `AccountCombobox` body. Keep the `AccountType` import (still used by `ACCOUNT_TYPES`).
2. Inside `AccountCombobox`, call `useAccounts()` from `@/accounting/stores/coaStore` and map each `CoaAccount` to its `AccountType` via `toAccountType(a.groupCode)` from `@/accounting/lib/journalHelpers` for the group headings.
3. Render the same Popover/Command UI, grouping by the five `ACCOUNT_TYPES`, sorted by `code`. Selected display: `${a.code} — ${a.name}`. Filter out `status === "INACTIVE"`.
4. Verify no other call site in the file references `MOCK_ACCOUNTS` (only the combobox does today).

## Verification

- Hard-reload `/accounting/journals/new` as admin — the "Select account…" dropdowns list the seeded COA rows grouped by ASSET/LIABILITY/EQUITY/REVENUE/EXPENSE.
- Open AP → Shree Ram Enterprise → ⋯ → Create journal entry — same picker is populated; entity/reference prefilled from query params still work.
- Pick two accounts, enter balanced debit/credit, save — entry appears in `/accounting/journals` and persists after refresh.
- Log in as Balveer (accountant) — same picker works (COA store hydrates via the auth gate already in place).

No migrations, no RLS changes, no other files touched.
