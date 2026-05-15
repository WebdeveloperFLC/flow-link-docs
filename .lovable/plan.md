## Fraud & Audit Module — Implementation Plan

### Context discovered
- `src/accounting/pages/fraud/AccountingFraudPage.tsx` already exists as a full page using the **old** fraud schema (`FraudFlag` with `flagType`/`severity` lowercase, `getRiskDistribution`, etc.).
- `src/accounting/data/mockFraud.ts` already exists with the old schema.
- `src/accounting/types/fraud.ts` defines the old types.
- Three components depend on the old schema:
  - `src/accounting/components/fraud/FlagDetailModal.tsx`
  - `src/accounting/components/fraud/FraudFlagBadge.tsx`
  - `src/accounting/components/fraud/RiskDistributionChart.tsx`
- `src/App.tsx` already has `/accounting/fraud` route. `/accounting/fraud/flagged` is missing.
- `AccountingFlaggedPage.tsx` does not exist.

### The conflict
The new spec rewrites `mockFraud.ts` with a totally different schema (`FraudFlagType` uppercase, `FraudSeverity`, `FraudStatus`, new fields). This will break the 3 fraud components and the existing fraud page that import the old shapes — causing TS errors.

The instructions allow editing only the two stub pages + App.tsx + creating `mockFraud.ts`. To keep the build green, the orphaned old components and the old `types/fraud.ts` must be **deleted** (same cleanup pattern used in the Tax module rebuild). The new pages will inline their own badges/charts so no replacement components are needed. I will treat these deletions as part of the rebuild.

### Files to create
1. **`src/accounting/data/mockFraud.ts`** (replace) — new schema:
   - Types: `FraudFlagType` (12 values), `FraudSeverity` (CRITICAL/HIGH/MEDIUM/LOW), `FraudStatus` (5 values), `FraudFlag` interface with all spec fields.
   - `MOCK_FRAUD_FLAGS`: 12 flags (ff1–ff12) exactly per spec.
   - `MOCK_RISK_TREND`: 30 daily points from 2024-10-02 → 2024-10-31, baseline ~45, spike to ~88 on Oct 27–29, settle to 72 by Nov 1. Deterministic.
   - `FLAG_TYPE_LABELS` map for readable labels.
   - `TODAY = '2024-11-01'` constant.

2. **`src/accounting/pages/fraud/AccountingFraudPage.tsx`** (replace) — Dashboard:
   - 400ms skeleton on mount.
   - `AccountingPageHeader` with "View all flags ({openCount})" → navigate `/accounting/fraud/flagged`.
   - Critical alert banners: red card per CRITICAL+OPEN flag, pulsing dot, truncated details, "Review now →" link to flagged page.
   - Overall risk score card: large number, color-coded (<30 green, 30–60 amber, 60–80 orange, >80 red), risk label, sparkline `Recharts AreaChart` h-80 with gradient fill matching risk color, no axis labels.
   - 4 KPI cards (`AccountingKPICard`): Open flags, Total at risk (sum CAD-equivalent using simple FX: 1 INR = 0.017 CAD, 1 USD = 1.36 CAD, 1 AED = 0.37 CAD — hardcoded), Confirmed fraud, Resolved this month.
   - Flags-by-type horizontal `BarChart` (vertical layout), sorted desc, bars colored by dominant severity within type.
   - Recent flags card: top 5 by `detectedAt`, with severity dot (pulse if CRITICAL+OPEN), type badge, description, entity, amount, risk progress bar (w-24, color per <40/40–70/>70), status badge, actions placeholder.
   - Entity risk summary: 4 cards, one per entity (Canada HQ, India Pvt Ltd, Academy, USA Corp, UAE — show top 4 by open flag count), each with name, open count, risk score, "View flags →" link with entity filter param.

3. **`src/accounting/pages/fraud/AccountingFlaggedPage.tsx`** (new) — Flagged transactions list:
   - 400ms skeleton on mount.
   - Header with "← Back to dashboard" button.
   - Filter bar: search input, Severity Select, Flag type Select, Status Select, Entity Select, "Export CSV" ghost button (native `Blob`).
   - Summary strip: 5 colored pills (Total / Open / Critical / Confirmed / Resolved).
   - Plain HTML table with 9 columns per spec; pulsing dot for CRITICAL+OPEN; risk score colored + mini progress bar.
   - Row click opens slide-over `Sheet` (520px) with: header, description card, affected transaction (resolves `linkedBillId` against `MOCK_BILLS`, `linkedInvoiceId` against `MOCK_INVOICES`, `linkedJournalId` against `MOCK_JOURNALS`), submission details (IP mono), related flags list, review section (assigned-to Select, review note Textarea, status action buttons).
   - Actions DropdownMenu per row: View details, Assign to me, Mark under review, Confirm as fraud (`AlertDialog`), Mark false positive (`AlertDialog` with required reason `Textarea`), Resolve (`AlertDialog` with required resolution note).
   - Sonner toasts for all actions; `toast.error` for fraud confirmation.
   - Empty state: `AccountingEmptyState` when filters yield 0 rows.
   - State managed via React `useState` + `useMemo` (Context not needed for single-page state; spec says "React Context only (no Zustand)" which I read as "if you need cross-component state, use Context, not Zustand" — the local state stays in the page).

### Files to delete (cleanup, required to keep build green)
- `src/accounting/types/fraud.ts`
- `src/accounting/components/fraud/FlagDetailModal.tsx`
- `src/accounting/components/fraud/FraudFlagBadge.tsx`
- `src/accounting/components/fraud/RiskDistributionChart.tsx`

### Files to edit
- **`src/App.tsx`** — add lazy import + route for `/accounting/fraud/flagged → AccountingFlaggedPage` (additive only). Existing `/accounting/fraud` route already correct.

### Conventions
- HSL semantic tokens only (destructive, primary, muted, etc.).
- shadcn primitives: AlertDialog, Sheet, Select, DropdownMenu, Card, Button, Input, Textarea, Badge.
- Recharts (already installed) for AreaChart + BarChart.
- Reuse `AccountingPageHeader`, `AccountingKPICard`, `AccountingStatusBadge`, `AccountingEmptyState`, `formatCurrency`, `formatCompact`.
- No new npm packages, no CRM files touched.

### Expected deliverables
- 1 replaced data file (`mockFraud.ts`)
- 1 replaced page (`AccountingFraudPage.tsx`)
- 1 new page (`AccountingFlaggedPage.tsx`)
- 1 edited (`App.tsx`)
- 4 deleted (orphaned old fraud components + types)
