## Problem

The Bank accounts page exists at `/accounting/bank-accounts` (`src/accounting/pages/bank-accounts/AccountingBankAccountsPage.tsx`) and is fully built (list, KPIs, form dialog, reconciliation badges), but there is no entry for it in the Accounting sidebar in `src/components/layout/AppLayout.tsx`. So users have no way to navigate to it.

## Change

Add a single nav entry to the `accountingNav` array in `src/components/layout/AppLayout.tsx`:

- Label: **Bank accounts**
- Route: `/accounting/bank-accounts`
- Icon: `Landmark` (already used on the page itself, matches the bank metaphor) — add it to the existing `lucide-react` import.

Placement: directly under **Chart of accounts**, so the grouping reads:
Overview → Journal entries → Chart of accounts → **Bank accounts** → Owner profiles → …

That keeps it next to the other foundational ledger setup items, before the AP/AR transactional pages.

## Out of scope

- No changes to the Bank accounts page itself.
- No changes to routing (route is already wired).
- No changes to any other CRM or accounting functionality.
