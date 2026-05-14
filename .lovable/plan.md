
# Phase 6 — Owner Profiles & Wealth

Strictly additive. Replace the 3 existing accounting owner stubs and add supporting files. No new packages. No CRM, journal, document, approval, or router changes. No backend.

## Files Touched (5 total)

1. `src/accounting/types/owners.ts` — **new** — type definitions
2. `src/accounting/data/mockOwners.ts` — **new** — owner profiles + financial accounts mock
3. `src/accounting/components/shared/AccountOwnerSelect.tsx` — **new** — reusable grouped selector (built but not wired into journals)
4. `src/accounting/pages/owners/AccountingOwnersPage.tsx` — replace stub (list + tabs + add/edit modal)
5. `src/accounting/pages/owners/AccountingOwnerDetailPage.tsx` — replace stub (detail + accounts tabs + add/edit account modal)
6. `src/accounting/pages/owners/AccountingWealthPage.tsx` — replace stub (wealth dashboard)

Routes `/accounting/owners`, `/accounting/owners/:id`, `/accounting/owners/wealth-summary` are already wired in `App.tsx` from Phase 2 — no router changes.

## Types (`accounting/types/owners.ts`)

Per spec exactly: `OwnerCategory`, `BusinessOwnerType`, `PersonalOwnerType`, `AccountType` (full enum list), `OwnerProfile`, `FinancialAccount`. Stored at `accounting/types/` instead of `src/types/` to keep accounting code colocated, matching the project's established pattern.

## Mock Data (`accounting/data/mockOwners.ts`)

Exports `MOCK_OWNERS` (10 profiles) and `MOCK_FINANCIAL_ACCOUNTS` (~25 accounts), all per spec:
- 4 business owners (Future Link Canada/USA/India + Future Link Academy brand). Canada/USA linked to existing entity ids from `accountingEntityStore`.
- 6 personal/HUF/Trust/NRI (Sharma family).
- ~25 accounts: business banking, personal savings, FDs, LIC policies, demat, loans, HUF, NRE/NRO. Realistic balances, IFSC, policy numbers, premium/EMI fields, maturity dates ranging across the next 90+ days so the wealth-page upcoming events list has hits.
- Helpers: `getOwnerById`, `getAccountsForOwner`, `categoryOf(accountType)` (returns ASSET/LIABILITY/INVESTMENT/INSURANCE), grouping helper used by selector & detail page, `formatMaskedAccount`.

## Page 1 — Owners List (`AccountingOwnersPage.tsx`)

`AppLayout` + `AccountingPageHeader` (title "Owner profiles", subtitle per spec, action "+ Add owner profile" → opens modal).

- **Tabs** (shadcn `Tabs`): All / Business / Personal / Family office.
- **Filter bar**: search Input (name/PAN/brand), Country select (All/CA/US/IN), Category select, Active-only toggle (`Switch`).
- **Grid**: `grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4`. Each card:
  - Top: avatar circle (initials, deterministic color from id hash), name, type pill (color map per spec — blue for corporate types, gray for brand, purple for personal/HUF/trust/NRI; raw Tailwind utilities consistent with Phase 3/4).
  - Middle: country flag emoji + country, masked PAN/GST/EIN, relationship label, "Linked to: …" for brand types.
  - Bottom: account count, total assets per currency (e.g. `₹28.4L · CAD 245K` — own helper formats INR in lakhs/crore), total liabilities, "View accounts →" link.
  - `DropdownMenu`: Edit profile, Add account, View all accounts, Deactivate (toast only).
- **Add/Edit modal** (shadcn `Dialog`, two-step):
  - Step 1: 2×2 grid of large option cards (Business / Individual / HUF / Trust) using lucide icons.
  - Step 2: dynamic form per type per spec (business fields, individual fields including NRI link, HUF members repeatable list, Trust trustees/beneficiaries). Conditional country-specific fields (PAN/GST/EIN/SIN/Aadhar last-4). Tags input (comma-split chips). Notes textarea. Save → local `useState` array update, sonner toast, close modal.

## Page 2 — Owner Detail (`AccountingOwnerDetailPage.tsx`)

Reads `:id` via `useParams`; missing → `AccountingEmptyState` + back link.

