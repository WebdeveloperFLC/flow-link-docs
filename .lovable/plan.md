## Reports module — full implementation

All 5 report routes and page stubs already exist in `src/App.tsx`; no routing changes required.

### Files to create (1)
- `src/accounting/data/mockReports.ts` — exports `MONTHLY_DATA`, `ENTITY_DATA`, `PL_DATA`, `BS_DATA`, `CF_DATA`, plus `FX_RATES` and `PL_DRILLDOWN` (3 hardcoded transactions per P&L line).

### Files to replace (5 stubs → full pages)
1. `src/accounting/pages/reports/AccountingReportsPage.tsx` — Hub: period ToggleGroup (This month/Quarter/YTD/Last year/Custom, default YTD), 6 report cards (P&L, BS, Cash flow, Consolidated, AR aging, AP aging) using lucide icons + colored badges, + 4 KPI cards row using `AccountingKPICard`.
2. `src/accounting/pages/reports/AccountingPLPage.tsx` — Filter bar (Entity/Period select, "vs Prior period" Switch, Export ghost), 3 summary cards, full P&L HTML table (Revenue → Cost of revenue → Gross profit → Operating expenses → EBITDA → Tax → Net profit) with prior-period column when toggle on, % change colored. Click any line → shadcn `Sheet` drill-down with 3 mock transactions + link to `/accounting/journals`. Recharts `ComposedChart` (Revenue/Expenses bars + Net profit line) on last 6 months.
3. `src/accounting/pages/reports/AccountingBSPage.tsx` — As-of date input (default 2024-10-31), Entity Select, Export ghost. Balance check banner (green when balanced). Two-column Assets / Liabilities+Equity tables with totals, total-of-totals border-t-2. Recharts `PieChart` donut for asset breakdown.
4. `src/accounting/pages/reports/AccountingCashFlowPage.tsx` — Period/Entity Select, Export ghost. 4 summary cards (Operating/Investing/Financing/Net change). Three sectioned table with +/- prefix, color tokens, opening + net + closing reconciliation. Recharts `BarChart` waterfall (Opening → Operating → Investing → Financing → Closing) with green/red bars.
5. `src/accounting/pages/reports/AccountingConsolidatedPage.tsx` — Entity checkboxes (Select all / Clear all), amber FX rates banner. Consolidated table: Category × {entities + Eliminations + Consolidated} with mock intercompany eliminations (red, with tooltip). Recharts grouped `BarChart` (Revenue/Expenses/Profit groups, one bar per entity, distinct colors). Entity cards grid below with native+CAD amounts, margin %, 3-bar sparkline from `MONTHLY_DATA`.

### Cross-cutting
- 400 ms `useEffect` skeleton on each page mount (skeleton components from shadcn `Skeleton`).
- All arithmetic via `addDecimals` / `Decimal`; all formatting via `formatCurrency` / `formatCompact` / `formatAccounting` / `formatPercent`.
- Confirmations via shadcn `AlertDialog`; toasts via `sonner`. Export buttons: `toast.info("Export to PDF/Excel coming soon")`.
- Plain HTML tables + Tailwind only; HSL semantic tokens (`bg-muted`, `text-primary`, `text-destructive`, `bg-green-50/50` only for emphasis rows as spec'd). Recharts stroke colors are the only place raw hex is allowed.
- Fully responsive: tables wrap in `overflow-x-auto`; grids collapse to single column on mobile.
- No new npm packages. No CRM files touched. No other accounting files touched. `App.tsx` not modified (routes already exist).

### Files modified summary
- 1 new: `mockReports.ts`
- 5 replaced: the five report page files
- 0 edits to `App.tsx`
