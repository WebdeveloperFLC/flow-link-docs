## Problem

On `/accounting/ap/new` (and `/accounting/ar/new`), the **Linked COA account** is a hard-coded free-text input ("2000 — Accounts payable" / "1200 — Accounts receivable"). It ignores entity + currency, never reads the live COA store, and conflates the expense/revenue ledger with the AP/AR control account. So a Rent bill cannot be coded to `5200 Rent expense`, and every bill posts against `2000` regardless of the entity's actual chart.

## Fix (frontend + thin store wiring)

### 1. AP New bill — replace single COA input with two Selects

`src/accounting/pages/ap/AccountingNewBillPage.tsx`:

- **Expense / asset account (Dr)** — user-selectable, REQUIRED.
  Source `useAccounts()` filtered to:
  ```ts
  a.status === "ACTIVE"
  && a.isPostable
  && (a.entityId === entityId || a.entityId === null)
  && a.currency === currency
  && (a.groupCode === "EXPENSE" || a.groupCode === "ASSET")
  ```
- **AP control account (Cr)** — auto-prefilled & read-only-ish (still a Select so it can be changed for exceptional cases). Default = first `groupCode === "LIABILITY" && typeCode === "AP"` for the entity+currency.
- Empty / not-ready states inside the Select (same pattern already used for bank dropdown).
- Clear the chosen expense account when entity/currency changes and it's no longer eligible.
- `buildPayload` writes `linkedExpenseCOACode` (Dr) and `linkedCOACode` (Cr = AP).

### 2. AR New invoice — mirror fix

`src/accounting/pages/ar/AccountingNewInvoicePage.tsx`:

- **Revenue account (Cr)** — user-selectable, REQUIRED, filtered to `groupCode === "REVENUE"` + entity + currency.
- **AR control account (Dr)** — auto-prefilled, default = first `groupCode === "ASSET" && typeCode === "AR"` for the entity+currency.
- `buildPayload` writes `linkedRevenueCOACode` (Cr) and `linkedCOACode` (Dr = AR).

### 3. Type fields

- `src/accounting/data/mockAP.ts` — add `linkedExpenseCOACode?: string` to `VendorBill`.
- `src/accounting/data/mockAR.ts` — add `linkedRevenueCOACode?: string` to `CustomerInvoice`.

### 4. Auto-post uses the chosen accounts

`src/accounting/stores/apBillsStore.ts`:
- `findExpenseAccount(bill)` → first try `bill.linkedExpenseCOACode`, then current heuristic.
- AP side: first try `bill.linkedCOACode`, then `findApAccount()`.

### 5. Journal prefill

`src/accounting/pages/journals/AccountingNewJournalPage.tsx` — accrual leg uses `bill.linkedExpenseCOACode` for the Dr line and `bill.linkedCOACode` for the Cr (AP) line; fall back to existing heuristics if unset.

## Worked examples (must match)

- AP Rent bill (Canada entity, CAD): Dr `CA-5200 Rent expense` / Cr `2000 Accounts payable`.
- AR Commission invoice (Canada entity, CAD): Dr `1200 Accounts receivable` / Cr `4301 Canada institution commission`.

## Out of scope

- No DB / schema migrations.
- No changes to `coaStore`, `bankAccountsStore`, or journal posting trigger logic (we only change *which* account is chosen).
- AR bank dropdown stays as-is for now (still uses `SEED_BANK_ACCOUNTS`); fix tracked separately.
- Currency filter preserved on every dropdown (no cross-currency mixing).
