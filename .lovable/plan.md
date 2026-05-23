# Fix "View client ledger" routing on AR page

## Problem
In `src/accounting/pages/ar/AccountingARPage.tsx` (line 269), the row dropdown action "View client ledger" calls `navigate("/accounting/clients")`, dumping the user on the full clients list instead of the selected client's ledger.

## Fix (frontend routing only)
Update that single `DropdownMenuItem` to navigate to the accounting client detail page using the invoice row's `clientId` (already populated by `arInvoicesStore` from `client_id`, falling back to the local mock value).

Behavior:
- If `i.clientId` is present → `navigate(\`/accounting/clients/${i.clientId}\`)`. This is the existing detail route used by `AccountingClientsPage`, rendering the full ledger view (invoices, transactions, receipts, snapshot drawer, payment history).
- If `i.clientId` is missing → render the menu item visually disabled with a tooltip "Client not linked". Per implementation note: wrap the `DropdownMenuItem` in a `<span>` and put `TooltipTrigger` on the wrapper (a fully disabled dropdown item swallows hover events). The inner item uses `aria-disabled`, muted styling, `onSelect={e => e.preventDefault()}`, and no navigate.

## Out of scope (explicitly unchanged)
- No changes to AR/AP/ledger tables, invoice store, receipt store, or snapshot drawer.
- No schema, mock data, or permissions changes.
- Other row menu items ("View details", "Record payment", "Generate receipt", "Create journal entry", Void, Delete) remain exactly as today.
- AP bill page and invoice detail page checked — no broken "View client ledger" action there.

## Files touched
- `src/accounting/pages/ar/AccountingARPage.tsx` — one dropdown item updated; add `Tooltip`/`TooltipTrigger`/`TooltipContent` imports if not already present.
