# Accounting cleanup — Fixes 2, 3, 4

Fix 1 is skipped per your decision (the two entity stores are not actually duplicates — one is a CRUD list, the other is the active-entity React Context provider; converting either into a re-export shim would delete the provider API and crash the app).

---

## Fix 2 — Create `AddSubTypeInlineDialog.tsx`

`AccountFormDialog.tsx` already imports `AddSubTypeInlineDialog` from `./AddSubTypeInlineDialog` and already renders a Sub-type Select with the "+ Add new sub-type" affordance. Only the dialog file is missing.

`coaMasterStore.ts` already exposes `useSubTypes()` and `addSubType(label, typeCode)`, so no store changes needed.

**Create** `src/accounting/components/coa/AddSubTypeInlineDialog.tsx` modeled exactly on `AddTypeInlineDialog.tsx`:

- Props: `open`, `onOpenChange`, `defaultTypeCode?`, `onCreated?(code)`.
- Field 1 — Account type Select, populated from `useTypes()` filtered by `!HIDDEN_TYPE_CODES.has(t.code)`; defaults to `defaultTypeCode` or first available type.
- Field 2 — Sub-type name Input, `autoFocus`, placeholder `"e.g. Digital Wallets, NRE Account"`.
- On submit: `addSubType(label, typeCode)`; on null result toast.error "Sub-type name is required and must be unique within the type"; on success `toast.success`, `onCreated?.(created.code)`, `onOpenChange(false)`.
- Title `"Add account sub-type"`; description `"Sub-types refine how accounts are categorised within a type."`.
- Footer: `Cancel` | `Add sub-type`.

No edits to `AccountFormDialog.tsx` — wiring is already there.

---

## Fix 3 — Empty mock seed arrays + bump LS versions

### 3a. Empty arrays (keep all type/interface exports intact)

| File | Arrays to set to `[]` |
|---|---|
| `data/mockVendors.ts` | `MOCK_VENDORS` |
| `data/mockClients.ts` | `MOCK_CLIENTS` |
| `data/mockAP.ts` | `MOCK_BILLS` |
| `data/mockAR.ts` | `MOCK_INVOICES` |
| `data/mockJournals.ts` | `MOCK_JOURNALS`, `MOCK_ACCOUNTS` |
| `data/mockDocuments.ts` | `MOCK_DOCUMENTS` |
| `data/mockApprovals.ts` | `MOCK_APPROVALS` (replace the SEEDS-based builder with `[]`) |
| `data/mockBankAccounts.ts` | `SEED_BANK_ACCOUNTS` |
| `data/mockOwners.ts` | `MOCK_OWNERS`, `MOCK_FINANCIAL_ACCOUNTS` (keep `MOCK_FX` — it's an FX rate map, not seed data) |
| `data/mockTax.ts` | `MOCK_TAX_PERIODS`, `MOCK_NOTICES` |
| `data/mockFraud.ts` | `MOCK_FRAUD_FLAGS` |
| `data/mockReconciliation.ts` | `MOCK_STATEMENT_LINES`, `MOCK_PAST_SESSIONS` |
| `data/mockPettyCash.ts` | `PETTY_BRANCHES`, `PETTY_VOUCHERS`, `PETTY_REPLENISHMENTS`, `PETTY_VERIFICATIONS` (and the `buildVouchers()` helper returns `[]`) |
| `data/mockCoa.ts` | `SEED_ACCOUNTS` |
| `data/mockStaff.ts` | `MOCK_STAFF`, `SERVICE_PACKAGES`, `VISA_CATEGORIES`, `INTAKES`, `LEAD_SOURCES` (keep `CLIENT_TYPE_LABEL` map — it's a label lookup, not a list) |
| `data/mockAI.ts` | `QUICK_QUESTIONS`, `SEED_CONVERSATIONS` |
| `data/mockReports.ts` | `MONTHLY_DATA = []`, `ENTITY_DATA = []`; for `PL_DATA`, `BS_DATA`, `CF_DATA`: keep structure, set every numeric leaf to `0` (and any nested rows arrays to `[]`); leave `FX_RATES`, `PL_DRILLDOWN`, `ELIMINATIONS`, `MOCK_ENTITIES` untouched (not in your list). |

Keep all `interface`/`type`/helper function exports so importers still type-check.

### 3b. Bump localStorage version keys `v1 → v2`

| Store file | Current key | New key |
|---|---|---|
| `stores/coaStore.ts` | `accounting:coa-accounts:v1` | `accounting:coa-accounts:v2` |
| `stores/bankAccountsStore.ts` | `accounting:bank-accounts:v1` | `accounting:bank-accounts:v2` |
| `stores/vendorsStore.ts` | `accounting:vendors:v1` | `accounting:vendors:v2` |
| `stores/clientsStore.ts` | `accounting:clients:v1` | `accounting:clients:v2` |
| `stores/apBillsStore.ts` | `accounting:ap-bills:v1` | `accounting:ap-bills:v2` |
| `stores/arInvoicesStore.ts` | `accounting:ar-invoices:v1` | `accounting:ar-invoices:v2` |
| `stores/journalsStore.ts` | `accounting:journals:v1` | `accounting:journals:v2` |
| `stores/accountingMastersStore.ts` | `accounting:masters:v1` | `accounting:masters:v2` (SEED preserved — system items reseed automatically on first read of new key) |

**Note:** `pettyCashStore.tsx` is in-memory React state — no localStorage key exists, nothing to bump. Will mention in the final report.

---

## Fix 4 — Finish `vendorCategoriesStore.ts` shim

The file is already a shim delegating to `accountingMastersStore`, and the one-time migration from the old `accounting:vendor-categories:v1` key already runs inside `accountingMastersStore.ts`. Only missing piece: the spec asks for `removeVendorCategory` to be exported.

**Edit** `stores/vendorCategoriesStore.ts`: add an export

```ts
import { removeMasterItem } from "./accountingMastersStore";
export const removeVendorCategory = (code: string): boolean =>
  removeMasterItem("vendor_categories", code);
```

No consumer changes — `removeMasterItem` already exists in the masters store.

---

## Out of scope / not touched

- No CRM, Commission, or Institutions files.
- No new routes, pages, or npm packages.
- `AccountFormDialog.tsx`, `AddVendorDialog.tsx`, and other consumers — untouched.
- `accountingEntityStore.ts` / `accountingEntitiesStore.ts` — untouched (Fix 1 skipped).

---

## Files that will be modified

**Created (1):** `src/accounting/components/coa/AddSubTypeInlineDialog.tsx`

**Edited (8 stores):** `coaStore.ts`, `bankAccountsStore.ts`, `vendorsStore.ts`, `clientsStore.ts`, `apBillsStore.ts`, `arInvoicesStore.ts`, `journalsStore.ts`, `accountingMastersStore.ts`, `vendorCategoriesStore.ts` (9 actually).

**Edited (17 mock data files):** all files in `src/accounting/data/` listed in the Fix 3a table.
