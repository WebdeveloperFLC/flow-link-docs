## Goal

Make the Balance Sheet (`/accounting/reports/bs`) and Profit & Loss (`/accounting/reports/pl`) pages compute from real POSTED journals + COA, same pattern as the (now-working) Trial Balance and General Ledger. After this, the May 2026 rent journal will populate both reports.

## Scope

- `src/accounting/pages/reports/AccountingBSPage.tsx` — replace `BS_DATA` reads with a `useMemo` that walks `useAccounts()` + `useJournals()`.
- `src/accounting/pages/reports/AccountingPLPage.tsx` — replace `PL_DATA` / `MONTHLY_DATA` / `PL_DRILLDOWN` reads with the same pattern.

No DB changes. No new files. No edits to other modules. `mockReports.ts` constants stay (still used by `ReportFilterBar` / consolidated / cashflow pages) but BS/PL stop reading from them.

## How it will work (technical)

Reuse the exact computation TB does (closing balance per account):

```ts
closing = opening + sum(debit if nature=DEBIT else credit)
                  - sum(credit if nature=DEBIT else debit)
// over all POSTED lines where entryDate <= asOf and entity matches filter
```

### Balance Sheet
- For each account in `useAccounts()` with `group ∈ {ASSET, LIABILITY, EQUITY}`, compute signed closing as of `asOf`.
- Bucket by `subTypeCode` (or fallback to `typeCode`) into:
  - Assets → current vs non-current (use existing seed sub-types: `CASH`, `BANK`, `AR`, `INVENTORY`, `PREPAID` → current; `FIXED_ASSET`, `INTANGIBLE`, `LT_INVESTMENT` → non-current; unknown → current).
  - Liabilities → current vs non-current (similar split on sub-type).
  - Equity → single bucket.
- Retained earnings line: derive as `Σ(revenue closing − expense closing − tax)` up to `asOf` so the sheet actually balances (TB has Rent ₹50k expense → RE = −₹50k → balances HDFC −₹50k).
- Keep zero-balance accounts hidden; keep existing UI (rows, totals, pie chart). Pie buckets use closing balances from the computed list.

### Profit & Loss
- For each account with `group ∈ {REVENUE, COGS, EXPENSE, OTHER_INCOME, OTHER_EXPENSE}`, compute period activity:
  - Current = sum within selected period.
  - Prior = same window shifted back (month/quarter/YTD/last FY → mirror).
- Bucket revenue, cost of revenue (COGS), operating expenses (EXPENSE), tax expense (account code `9000` if present, else 0).
- Build `chartData` (last 6 months) by grouping POSTED line activity by `entryDate` month.
- Drill-down: list POSTED journal lines hitting that account in the current period; link to `/accounting/journals` unchanged.

### Filters
- BS: `asOf` date + entity filter already in the page — wire them into the memo.
- P&L: entity + period (month/quarter/ytd/lastfy/custom) → compute `[from,to]` and `[priorFrom,priorTo]`. Entity dropdown populated from `useEntities()` instead of `ENTITY_DATA`.

## Out of scope

- Cash Flow page, Consolidated page — still on mock data (flagged, not touched).
- Multi-currency FX translation — use native amounts; entity filter handles isolation.
- Schema, RLS, edge functions, other modules.

## Verification

1. `/accounting/reports/bs` with asOf `2026-05-31`:
   - Assets → HDFC Bank −₹50,000 (current).
   - Equity → Retained earnings −₹50,000.
   - Green "Balance sheet is balanced" banner.
2. `/accounting/reports/pl` with YTD period:
   - Operating expenses → Rent Expense ₹50,000.
   - Net profit −₹50,000.
   - Last-6-months chart shows a May 2026 expense bar.
3. Trial Balance and General Ledger unchanged (still balanced).