- **Sticky header**: large avatar (48px), name, type badge, Edit button (opens edit modal — reuses Step 2 form from page 1, extracted to a shared in-file component).
- **4 KPI cards** (`AccountingKPICard`): Total accounts, Total assets, Total liabilities, Net worth (color via prop based on sign).
- **Tabs**: Accounts / Documents / Notes / Activity.
- **Accounts tab**: 4 collapsible sections (`Collapsible` shadcn) — Bank accounts, Investments, Insurance policies, Loans & liabilities. Mapping from `AccountType` → section is centralised. Each section ends with `+ Add account` button.
  - Account row: institution-letter square (deterministic color), nickname + institution, type pill, status pill, masked acct #, right-aligned balance (green for asset, red with `-` for liability). Conditional metadata row per type (FD: maturity + rate; insurance: sum assured + next premium + amount; loan: EMI + outstanding). Action menu: Edit · View transactions (toast) · Link document (toast).
  - Account icons per spec mapped from lucide-react: Landmark, Clock, TrendingUp, PieChart, Shield, Heart, CreditCard, Banknote, Star, Home.
- **Documents tab**: Filtered list of `MOCK_DOCUMENTS` whose `linkedVendor` matches owner brand or relationship — falls back to empty state with upload button (toast, no real upload).
- **Notes tab**: editable textarea bound to local state, "+ Add note" appends entry with timestamp (in-memory).
- **Activity tab**: derived synthetic timeline (Profile created, accounts added, last edit) using `formatDate`.
- **Add/Edit account modal** (two-step):
  - Step 1: 5 category cards (Bank/Savings, Investment, Insurance/Policy, Loan/Liability, Cash/Other).
  - Step 2: dynamic form per category exactly per spec (FD auto-calc maturity = start + tenure, insurance auto-calc next premium from frequency, loan EMI fields). All saves are `useState` updates with toast.

## Page 3 — Wealth Summary (`AccountingWealthPage.tsx`)

`AppLayout` + header (title "Wealth & investment summary").

- **Toolbar**: owner multi-select (shadcn `Popover` with checkbox list), display-currency select (INR/CAD/USD; converts via inline `MOCK_FX = { INR:1, CAD:62, USD:84 }` — values normalize to display currency), as-of date input.
- **4 KPI cards**: Total assets, Total liabilities, Net worth (large, green if positive), Liquid assets (bank+cash only).
- **Asset breakdown**: SVG donut (no chart lib — simple circle stroke segments computed from totals) + legend list with %, value per segment (Bank deposits / Investments / Insurance / Real estate / Other).
- **Liabilities breakdown**: simple horizontal stacked bar + legend (Home / Vehicle / Personal / Credit cards) + total monthly EMI.
- **Upcoming events table** (next 90 days): unions premium-due, FD/RD maturity, monthly EMI projections; sorted by date; columns Date / Owner / Account / Event type (colored badge: amber premium, green maturity, blue EMI) / Amount / Action (Mark paid → toast; View account → navigates to detail page).
- **Insurance policies quick view**: card list with sum assured, premium+frequency, next due date colored (red <30d, amber <60d), Mark paid button (toast).
- **Investment portfolio summary**: total portfolio value, simple per-owner stacked bar (CSS divs, percentages of total), holdings table from accounts whose `remarks` parse as holdings (skip empty).

## Reusable Component (`AccountOwnerSelect.tsx`)

Shadcn `Select` with `SelectGroup`/`SelectLabel` per owner. Props: `value`, `onChange`, `accounts?`, `owners?` (defaults to mock). Renders grouped options exactly per spec: `RBC Business Chequing (CAD ••••4521)`. Built only — not wired into journal pages.

## Shared In-File Patterns

- Avatar color: hash of id → pick from a fixed 10-color palette of muted Tailwind classes (`bg-blue-100 text-blue-700` etc.).
- INR formatting: small helper `formatINR(n)` produces `₹X.YL` (lakhs) and `₹X.YCr` (crore) above thresholds; falls back to `formatCurrency` from `accounting/lib/format` for CAD/USD.
- All state lives in `useState` per page. No persistence, no API calls.

## Reused Primitives

`AppLayout`, `AccountingPageHeader`, `AccountingEmptyState`, `AccountingKPICard`, shadcn `Card*`, `Button`, `Input`, `Select*`, `Switch`, `Tabs`, `Dialog`, `DropdownMenu`, `Collapsible`, `Badge`, `Popover`, `Checkbox`, `Textarea`, `Label`, sonner. lucide-react icons only.

## Verification After Build

1. `/accounting/owners`: 10 cards visible, tabs filter correctly, search filters by name/PAN, country filter works. Add modal both steps render and save creates a new card.
2. `/accounting/owners/:id` (e.g. Rajesh Sharma): KPI numbers reconcile to the mock account totals; sections show correct accounts; account add modal saves into local state.
3. `/accounting/owners/wealth-summary`: donut + bars reflect totals; currency switcher reformats numbers; upcoming-events table shows events ordered by date.
4. `AccountOwnerSelect` rendered in a small sandbox check — not wired into journals.
5. No edits outside the 6 files listed; no new dependencies.
