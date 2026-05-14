## Phase 6 — Financial Reports

All 4 report routes are already wired in `App.tsx` (`/accounting/reports/{pl,bs,cashflow,consolidated}`) but the pages are stubs. I'll replace the stubs and add reusable report infrastructure under the existing accounting module. No CRM, sidebar, overview, routing, or previously built page changes.

### Files to create

**Types & data**
- `src/accounting/types/reports.ts` — `ReportNode` (id, label, kind: `header|line|subtotal|total|metric`, current, prior, children?, drilldownKey?, format?), `ReportTree`, `DrillTxn`, `FxRate`, `EntityCode`.
- `src/accounting/data/mockReports.ts` — realistic mock numbers for:
  - P&L tree (Revenue → 4 lines, COGS → 2, OpEx → 6, computed GP/EBITDA/Net) for 6 entities with current + prior period values.
  - Balance Sheet tree (Assets: Current/Non-current; Liabilities: Current/Long-term; Equity) per entity, balanced.
  - Cash Flow tree (Operating/Investing/Financing) with opening + closing balances per entity.
  - 6-month revenue trend series, expense breakdown slices.
  - FX rates: `USD→CAD 1.36`, `INR→CAD 0.0163`, `CAD→CAD 1`.
  - Drilldown transactions keyed by account: date, docRef, entity, branch, account, amount, journalId, counterparty.
  - Helpers: `getPLTree(entities, period, comparison)`, `getBSTree(entities, asOf)`, `getCashFlowTree(entities, period)`, `getDrilldownTxns(key)`, `convertToCAD(amount, currency)`, `sumNode(node)`.

**Reusable report infrastructure** (`src/accounting/components/reports/`)
- `ReportShell.tsx` — wraps `AppLayout` + `AccountingPageHeader` + filter slot + KPI bar slot + body slot. Sticky toolbar.
- `ReportFilterBar.tsx` — entity multi-select (Popover + Checkbox list), branch select, date-range preset (`This month | This quarter | This FY | Custom` with shadcn Calendar in Popover), comparison toggle (`vs last period | vs last year`), `ReportExportMenu` slot. Controlled via props.
- `ReportExportMenu.tsx` — DropdownMenu with `PDF` / `Excel` items (toast only).
- `ReportTable.tsx` — sticky `<thead>` with `position: sticky top-0 bg-background z-10`, configurable columns, recursively renders `ReportRow`. Compact tabular-nums, right-aligned numbers.
- `ReportRow.tsx` — single recursive row. Handles indent by depth, chevron expand/collapse for nodes with children, bold for `subtotal`, accent background + bold for `total`/`metric` (EBITDA, Net Profit, GP%, Net Margin %), green/red `Change %` arrow via `ArrowUp/ArrowDown`. Click opens `ReportDrilldownModal` when `drilldownKey` present. Uses `Collapsible`-style state lifted via context for "expand all/collapse all".
- `ReportSectionHeader.tsx` — uppercase tracking-wider section divider row.
- `ReportDrilldownModal.tsx` — shadcn `Dialog`. Header shows account label + period. Body: shadcn `Table` of mock txns (date, doc ref, entity, branch, account, amount, journal link, counterparty). Footer total row.
- `ReportKPIBar.tsx` — horizontal grid of 3-5 `AccountingKPICard`s with delta arrows.
- `ReportTrendChart.tsx` — recharts `LineChart` (project already uses recharts) for 6-month revenue.
- `ReportBreakdownDonut.tsx` — recharts `PieChart` donut for expense breakdown with legend.

All components: semantic tokens only (`bg-card`, `text-foreground`, `text-muted-foreground`, `border-border`, `text-emerald-600`/`text-rose-600` mapped via `text-[hsl(var(--success))]` style if tokens exist, otherwise tailwind `text-emerald-500`/`text-rose-500` for variance only — variance colors are conventional and acceptable).

### Page implementations

**`AccountingPLPage.tsx`** — `ReportShell` + `ReportFilterBar` (entities default all, period `This quarter`, comparison `vs last period`). `ReportKPIBar`: Revenue, Gross Profit, EBITDA, Net Profit (each with prior + Δ%). `ReportTable` rendering P&L tree with columns: Account / Current / Prior / Change %. Bold subtotals at TOTAL REVENUE, GROSS PROFIT, TOTAL OPEX, EBITDA, NET PROFIT. GROSS MARGIN % and NET MARGIN % rendered as `metric` rows. Below table: 2-column responsive grid with `ReportTrendChart` (6-month revenue) and `ReportBreakdownDonut` (expense breakdown).

