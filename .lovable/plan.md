## Goal

1. Confirm/strengthen the Chart of Accounts (COA) **edit dialog** with full validation (code, name, parent, status). The dialog already exists — this step just hardens it and keeps it scoped to COA.
2. Build a brand-new **Bank Accounts** module as a separate page under the existing Accounting module, linked to (but not part of) Chart of Accounts.

No CRM changes. No new top-level modules. Reuses existing accounting design system (`AccountingPageHeader`, `AccountingAGGrid`, `AccountingKPICard`, `ConfirmDialog`, semantic tokens, dark mode).

---

## Part 1 — Chart of Accounts edit dialog hardening

File: `src/accounting/components/coa/AccountFormDialog.tsx` (already present)

Validation rules (block submit + show inline errors via `toast` + field message):
- **Account code**: required, trimmed, 2–20 chars, alphanumeric + `-` `.`, unique across all accounts (excluding the row being edited).
- **Account name**: required, trimmed, 2–80 chars.
- **Parent**: optional; if set must (a) exist, (b) not be the account itself, (c) not be a descendant (no cycles), (d) belong to the same `groupCode` as the child.
- **Group / Type**: required; type must belong to selected group.
- **Status**: ACTIVE | INACTIVE; if changing to INACTIVE and the account has active children, warn via `ConfirmDialog`.
- Currency required, opening balance numeric.

The dialog stays **only** in the COA module — not used for Bank Accounts.

---

## Part 2 — Bank Accounts module

### Route & nav

- New route in `src/App.tsx`: `/accounting/bank-accounts` and `/accounting/bank-accounts/:id`.
- Sidebar entry in `src/components/layout/AppLayout.tsx`, inserted right after Chart of Accounts: `{ to: "/accounting/bank-accounts", icon: Landmark, label: "Bank accounts" }`.

### Types — `src/accounting/types/bankAccounts.ts`

```ts
export type BankAccountStatus = "ACTIVE" | "INACTIVE";
export interface BankAccount {
  id: string;
  // Entity & branch linking
  country: string;            // ISO-2
  entityId: string;           // top-level company entity
  branchId: string | null;    // sub-entity / branch
  coaAccountId: string;       // linked COA ledger (must exist & be ACTIVE)
  currency: string;
  // Bank details
  bankName: string;
  nickname: string;
  holderName: string;
  accountNumber: string;
  iban?: string;
  swift?: string;
  ifsc?: string;              // India
  routingNumber?: string;     // US
  transitNumber?: string;     // CA
  branchCode?: string;
  branchName?: string;
  branchAddress?: string;
  // Contact
  rmName?: string;
  rmEmail?: string;
  rmPhone?: string;
  // Settings
  isDefaultPayment: boolean;
  isDefaultPayroll: boolean;
  isDefaultTax: boolean;
  reconciliationEnabled: boolean;
  status: BankAccountStatus;
  // Reconciliation snapshot
  lastReconciledAt?: string | null;
  lastReconciliationStatus?: "MATCHED" | "PENDING" | "DISCREPANCY" | null;
  createdAt: string;
}
```

### Store — `src/accounting/stores/bankAccountsStore.ts`

`useSyncExternalStore` + `localStorage('accounting:bank-accounts:v1')`. Exposes `useBankAccounts`, `addBankAccount`, `updateBankAccount`, `deleteBankAccount`, `toggleStatus`, `setDefault(kind, id)` (which clears the same `default*` flag on all sibling accounts in the same entity+currency).

### Mock seed — `src/accounting/data/mockBankAccounts.ts`

~6 realistic accounts covering CA/US/IN entities with linked COA bank ledgers and varied reconciliation status.

### Page — `src/accounting/pages/bank-accounts/AccountingBankAccountsPage.tsx`

Layout mirrors the COA page:
- `AccountingBreadcrumbs` + `AccountingPageHeader` ("Bank accounts") + `DarkModeToggle` + "New bank account".
- KPI strip: Total accounts, Active, Default payment set?, Reconciliation pending.
- Filter row: search (bank/nickname/account-number masked), country, entity, branch, currency, status, default-type, reconciliation status.
- `AccountingAGGrid` columns: Nickname · Bank · Account # (masked, last 4) · Entity / Branch · Linked COA · Currency · Defaults (badges P / PR / T) · Recon status · Last reconciled · Status · row menu (View / Edit / Toggle active / Set default… / Delete).
- Empty state, loading skeleton, mobile card list.
- `ConfirmDialog` for delete (blocked if linked to journal entries — use `MOCK_JOURNALS` lookup helper).

