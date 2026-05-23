# Make receipts discoverable

## What's happening today

Receipts ARE being generated and saved to `client_invoice_receipts` (your toast "Receipt RCPT-FLC-GEN-2026-0002 generated" confirms it). They just have nowhere obvious to view, download, or reprint:

- **Client section** — receipts are buried inside the invoice "eye" (👁️) drawer (`InvoiceSnapshotDrawer`) on each invoice row. No direct entry point from the card itself.
- **Accounting section** — there is **no receipts page at all**. AR has Invoices and Verification Queue, but no Receipts list. The "Download receipt" button on the invoice detail page also rebuilds a fresh receipt instead of opening the saved one.

## Fix — frontend only, no schema changes

### 1. Client section — surface receipts directly on the invoice card
In `ClientInvoicesPanel.tsx`:
- Make the header "· Receipts {N}" a clickable chip that opens a new **Receipts drawer** (reusing the same data fetch already in `InvoiceSnapshotDrawer`) listing every receipt for this client with: receipt #, invoice #, date, amount, payer, status, and View / Print / Download actions.
- On each invoice row, change the existing greyed-out "Receipt" button (currently only generates) so that:
  - if receipts exist for that invoice → split into "View receipt" (opens drawer scoped to that invoice) + "Generate" (existing flow)
  - if none → keep "Generate receipt"
- Add a small `RCPT-…` link badge under each row showing the latest receipt number.

### 2. Accounting section — add a Receipts page
- New route `/accounting/ar/receipts` → `AccountingReceiptsPage.tsx` listing all rows from `client_invoice_receipts` (joined with `client_invoices` for invoice #, client name, branch).
- Columns: Receipt #, Date, Client, Invoice #, Amount, Currency, Status (voided/active), Actions (View, Print PDF, Download).
- Filters: date range, client, invoice #, voided/active, free-text search on receipt # / ref.
- Add a "Receipts" button on `AccountingARPage` header (next to "Verification queue") and a sidebar entry under AR.
- Wire the existing "Download receipt" button in `AccountingInvoiceDetailPage.tsx` to open the saved snapshot via `printReceiptSnapshot` when one exists, instead of regenerating.

### 3. Shared
- Extract `printReceiptSnapshot` + the snapshot fetch from `ClientInvoicesPanel.tsx` into `src/accounting/lib/receiptHelpers.ts` so both the client drawer and the new accounting page use the exact same renderer.

## Out of scope
- No DB migrations, no changes to receipt generation logic, no changes to verification or payments flow.
- No edits to the receipt PDF template itself.

## Files touched
- `src/components/clients/ClientInvoicesPanel.tsx` (surface receipts on card + row buttons)
- `src/accounting/lib/receiptHelpers.ts` (shared print helper)
- `src/accounting/pages/ar/AccountingReceiptsPage.tsx` (new)
- `src/accounting/pages/ar/AccountingARPage.tsx` (header button)
- `src/accounting/pages/ar/AccountingInvoiceDetailPage.tsx` (open saved snapshot)
- `src/App.tsx` (new route)
- Accounting sidebar entry (wherever AR nav is defined)
