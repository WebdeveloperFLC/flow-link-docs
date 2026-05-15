## Tax & Compliance module — Phase 2

### Files

**New (2):**
- `src/accounting/data/mockTax.ts` *(replaces existing — see conflict below)*
- `src/accounting/pages/tax/AccountingTaxDashboardPage.tsx`

**Replaced (2 stubs):**
- `src/accounting/pages/tax/AccountingTaxCalendarPage.tsx`
- `src/accounting/pages/tax/AccountingNoticesPage.tsx`

**Edited (1):**
- `src/App.tsx` — swap `/accounting/tax` route from `AccountingTaxPage` → `AccountingTaxDashboardPage` (import line + route element).

### Conflict to resolve

The existing `mockTax.ts` (schema: `TaxFiling`, `MOCK_FILINGS`) and `mockNotices.ts` (`ComplianceNotice`) are imported by:
- `src/accounting/pages/tax/AccountingTaxPage.tsx` (current `/accounting/tax`)
- `src/accounting/components/tax/{FilingStatusBadge,UpcomingDeadlinesTimeline,AddNoticeDialog}.tsx`
- `src/accounting/pages/tax/AccountingNoticesPage.tsx` (being replaced)

The new schema (`TaxPeriod`, `MOCK_TAX_PERIODS`, new `ComplianceNotice` shape) is incompatible. To honor "no new packages" and keep TypeScript clean, the plan will:

1. Rewrite `mockTax.ts` with the new schema and **fold the new `ComplianceNotice` + `MOCK_NOTICES` into the same file** (one source of truth, matching the spec). `mockNotices.ts` will be left untouched but unused (safe — no runtime impact). If you'd prefer it deleted, say so.
2. **Delete** the now-orphaned files that depended on the old schema (otherwise the build breaks):
   - `src/accounting/pages/tax/AccountingTaxPage.tsx`
   - `src/accounting/components/tax/FilingStatusBadge.tsx`
   - `src/accounting/components/tax/UpcomingDeadlinesTimeline.tsx`
   - `src/accounting/components/tax/AddNoticeDialog.tsx`
   - `src/accounting/types/tax.ts` (types now live in `mockTax.ts`)

These deletions are necessary — leaving them in place causes TS errors. Confirm or I'll proceed as listed.

### `mockTax.ts` contents

- `TODAY = new Date('2024-11-01')`
- Types: `TaxType`, `FilingStatus`, `NoticeStatus`, `TaxPeriod`, `ComplianceNotice` (per spec)
- `MOCK_TAX_PERIODS`: 20 records exactly as listed (CA×5, IN-Pvt×7, IN-Academy×2, US×4, AE×2)
- `MOCK_NOTICES`: 8 records exactly as listed
- Helper `daysBetween(a,b)` for `daysUntilDue`/`daysOverdue` derivation

### Page 1 — `AccountingTaxDashboardPage.tsx`

Layout (top → bottom):
1. `AccountingPageHeader` with two action buttons (View notices / Filing calendar) → `useNavigate`.
2. **Alert banners** (mb-4): one per `OVERDUE` period (red, `AlertCircle`) and one per `CRITICAL` open notice. Each with right-aligned link.
3. **KPI row** — `grid-cols-2 md:grid-cols-4 gap-4`, uses `AccountingKPICard`:
   - Total filings FY · Overdue (border-destructive when >0) · Due in 30d · Open notices (with critical count).
4. **Country status row** — `grid-cols-2 md:grid-cols-4`, custom card per country (flag emoji, status badge, next filing, notices count, colored `border-l-4`).
5. **Upcoming filings** Card with HTML `<table>`: 8 rows sorted OVERDUE→DUE_SOON→PENDING by `dueDate`. Columns per spec (Entity+flag, Tax type colored badge, Period, Amount, Due date with sub-line, Status badge, Actions ⋯).
   - Actions menu: "Mark as filed" → `AlertDialog` with reference + filed-date inputs → updates local `useState`, sonner success toast.
6. **Notices summary** Card: filtered to OPEN/ESCALATED/RESPONDED. Priority badge (CRITICAL = red + `animate-pulse` dot).

### Page 2 — `AccountingTaxCalendarPage.tsx`

- Header with "+ Add filing" → `toast.info`.
- Filter bar (5 `Select`s: Country, Entity, Tax type, Status, Period) + view toggle (List / Timeline) on right.
- Stat pills strip: Total / Filed / Pending / Overdue / Due soon.
- **List view** (default): grouped by country with `Collapsible` section headers (CA/IN/US/AE), HTML table inside each, rows sorted overdue-first.
- **Timeline view**: simple two-month grid (Nov 2024, Dec 2024) — 7-col day cells, due-date dots colored by status (red/amber/green), `<Tooltip>` on dot showing entity + tax type + amount.
- "Export to CSV" ghost button at bottom — native `Blob` + anchor download from filtered set.

### Page 3 — `AccountingNoticesPage.tsx`

- Header with "+ Add notice" → `toast.info`.
- Red banner if any open `CRITICAL` notice.
- 4 KPI cards (Total / Open / Total demand (mixed-currency string) / Critical with border-destructive).
- Filter bar (Search input + 5 `Select`s).
- HTML table with all 10 columns per spec; CRITICAL pulsing red dot via `animate-pulse`.
- Row click + actions menu → shadcn `Sheet` slide-over (480px) with full notice details, editable notes textarea (local state), and footer buttons: Mark responded / Escalate / Mark resolved (AlertDialog) / Close (AlertDialog). All status changes update local `useState` + sonner toast.

### Cross-cutting

- `TODAY = new Date('2024-11-01')` referenced from `mockTax.ts`.
- 400ms `setTimeout` skeleton on each page mount (`Skeleton` blocks).
- All amounts via `formatCurrency(amount, currency)`.
- HSL semantic tokens only; status colors via Tailwind utility classes already used elsewhere (e.g. `text-destructive`, `bg-amber-50 text-amber-700 dark:bg-amber-500/10 dark:text-amber-400`, green/blue equivalents).
- Tables wrapped in `overflow-x-auto` for mobile.
- React local state only (no Context needed since pages are independent; spec says "Context only (no Zustand)" — local `useState` satisfies this).
- No new npm packages. No CRM files touched.

### Summary
6 file ops: rewrite `mockTax.ts`, add `AccountingTaxDashboardPage.tsx`, replace 2 stubs, edit `App.tsx`, delete 5 orphaned files (listed above).
