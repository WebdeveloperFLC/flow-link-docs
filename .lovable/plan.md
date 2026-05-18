## Two issues, one is a bug, one is expected behavior

### 1. Missing Export button — bug, will fix

Trial Balance has a working CSV export. Report reconciliation and Consolidated report don't. I'll add matching "Export CSV" buttons to both, in the page header area to stay consistent with TB.

**Report reconciliation (`AccountingReconciliationPage.tsx`)**
- Add `Export CSV` button next to the "As of" filter
- CSV contains: the 3 identity checks (label, left value, right value, difference, status) + the totals tiles (Assets, Liabilities, Equity, Net Income, Revenue, Expenses, TB Debits, TB Credits)
- Filename: `report-reconciliation-${asOf}.csv`

**Consolidated report (`AccountingConsolidatedPage.tsx`)**
- Add `Export CSV` button in the page header
- CSV contains: per-entity rows (entity, currency, FX rate, revenue native, revenue CAD, expenses CAD, profit CAD) + eliminations + consolidated totals (Revenue, Expenses, Gross profit, Net profit, Margin %)
- Filename: `consolidated-report-${today}.csv`

Both will reuse the same small `downloadCsv` helper pattern from `AccountingTrialBalancePage.tsx` (inline, no new shared file needed — it's ~5 lines).

### 2. Date change still shows entries — expected behavior, not a bug

The "As of" date in Report reconciliation is a **cutoff date**, not a single-day filter. The logic includes every posted journal with `entryDate <= asOf`. So if you pick today, you see all history up to today; if you pick last month, you see everything up to last month.

This is the correct accounting behavior — Balance Sheet, Trial Balance, and reconciliation checks are always cumulative as of a point in time. To see "no entries", you'd need to pick a date before the earliest posted journal.

If you actually want a date **range** instead (only entries between From/To), that's a different feature and I can add a `From` date alongside the `As of` cutoff — just let me know.

### Files touched
- `src/accounting/pages/reports/AccountingReconciliationPage.tsx` — add Export CSV button + handler
- `src/accounting/pages/reports/AccountingConsolidatedPage.tsx` — add Export CSV button + handler

No schema, store, or routing changes.