### Detail page — `src/accounting/pages/bank-accounts/AccountingBankAccountDetailPage.tsx`

Tabs:
1. **Overview** — KPI cards (current balance from linked COA account, last reconciled date, recon status), full bank details, contact details.
2. **Settings** — toggles for defaults + reconciliation.
3. **Reconciliation** — embedded preview from `mockReconciliation` filtered by `bankAccountId`, plus "Open in Reconciliation module" link.
4. **Activity** — recent journal entries posted to the linked COA ledger.

### Dialog — `src/accounting/components/bank-accounts/BankAccountFormDialog.tsx`

Sectioned form (no overload of COA dialog):
- Section 1 *Entity & linking*: Country (Select), Entity, Branch (filtered by selected entity), Currency, **Linked COA ledger** (Select limited to accounts in groups Assets/Cash & Bank — i.e., types whose group nature = DEBIT and type code includes Bank/Cash; with "+ Add new bank ledger" shortcut that opens the COA `AccountFormDialog` pre-set to a Bank type).
- Section 2 *Bank details*: bank name, nickname, holder, account number, IBAN, SWIFT, IFSC, routing, transit, branch code, branch name, branch address.
- Section 3 *Contact*: RM name, email, phone.
- Section 4 *Settings*: 4 switches (default payment, default payroll, default tax, reconciliation enabled), status switch.

Validation:
- Required: country, entity, COA ledger, currency, bank name, nickname, holder, account number, status.
- Account number: 4–34 chars, digits/letters/space/`-`.
- IBAN (if provided): 15–34 chars, uppercase alphanumeric.
- SWIFT (if provided): 8 or 11 chars, uppercase alphanumeric.
- IFSC (if provided): 11 chars, `^[A-Z]{4}0[A-Z0-9]{6}$`.
- Email (if provided): valid email.
- Currency must match the linked COA ledger's currency.
- Branch (if set) must belong to the chosen entity in `accountingEntitiesStore`.
- Setting `isDefaultPayment/Payroll/Tax = true` will (with confirmation) unset the same flag on other accounts of the same entity+currency.

### Reconciliation integration

- Add helper in `bankAccountsStore.ts` `getLastReconciliation(bankAccountId)` reading from `mockReconciliation`.
- Update `mockReconciliation` rows to carry an optional `bankAccountId` field where applicable (non-breaking — field is optional).
- Reconciliation page: add a "Bank account" filter that reads from the bank-accounts store. (Small additive change, not a redesign.)

### Components folder

`src/accounting/components/bank-accounts/`
- `BankAccountFormDialog.tsx`
- `BankAccountStatusBadge.tsx`
- `BankAccountDefaultsBadges.tsx` (renders P / PR / T pill chips)
- `LinkedCoaAccountSelect.tsx` (filters COA accounts to bank-eligible types, supports "+ Add new")
- `ReconciliationStatusPill.tsx`

### UX

- Semantic tokens only, no raw color classes.
- Responsive: AG Grid on ≥md, card list on mobile.
- Dark mode via existing `themeStore` + `DarkModeToggle`.
- Keyboard shortcut `N` opens new bank account on the page.
- Account numbers masked in list view (`••••1234`), full visible only in detail page.

---

## Files to create

- `src/accounting/types/bankAccounts.ts`
- `src/accounting/stores/bankAccountsStore.ts`
- `src/accounting/data/mockBankAccounts.ts`
- `src/accounting/pages/bank-accounts/AccountingBankAccountsPage.tsx`
- `src/accounting/pages/bank-accounts/AccountingBankAccountDetailPage.tsx`
- `src/accounting/components/bank-accounts/BankAccountFormDialog.tsx`
- `src/accounting/components/bank-accounts/BankAccountStatusBadge.tsx`
- `src/accounting/components/bank-accounts/BankAccountDefaultsBadges.tsx`
- `src/accounting/components/bank-accounts/LinkedCoaAccountSelect.tsx`
- `src/accounting/components/bank-accounts/ReconciliationStatusPill.tsx`

## Files to edit (additive only)

- `src/App.tsx` — add 2 routes.
- `src/components/layout/AppLayout.tsx` — add sidebar entry.
- `src/accounting/components/coa/AccountFormDialog.tsx` — tighten validation per Part 1.
- `src/accounting/pages/reconciliation/AccountingReconciliationPage.tsx` — add bank-account filter (small, additive).

## Out of scope

- No CRM changes.
- No COA schema changes (Bank Accounts only **references** COA, never embeds operational bank fields into it).
- No backend/Supabase changes — uses existing local-store pattern consistent with the rest of the accounting module.
