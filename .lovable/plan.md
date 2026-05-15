
# Chart of Accounts — Full Build

Replace the `AccountingCOAPage` "Coming soon" placeholder with a complete enterprise COA module. All work stays inside `src/accounting/`. No new routes, no CRM changes.

## 1. Types — `src/accounting/types/coa.ts` (NEW)

```ts
type AccountGroupCode = string;        // configurable
type AccountTypeCode = string;         // configurable
type AccountStatus = "ACTIVE" | "INACTIVE";

interface AccountGroup { code; label; nature: "DEBIT" | "CREDIT"; system?: boolean }
interface AccountType  { code; label; groupCode; system?: boolean }

interface CoaAccount {
  id; code; name;
  groupCode; typeCode;
  parentId: string | null;
  currency: string;
  entityId: string | null;     // null = all entities
  taxCode?: string | null;
  openingBalance: number;
  currentBalance: number;
  status: AccountStatus;
  description?: string;
  txnCount: number;            // drives delete safety
  createdAt: string;
}
```

## 2. Master data store — `src/accounting/stores/coaMasterStore.ts` (NEW)

`useSyncExternalStore` pattern, persisted to `localStorage('accounting:coa-master')`.

Seeded defaults:
- **Groups** (8): Assets, Liabilities, Equity, Revenue, Cost of Revenue, Expenses, Other Income, Other Expenses (`system: true`).
- **Types**: full list from spec (Bank, Cash, Petty Cash, AR, Fixed Assets, Investments, Prepaid Expenses, AP, Credit Cards, Loans, Payroll Liabilities, Tax Payables, Owner Equity, Retained Earnings, Tuition Revenue, Visa Service Revenue, Immigration Revenue, Commission Income, Coaching Revenue, Language Training Revenue, Salaries, Rent, Utilities, Marketing, Travel, Office Supplies, Software, Professional Fees, Taxes, Bank Charges, Petty Cash Expenses) — each `system: true`.

API: `useGroups()`, `useTypes()`, `addGroup(label, nature)`, `addType(label, groupCode)`. System rows cannot be deleted; user-added rows can.

## 3. Accounts store — `src/accounting/stores/coaStore.ts` (NEW)

Same store pattern, persisted to `localStorage('accounting:coa-accounts')`.

Seeded with realistic study-abroad/immigration/coaching COA (~40 accounts) covering all groups, e.g.:
- 1010 Bank — RBC Operating (CAD, Canada HQ)
- 1020 Bank — HDFC Current (INR, India branch)
- 1100 Accounts Receivable — Students
- 1110 Accounts Receivable — Visa clients
- 1500 Office Equipment (Fixed Asset)
- 2010 Accounts Payable
- 2100 GST/HST Payable, 2110 GSTR Output Tax
- 3010 Owner Equity, 3100 Retained Earnings
- 4010 Tuition Revenue, 4020 Visa Service Revenue, 4030 Immigration Revenue, 4040 Commission Income, 4050 IELTS Coaching, 4060 PTE Coaching, 4070 German Language, 4080 French Language, 4090 GRE/GMAT Coaching
- 5010 Counselor Salaries, 5020 Trainer Salaries, 6010 Rent, 6020 Utilities, 6030 Marketing — Google Ads, 6040 Marketing — Meta, 6050 Travel — Country Visits, 6060 Software (CRM, Zoom), 6070 Professional Fees, 6080 Bank Charges, 6090 Petty Cash Expenses

Some parent/child pairs (e.g. 4050 IELTS Coaching → 4051 IELTS Online, 4052 IELTS Classroom) to demo nesting.

API:
- `useAccounts()`
- `addAccount(input)` — validates: unique code, parent's group matches, no circular parent
- `updateAccount(id, patch)` — same validations
- `deleteAccount(id)` — blocks if `txnCount > 0` OR account has children
- `getDescendants(id)`, `getAncestors(id)`

## 4. Page — replace `src/accounting/pages/coa/AccountingCOAPage.tsx`

