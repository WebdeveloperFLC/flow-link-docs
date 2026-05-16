
## Goal

Three fixes across the Accounting module:

1. **Data persistence** — anything created in Vendors, Clients, Banks, Petty Cash, AP Bills, AR Invoices (and supporting masters like Categories, Currencies, Payment Terms, Tax Codes, Branches, Methods) must survive a page refresh.
2. **Chart of Accounts cleanup** — remove BANK-type accounts (the Banks module owns those), and standardize CoA fields to a clean accounting set.
3. **Dynamic dropdowns** — every dropdown in the Accounting section gets an inline "+ Add new" that writes to a shared masters store and is reused everywhere.

---

## 1. Persistence layer

Today most Accounting pages read straight from `src/accounting/data/mock*.ts` arrays — created records exist only in component React state and vanish on refresh. A few areas (CoA, Bank Accounts, Petty Cash, Entities) already use `useSyncExternalStore` + `localStorage`; the rest don't.

Approach: introduce a single small persistence helper and wrap every mock dataset in a store with the same shape as `coaStore` / `bankAccountsStore` (load from `localStorage`, seed from mock on first run, write through on every mutation, notify subscribers via `useSyncExternalStore`).

New stores under `src/accounting/stores/`:

- `vendorsStore.ts` (seeds from `mockVendors`) — add/update/delete + transactions/documents/payments
- `clientsStore.ts` (seeds from `mockClients`)
- `apBillsStore.ts` (seeds from `mockAP`)
- `arInvoicesStore.ts` (seeds from `mockAR`)
- `pettyCashTxnsStore.ts` — pulls petty-cash transactions out of the existing `pettyCashStore` config so transactions are stored separately and persist
- `journalsStore.ts` (seeds from `mockJournals`) — used by AR/AP posting too

All stores expose `useX()`, `getX()`, `addX()`, `updateX()`, `deleteX()` and persist via a tiny shared helper:

```text
src/accounting/stores/_persist.ts
  load<T>(key, fallback) / save(key, value) / subscribe wrapper
```

Pages and dialogs that currently `useState([...mockX])` switch to the matching `useX()` hook. Add/edit dialogs call the store mutators instead of mutating local state.

**Out of scope for this iteration:** moving Accounting data to Supabase tables. Stores stay client-side (localStorage) — same pattern already used by CoA/Banks — so the refresh bug is fixed without a big schema migration. We can promote any of these stores to Supabase later without changing call sites.

---

## 2. Chart of Accounts cleanup

**Remove BANK group from CoA**

- `src/accounting/stores/coaMasterStore.ts` — drop the `BANK` (or equivalent) system group and any types that belong to it from the seed.
- `src/accounting/stores/coaStore.ts` — on first load, filter out seed accounts whose group is BANK. The Banks module (`bank-accounts`) becomes the only source of truth for bank/cash-in-bank accounts; AR/AP/journal pickers that need a bank account already use `bankAccountsStore`, so no caller changes.
- Account group dropdown across CoA no longer shows BANK.
- Migration on existing localStorage: silently drop persisted BANK-group accounts on first render after upgrade.

**Standardize CoA fields**

Keep `code`, `name`, plus the standard set you confirmed:

```text
- Account group         (dropdown, dynamic, system + custom)
- Account type          (dropdown, scoped to group, dynamic)
- Sub-type              (dropdown, scoped to type, dynamic)   ← new
- Parent account        (dropdown, same group, no cycles)
- Currency              (dropdown, dynamic master)
- Entity / branch       (dropdown, dynamic master)
- Tax code              (dropdown, dynamic master)            ← was free-text
- Normal balance        (Debit / Credit, derived from group, editable for overrides)
- Opening balance       (number)
- Status                (Active / Inactive)
- Description           (textarea)
```

Changes:

- `src/accounting/types/coa.ts` — add `subTypeCode` and `normalBalance` to `CoaAccount` / `CoaAccountInput`. Make `taxCode` reference a masters value.
- `src/accounting/stores/coaMasterStore.ts` — add `subTypes` array (code, label, typeCode) with seed + `addSubType()`.
- `src/accounting/components/coa/AccountFormDialog.tsx`
  - Add Sub-type dropdown (depends on selected type) with inline "+ Add new sub-type".
  - Replace Currency hard-coded `CURRENCIES` array with the dynamic currencies master (see §3).
  - Replace Tax mapping free-text Input with dynamic Tax-codes dropdown (+ Add new).
  - Add Normal balance toggle, default-derived from group nature.
- New `AddSubTypeInlineDialog.tsx` mirroring `AddTypeInlineDialog`.
- `AccountDetailDrawer.tsx` — show the new fields.
- `coaStore.ts` `validate()` — accept `subTypeCode` (optional unless the chosen type has sub-types defined).

---

