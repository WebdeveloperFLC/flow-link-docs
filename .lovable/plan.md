## Goal

Two related enhancements inside the existing Accounting module:

1. Make Vendors form/master more flexible (configurable categories + optional contact person).
2. Expand Accounting Clients module to handle the study-abroad / visa / coaching business reality (link CRM clients, accounting-only clients, richer filters, ledger, services, staff association).

No CRM changes. No new top-level routes. All work stays in `src/accounting/**` using existing semantic tokens and AG Grid wrappers.

---

## Part 1 — Vendors

### 1A. Configurable categories
- Convert `VENDOR_CATEGORY_LABEL` from a hardcoded const into a small in-memory store: `src/accounting/stores/vendorCategoriesStore.ts` exposing `useVendorCategories()` (list + `addCategory(label)`).
- Seed it with the 9 existing categories so nothing breaks.
- `AddVendorDialog` Category Select gets an "+ Add new category…" footer item that opens an inline mini-dialog (label input → slug code generated from label) and adds it to the store.
- `AccountingVendorsPage` filters use the same hook so new categories appear instantly in the filter dropdown and grid `valueFormatter`.

### 1B. Optional contact person
- Extend `Vendor` type with optional `contactName?`, `contactEmail?`, `contactPhone?`.
- `AddVendorDialog` gets a collapsible "Contact person (optional)" section with three inputs.
- `AccountingVendorDetailPage` header shows a "Primary contact" block when any contact field exists (name + mailto/tel links). No layout change otherwise.

---

## Part 2 — Accounting Clients

### 2A. Types & data
- Extend `Client` type:
  - `clientType: 'STUDENT' | 'IMMIGRATION' | 'CORPORATE' | 'FAMILY' | 'COACHING'` (replaces/augments `segment`; keep `segment` as alias for back-compat).
  - Optional: `counselorId`, `counselorName`, `servicePackage`, `visaCategory`, `intake`, `leadSource`, `notes`, `linkedCrmClientId`.
- New types: `ClientService` (package, total, paid, remaining, nextDueDate), `ClientNote`, `ClientActivity`, `ClientRefund`, `ClientDiscount`.
- New mock files: `mockStaff.ts` (counselor list), extended `mockClients.ts` with services, refunds, discounts, installments, notes, activity.

### 2B. Client list page
- Two header buttons: **Add new client** (opens `AddClientDialog`) and **Link CRM client** (opens `LinkCrmClientDialog`).
- `LinkCrmClientDialog`: searchable command palette over `getCRMClients()` (already in `crmBridge.ts`); on select, creates a linked accounting client record (mock add) with `linkedCrmClientId` and a small "CRM" badge in the grid.
- Expanded filters bar: Country, Client type, Service package, Counselor, Visa category, Intake, Payment status, Active/Inactive. Filters wrap responsively.
- Grid adds columns: Type, Counselor, Service package, badge for CRM-linked.

### 2C. Add new client dialog
Sectioned form (Basic / Business / Notes):
- Basic: Full name, Client type, Country, Email, Phone, Tax ID (optional).
- Business: Counselor (Select from mock staff), Service package (Select), Visa category, Intake/session, Lead source, Payment terms.
- Notes: textarea.
Reuses existing `Dialog`/`Select`/`Input` styling from `AddVendorDialog`.

### 2D. Client detail page (ledger)
Enhance existing `AccountingClientDetailPage`:
- **Header**: client info + assigned counselor chip + linked-CRM chip if applicable.
- **KPI strip**: Total billed, Total received, Outstanding, Refunds, Installment progress (e.g. "3 of 5 paid").
- **Aging card**: Current / 30 / 60 / 90+ (reuse `AgingBreakdownCard`).
- **Services panel**: list of enrolled services with package amount, paid, remaining, next due date.
- **Tabs**: Transactions, Invoices, Receipts, Documents, Notes, Activity timeline.
  - Receipts tab supports rendering refunds and discounts as separate row types.
  - Notes tab: list + add note (local state).
  - Activity tab: chronological feed (mock entries: invoice issued, payment received, note added, status changed).

### 2E. Staff association
- `mockStaff.ts` exports a small list (Counselor A/B/C, Senior Advisor, etc.).
- `useStaff()` hook for dropdowns; later swappable with CRM users query.

---

## Files

**Created**
- `src/accounting/stores/vendorCategoriesStore.ts`
- `src/accounting/data/mockStaff.ts`
- `src/accounting/components/clients/AddClientDialog.tsx`
- `src/accounting/components/clients/LinkCrmClientDialog.tsx`
- `src/accounting/components/clients/ClientServicesPanel.tsx`
- `src/accounting/components/clients/ClientNotesTab.tsx`
- `src/accounting/components/clients/ClientActivityTab.tsx`

**Edited**
- `src/accounting/types/vendors.ts` (+ contact fields)
- `src/accounting/types/clients.ts` (+ business fields, services, notes, activity)
- `src/accounting/data/mockVendors.ts` (categories moved to store; sample contact data)
- `src/accounting/data/mockClients.ts` (richer data + services + notes + activity)
- `src/accounting/components/vendors/AddVendorDialog.tsx` (configurable category + contact section)
- `src/accounting/pages/vendors/AccountingVendorsPage.tsx` (use category store)
- `src/accounting/pages/vendors/AccountingVendorDetailPage.tsx` (contact block in header)
- `src/accounting/pages/clients/AccountingClientsPage.tsx` (buttons + expanded filters + new columns)
- `src/accounting/pages/clients/AccountingClientDetailPage.tsx` (KPIs, services, expanded tabs)

No routes added, no CRM files touched.

## Technical notes

- Categories store is a tiny `useSyncExternalStore`-style module with a Set + listeners — no Zustand needed; mirrors pattern used elsewhere.
- CRM client linking uses existing `getCRMClients()` from `crmBridge.ts`; the linked record is appended to in-memory `MOCK_CLIENTS` so it appears immediately. No DB writes.
- All new selects reuse shadcn `Select` / `Command` primitives already in the project.
- All colors via semantic tokens; AG Grid wrapper unchanged.