Layout:
- `AccountingPageHeader` with title "Chart of accounts", breadcrumbs, "New account" button.
- KPI strip (4 cards): Total accounts, Active, Inactive, Total balance (sum by nature).
- Filters row: search input (`data-search`), group select, type select, entity select, status select, currency select, "Expand all" / "Collapse all" toggles.
- Tree table (AG Grid via `AccountingAGGrid` with `treeData`):
  - Columns: Code, Name (auto-group with chevrons), Type, Group, Parent, Currency, Entity, Status badge, Balance (right-aligned, formatted), Actions menu.
  - `getDataPath` builds path from `parentId` chain so AG Grid renders the hierarchy natively (expand/collapse, unlimited nesting).
- Empty state via `AccountingEmptyState` when no accounts after filters.
- Loading via `AccountingTableSkeleton` on first mount (200ms simulated).
- Mobile (`useIsMobile`): stacked card list grouped by group code.

Row actions: View, Edit, Add child, Toggle active/inactive, Delete (uses `ConfirmDialog`; disabled with tooltip if `txnCount > 0` or has children).

## 5. Dialogs

`src/accounting/components/coa/AccountFormDialog.tsx` (NEW) — used for new + edit + add child.

Fields:
- Account code (required, unique check live)
- Account name (required)
- **Account group** — Select with `useGroups()` items + "+ Add new group" footer item that opens inline mini-dialog (label + nature DR/CR) → `addGroup()` → auto-selects.
- **Account type** — Select filtered by chosen group + "+ Add new type" footer item → `addType()`.
- **Parent account** — searchable Select of accounts in same group; excludes self + descendants (circular guard).
- Currency — Select (CAD, USD, INR, EUR, GBP, AED, AUD, SGD, CZK + "Other").
- Entity scope — multi-select from `useAccountingEntities()`; empty = All entities.
- Tax mapping — optional, free text or select.
- Opening balance — number, defaults 0.
- Status — Active/Inactive switch.
- Description — textarea.

Live validation: duplicate code → red helper text; submit disabled.

`src/accounting/components/coa/AccountDetailDrawer.tsx` (NEW)

Opens on row click. Sections:
- Header: code · name · type · status badge.
- KPI cards: Current balance, Opening balance, Monthly movement (mock), Last activity.
- Recent transactions table (mock from `mockJournals` filtered by account code).
- Linked journal entries (count + link to Journals page).
- Linked reports chips (Trial balance, P&L, Balance sheet — link out).
- Reconciliation status badge (mock from `mockReconciliation`).
- Footer: Edit, Add child, Delete (same safety as row).

## 6. Components

```text
src/accounting/components/coa/
  CoaTreeTable.tsx          NEW — AG Grid tree wrapper
  AccountFormDialog.tsx     NEW
  AccountDetailDrawer.tsx   NEW
  AddGroupInlineDialog.tsx  NEW
  AddTypeInlineDialog.tsx   NEW
  AccountStatusBadge.tsx    NEW (reuses semantic tokens)
```

## 7. Safety rules (implemented in store)

- **Duplicate code**: `addAccount` / `updateAccount` reject if `accounts.some(a => a.code === code && a.id !== id)`.
- **Circular parent**: when setting `parentId`, walk ancestors; reject if `id` appears.
- **Delete with transactions**: reject if `txnCount > 0`.
- **Delete with children**: reject if any account has `parentId === id` (UI suggests deleting children first or reparenting).
- **Group/type consistency**: child must share parent's group.

All rejections surface via toast + inline form errors.

## 8. UX

- Semantic tokens only (no raw hex).
- Dark mode: AG Grid theme already reacts to `dark` class via `AccountingAGGrid`.
- `AccountingBreadcrumbs` in header (Accounting → Chart of accounts).
- Confirmation via existing `ConfirmDialog`.
- Keyboard: `N` opens new account dialog (via `useKeyboardShortcuts`), `/` focuses search.
- Responsive: filters wrap; mobile card view under 768px.

## 9. File map

```text
src/accounting/
  types/coa.ts                                       NEW
  stores/coaMasterStore.ts                           NEW
  stores/coaStore.ts                                 NEW
  data/mockCoa.ts                                    NEW (seed accounts)
  components/coa/
    CoaTreeTable.tsx                                 NEW
    AccountFormDialog.tsx                            NEW
    AccountDetailDrawer.tsx                          NEW
    AddGroupInlineDialog.tsx                         NEW
    AddTypeInlineDialog.tsx                          NEW
    AccountStatusBadge.tsx                           NEW
  pages/coa/AccountingCOAPage.tsx                    REPLACE
```

No route changes. No sidebar changes. No CRM changes.
