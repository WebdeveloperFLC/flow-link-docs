
# Fix: CRM ↔ Accounting client linkage & payment visibility

## What's actually happening

I checked the database for "asd asdf asdf" (client `e9926243-…`):

- **CRM client exists** in `clients` table ✅
- **Draft invoice exists** in `accounting_ar_invoices`: `INV-DRAFT-0706636`, total ₹31,860, status `DRAFT` ✅
- **No row in `accounting_clients`** — that's why Accounting → Clients shows 0 rows ❌
- **CRM client page never queries invoices** — that's why you see no payment record on the client ❌
- **"Link CRM client" dialog is broken** — it pushes to an in-memory mock array instead of saving, so even manual linking does nothing ❌

The two modules are running on parallel client tables (`clients` for CRM, `accounting_clients` for accounting) with **no auto-sync**. The draft invoice the registration flow creates is orphaned from both client views.

## Fix plan

### 1. Auto-create accounting client when CRM client is created
In `src/lib/clientRegistration.ts` (`createDraftInvoice` and/or `upsertClientRegistration`):
- After inserting the CRM client / before inserting the draft invoice, upsert a matching row into `accounting_clients`:
  - `id = <new uuid>`, `linked_crm_client_id = clients.id`
  - `name`, `email`, `phone`, `country`, `currency` (INR default), `status = ACTIVE`, `segment = INDIVIDUAL`, `client_type` mapped from CRM `application_type`
  - `payment_terms` from the registration form
- Use `ON CONFLICT (linked_crm_client_id) DO UPDATE` (add unique index if missing via migration).
- Backfill migration: insert one `accounting_clients` row for every existing `clients` row that doesn't already have a linked accounting record.

### 2. Show invoices & payments on the CRM client page
In `src/pages/ClientDetail.tsx`, add a new `<ClientPaymentsCard client_id={id} />` (new file `src/components/clients/ClientPaymentsCard.tsx`):
- Query `accounting_ar_invoices` where `client_id = :id`, ordered by `invoice_date desc`.
- Show invoice #, date, status badge (Draft/Sent/Partially Paid/Paid), total, outstanding, "Open in Accounting" button (→ `/accounting/ar/:id`), and "Record payment" button (→ same detail page).
- Empty state: "No invoices yet · Create one in Accounting".
- Place between `ClientProfileCard` and the documents accordion so it's visible immediately.

### 3. Fix the "Link CRM client" dialog
In `src/accounting/components/clients/LinkCrmClientDialog.tsx`:
- Replace `MOCK_CLIENTS.push(newClient)` with `addClient(newClient)` from `clientsStore` so the row is persisted to `accounting_clients` and reflected in the list.
- Filter out CRM clients that already have an `accounting_clients` row (query the store, not `MOCK_CLIENTS`).

### 4. Make Accounting → Clients useful
In `src/accounting/pages/clients/AccountingClientsPage.tsx`:
- After hydration, also show a "Linked from CRM" badge for rows where `linked_crm_client_id` is set, with a link back to `/clients/:linked_crm_client_id`.
- In the detail page (`AccountingClientDetailPage.tsx`), show the linked CRM client's invoices the same way the CRM page now does, plus a "Record payment / Send invoice" call to action when `outstandingBalance > 0`.

### 5. Verify RLS lets the right users see the draft
The current policy on `accounting_ar_invoices` is:
```
counselors read own draft invoices: status='DRAFT' AND created_by=auth.uid()
  OR (client_id AND can_view_client(auth.uid(), client_id) AND (admin OR counselor))
```
That's already correct; the invoice simply wasn't being surfaced anywhere outside `/accounting/ar`. No policy change needed once step 2 puts it on the CRM client page.

## Out of scope
- No changes to invoice numbering, GST calc, or receipt flow.
- No changes to Leads, Telecaller, Workflows, Forms, Letters, Offers.
- Accounting, Institutions, Commissions, Digital Hub remain untouched except for the four files above.

## Files touched
- New: `src/components/clients/ClientPaymentsCard.tsx`
- Edited: `src/pages/ClientDetail.tsx`, `src/lib/clientRegistration.ts`, `src/accounting/components/clients/LinkCrmClientDialog.tsx`, `src/accounting/pages/clients/AccountingClientsPage.tsx`, `src/accounting/pages/clients/AccountingClientDetailPage.tsx`
- Migration: unique index on `accounting_clients.linked_crm_client_id` + backfill insert
