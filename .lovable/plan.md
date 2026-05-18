## Root cause

The seeded HDFC Bank COA row (type_code `BANK`) is being **stripped by the COA store** before it ever reaches the reports.

```
src/accounting/stores/coaStore.ts
  scrubBankAccounts() filters out any account whose typeCode ∈ HIDDEN_TYPE_CODES
src/accounting/stores/coaMasterStore.ts
  export const HIDDEN_TYPE_CODES = new Set(["BANK"]);
  // comment: "banks are owned by the Banks module now"
```

So:
- Posted journal `JE-2026-0001` has two lines (Dr Rent 50k / Cr HDFC 50k) — both confirmed in DB.
- Trial Balance loops over `coaStore` accounts → only sees Rent Expense (Dr 50k). HDFC Bank is invisible → Cr column = 0 → **"OUT OF BALANCE — Difference: ₹50,000"**.
- General Ledger walks journal lines directly, so it correctly shows both — that's why GL looks right while TB doesn't.
- P&L and Balance Sheet screenshots show all zeros, but that's a **separate, pre-existing issue** (those pages still read from the empty `mockReports.ts` constants, not from journals). Not in scope for this fix.

## Fix (data-only, one row)

Update the single seeded HDFC Bank COA row so its type isn't in the bank-stripped set, keeping it as an asset:

```sql
UPDATE accounting_coa
SET    type_code     = 'CASH',
       sub_type_code = NULL
WHERE  id   = '7327e23a-a3bc-4291-8a82-64130a3a3927'
  AND  code = '1110';
```

Why `CASH`:
- It's a seeded system type under group `ASSET` (`coaMasterStore.SEED_TYPES`).
- Normal balance stays `DEBIT`, group stays `ASSET` — no other field needs to change.
- Not in `HIDDEN_TYPE_CODES`, so `coaStore` will load it and the TB will include it.

No schema change, no RLS change, no code change, no new tables, no edits to Personal Wealth / Commissions / Institutions / Accounting code.

## Expected outcome after the fix

Trial Balance at `/accounting/reports/trial-balance` (with `Show zero balances` off, as in the screenshot):

```
ASSETS
  1110  HDFC Bank             —          ₹50,000.00   (shown in CR column, in red parens — it's the contra side of a debit-normal account)
Total Assets                   —          ₹50,000.00

EXPENSES
  6100  Rent Expense       ₹50,000.00         —
Total Expenses              ₹50,000.00         —

TOTAL                       ₹50,000.00    ₹50,000.00
✓ Trial balance is balanced — Total: ₹50,000.00
```

`Total Assets` KPI card at top will read **−₹50,000** (signed, because the bank is in overdraft on the seeded fictitious journal). That's accounting-correct given there's only one journal and no opening cash — it's not an error.

## Out of scope (not touched)

- `AccountingBSPage.tsx` / `AccountingPLPage.tsx` still read from empty `mockReports.ts` — they will continue to show $0. Wiring those to the journals store is a separate, larger refactor; flagged here for visibility but not done in this plan.
- The `BRIDGE_ENABLED` flag stays `false`.
- The accounting module code, RLS policies, and other modules are not modified.

## Verification

1. Re-run the COA query — confirm `1110 HDFC Bank` now has `type_code = 'CASH'`.
2. Hard-refresh `/accounting/reports/trial-balance` (the local cache in `accounting:coa-accounts:v5` will be replaced by the Supabase hydration on next load).
3. Confirm green "✓ Trial balance is balanced" banner.
