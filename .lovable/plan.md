## Deferred Pass — Wire AP / AR / Journals stores + finish DynamicSelect sweep

Scope is execution of the spec you provided. No new packages, no CRM/Institutions changes, no edits to `_persist.ts`, `accountingMastersStore.ts`, `vendorsStore.ts`, `clientsStore.ts`, or `DynamicSelect.tsx`.

### Part 1 — AP Bills
- `pages/ap/AccountingAPPage.tsx` — swap `MOCK_BILLS` → `useApBills()`; approve/void/mark-paid via `updateApBill`; CSV export reads live data.
- `pages/ap/AccountingNewBillPage.tsx` — replace all hard-coded `SelectItem` blocks with `DynamicSelect` (currencies, payment_terms, tax_codes, payment_methods). Vendor select sourced from `useVendors()`; entity/branch from `accountingEntitiesStore`. Submit/Save draft → `addApBill()` → navigate `/accounting/ap`.
- `pages/ap/AccountingBillDetailPage.tsx` — read from `useApBills()` by `:id`; Approve / Mark as paid / Void call `updateApBill()`.

### Part 2 — AR Invoices
- `pages/ar/AccountingARPage.tsx` — `MOCK_INVOICES` → `useArInvoices()`; send / record payment / void via `updateArInvoice`; CSV export from store.
- `pages/ar/AccountingNewInvoicePage.tsx` — DynamicSelect for currencies, payment_terms, tax_codes, payment_methods, service type (`client_categories`); client picker from `useClients()`; entity/branch from `accountingEntitiesStore`. Save draft / Save & send → `addArInvoice()` → navigate `/accounting/ar`.
- `pages/ar/AccountingInvoiceDetailPage.tsx` — read from `useArInvoices()` by `:id`; Send / Record payment / Void → `updateArInvoice()`.

### Part 3 — Journals
- `pages/journals/AccountingJournalsPage.tsx` — `MOCK_JOURNALS` → `useJournals()`; Void → `updateJournal()`; CSV export from store.
- `pages/journals/AccountingNewJournalPage.tsx` — DynamicSelect for currencies, journal_types, per-line tax_codes; entity from `accountingEntitiesStore`. Save draft → `addJournal({status:'DRAFT'})`; Post → `addJournal({status:'POSTED'})`; navigate `/accounting/journals`.
- `pages/journals/AccountingJournalDetailPage.tsx` — read from `useJournals()`; Void → `updateJournal()`.

### Part 4 — Remaining hard-coded dropdowns
- `components/bank-accounts/BankAccountFormDialog.tsx` — currencies, countries.
- `components/clients/AddClientDialog.tsx` — client_categories, countries, currencies, payment_terms.
- `pages/approvals/AccountingApprovalsPage.tsx` — status/type filters → DynamicSelect (ap_bill_statuses / journal_types as applicable, `readOnly` on system lists).
- `pages/reconciliation/AccountingReconciliationPage.tsx` — currencies.

### Part 5 — Verification
For each store after wiring:
1. Create from form page → appears immediately in list (live subscription via `useSyncExternalStore`).
2. Hard refresh → record persists (localStorage).
3. Detail/list supports edit + delete via store mutators.

### Technical notes
- Detail pages currently use `useState` seeded from the mock; replace with derived `useApBills().find(b => b.id === id)` / equivalent for AR & Journals so mutations flow through the store and reactively re-render.
- Where existing pages don't yet have a delete button (detail pages), add a Delete action that calls the store's `delete*` mutator and navigates back to the list — consistent with the "deletable from list or detail" rule.
- `DynamicSelect` already exposes `readOnly` for locked/system lists (statuses) — use it for status filters so users don't accidentally extend system enums.
- Keep existing UI/labels; only data source and handlers change.

### Out of scope
- `_persist.ts`, `accountingMastersStore.ts`, `vendorsStore.ts`, `clientsStore.ts`, `DynamicSelect.tsx` (frozen from prior pass).
- CRM, Institutions, Commission modules.
- No new dependencies, no Supabase migration.

### Deliverable
On completion: list of modified files and confirmation that `apBillsStore`, `arInvoicesStore`, `journalsStore` are the single source of truth for their list/new/detail pages.