## 3. Dynamic dropdowns everywhere in Accounting

Today only Petty Cash has the inline "+ Add new" (via `ExtensibleSelect`) and CoA has the inline group/type dialogs. Other modules use hard-coded enum arrays inline in each form (vendor categories, payment terms, currencies, AP/AR statuses, journal types, payment methods, branches, banks, etc.).

Approach: one shared masters store + one reusable `<DynamicSelect>` wrapper.

**New shared masters store** — `src/accounting/stores/accountingMastersStore.ts`

```text
Lists managed (all persist in localStorage, all extensible inline):
- currencies                  (system-seeded, locked codes can't be deleted)
- payment_terms               ("Net 30", "Due on receipt", …)
- payment_methods             (Wire, EFT, Cheque, Card, UPI, Cash)
- vendor_categories           (already in vendorCategoriesStore — fold into this)
- client_categories
- ap_bill_statuses / ar_invoice_statuses
- journal_types
- tax_codes                   (HST-13%, GST-18%, …; used by CoA + AR/AP)
- branches                    (already in petty-cash — fold in, shared)
- countries (accounting use)
- units / uoms
```

API mirrors existing stores:
`useMaster(listKey)`, `addMasterItem(listKey, label, metadata?)`, `removeMasterItem(listKey, code)`. System items have `system: true` and cannot be removed.

**New component** — `src/accounting/components/shared/DynamicSelect.tsx`

A thin wrapper over `ExtensibleSelect` that:
- Reads from `useMaster(listKey)`.
- Shows "+ Add new {label}" by default for any non-system list.
- Opens a small inline dialog (re-uses `AddOptionDialog` pattern from petty cash) and persists via `addMasterItem`.

**Call-site refactors** (replace hard-coded `SelectItem` arrays with `<DynamicSelect listKey="…">`):

- `components/vendors/AddVendorDialog.tsx` — Category, Country, Currency, Payment terms, Status
- `components/clients/AddClientDialog.tsx` — Category, Country, Currency, Payment terms
- `components/bank-accounts/BankAccountFormDialog.tsx` — Currency, Account type, Bank
- `components/coa/AccountFormDialog.tsx` — Currency, Tax code, Entity (entities already store-backed)
- `pages/ap/AccountingNewBillPage.tsx` — Vendor (from vendorsStore), Currency, Payment terms, Tax code, Status
- `pages/ar/AccountingNewInvoicePage.tsx` — Client, Currency, Payment terms, Tax code, Status
- `pages/journals/AccountingNewJournalPage.tsx` — Journal type, Currency, Entity
- `pages/petty-cash/*` — already uses `ExtensibleSelect`; migrate its branches/categories/people sources to the shared masters store so the same lists appear in AP/AR (single source of truth).

The existing `vendorCategoriesStore` is folded into the shared masters store (one migration on load: copy values into `accounting_masters:vendor_categories` then ignore the old key).

---

## 4. Files touched

**New**
- `src/accounting/stores/_persist.ts`
- `src/accounting/stores/vendorsStore.ts`
- `src/accounting/stores/clientsStore.ts`
- `src/accounting/stores/apBillsStore.ts`
- `src/accounting/stores/arInvoicesStore.ts`
- `src/accounting/stores/pettyCashTxnsStore.ts`
- `src/accounting/stores/journalsStore.ts`
- `src/accounting/stores/accountingMastersStore.ts`
- `src/accounting/components/shared/DynamicSelect.tsx`
- `src/accounting/components/coa/AddSubTypeInlineDialog.tsx`

**Edited (key ones)**
- `src/accounting/types/coa.ts`
- `src/accounting/stores/coaMasterStore.ts`, `coaStore.ts`
- `src/accounting/components/coa/AccountFormDialog.tsx`, `AccountDetailDrawer.tsx`
- `src/accounting/components/vendors/AddVendorDialog.tsx`
- `src/accounting/components/clients/AddClientDialog.tsx`
- `src/accounting/components/bank-accounts/BankAccountFormDialog.tsx`
- AR/AP/Journal new + detail pages under `src/accounting/pages/{ar,ap,journals}/`
- Vendor/Client/Bank list + detail pages (swap `mockX` → `useX()`)
- `src/accounting/stores/pettyCashStore.tsx` (delegate branches/categories/people to shared masters)

---

## 5. Out of scope (called out explicitly)

- No Supabase migration for Accounting data in this pass — keeping the current localStorage pattern for consistency with CoA/Banks. Promotion to Supabase tables is a separate task.
- No changes to the Institutions/UPI module.
- No changes to roles/permissions (recent SUPER_ADMIN / FINANCE_ADMIN / commission_admin split stays as-is).
- The "remove BANK accounts" change is one-way: existing BANK rows in localStorage are silently dropped. Users re-create bank accounts via the Banks module if needed.