**`AccountingBSPage.tsx`** — `ReportShell` + filter bar with `As of` single date picker (replaces date range), entity multi-select, export menu. Two-column responsive layout: left card "Assets" tree, right card "Liabilities + Equity" tree. Bottom validation banner: compute `assetsTotal` and `liabPlusEquity`; if equal show green check `"Balance sheet balances — A = L + E"`; if not equal show amber warning with delta. Drilldown enabled on leaf accounts.

**`AccountingCashFlowPage.tsx`** — `ReportShell` + filter bar (period + entity + export). `ReportKPIBar`: Opening Balance, Net Cash Movement, Closing Balance, Free Cash Flow. `ReportTable` with sections Operating / Investing / Financing using indirect format (Net Income → adjustments → working capital → operating subtotal). Footer rows: Opening + Net change = Closing with validation badge (green if matches, warning otherwise). Drilldown on each line.

**`AccountingConsolidatedPage.tsx`** — `ReportShell` + entity checkbox selector (multi). Side-by-side `ReportTable` with dynamic columns: one per selected entity (showing source-currency amount), then `Eliminations` column (intercompany row pulled from mock), then `Consolidated (CAD)` column using `convertToCAD`. Top toolbar shows currency badge per entity. Below table: small breakdown of elimination entries list.

**`AccountingReportsPage.tsx`** — index page: 4 cards linking to PL / BS / Cash Flow / Consolidated with one-line descriptions and `ArrowRight`. Reuses existing `AccountingPageHeader`.

### Technical details

- State: per-page `useState` for filters, expand/collapse map (`Record<string, boolean>`), drilldown open/key. No persistence.
- Recursive rendering: `ReportTable` flattens via `renderNode(node, depth)` returning `<ReportRow>` + recursive children when expanded. Subtotals are computed at data layer, not in component.
- Formatting: extend `src/accounting/lib/format.ts` with `formatAccounting(n, currency)` (parentheses for negatives, `—` for zero), `formatPercent(n)`, `formatVariance(curr, prior)`. **Append only**, no edits to existing exports.
- Charts: use existing `recharts` (already a dep — confirmed by other pages). No new packages.
- Drilldown: clicking a leaf row with `drilldownKey` opens `ReportDrilldownModal` with `getDrilldownTxns(key)`.
- Export: toast only — `toast.success("Exporting P&L to PDF…")`.
- Sticky headers: `<thead className="sticky top-0 bg-card z-10 border-b">`.
- Dark mode: relies entirely on semantic tokens.
- Variance colors: use `text-emerald-500` / `text-rose-500` (acceptable convention for finance; not theming a brand color).

### Out of scope (not touched)

- `App.tsx`, sidebar, `AccountingOverviewPage`, all previously built journal/AP/AR/owners/approvals/documents pages, CRM modules, types.ts, supabase/, format.ts existing exports.

### File summary

Create:
- `src/accounting/types/reports.ts`
- `src/accounting/data/mockReports.ts`
- `src/accounting/components/reports/ReportShell.tsx`
- `src/accounting/components/reports/ReportFilterBar.tsx`
- `src/accounting/components/reports/ReportExportMenu.tsx`
- `src/accounting/components/reports/ReportTable.tsx`
- `src/accounting/components/reports/ReportRow.tsx`
- `src/accounting/components/reports/ReportSectionHeader.tsx`
- `src/accounting/components/reports/ReportDrilldownModal.tsx`
- `src/accounting/components/reports/ReportKPIBar.tsx`
- `src/accounting/components/reports/ReportTrendChart.tsx`
- `src/accounting/components/reports/ReportBreakdownDonut.tsx`

Replace stubs:
- `src/accounting/pages/reports/AccountingReportsPage.tsx`
- `src/accounting/pages/reports/AccountingPLPage.tsx`
- `src/accounting/pages/reports/AccountingBSPage.tsx`
- `src/accounting/pages/reports/AccountingCashFlowPage.tsx`
- `src/accounting/pages/reports/AccountingConsolidatedPage.tsx`

Append-only edit:
- `src/accounting/lib/format.ts` (add accounting formatters)
