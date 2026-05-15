## Goal
Add a fully-featured Petty Cash module inside the existing Accounting module, with branch-wise dashboards, voucher entry + approval, daily cash verification, replenishment workflow, audit/fraud signals, and route + sidebar wiring. All work isolated to `src/accounting/` and `src/App.tsx`.

## File map

### New mock data
- `src/accounting/data/mockPettyCash.ts`
  - 8 India branches with id, name, custodianName, custodianEmail, secondaryApproverName?, openingFloat=10000, currentBalance, lastVerifiedAt, lastVerifiedDelta.
  - `PETTY_CATEGORIES` = flowers, tea, milk, labour, repair, water, transport, snacks, stationery, courier, printing, employee_reimbursement, other.
  - 60+ `PettyCashVoucher` rows distributed across branches & last 45 days. Status mix: APPROVED, PENDING, REIMBURSED, REJECTED. Flags: emergency, missingReceipt, duplicate, roundNumber, recurring. Includes employee reimbursements with `employeeName` + `reimbursementMethod` (cash | bank).
  - 8–10 `PettyCashReplenishment` rows (REQUESTED, APPROVED, REJECTED, PAID).
  - 4–6 `PettyCashVerification` rows with mismatches.
  - Helper selectors: `getBranchSummary(branchId)`, `getCategoryBreakdown()`, `getMonthlyTrend()`, `flagVoucher(v)`.

### New types
- `src/accounting/types/pettyCash.ts` — `PettyBranch`, `PettyCashVoucher`, `PettyCashStatus`, `PettyCategory`, `PettyCashReplenishment`, `PettyCashVerification`, `ApprovalStep`.

### New context (no new packages, React Context only)
- `src/accounting/stores/pettyCashStore.tsx`
  - `PettyCashProvider` + `usePettyCash()` exposing: branches, vouchers, replenishments, verifications, plus actions `addVoucher`, `approveVoucher`, `rejectVoucher`, `markReimbursed`, `submitVerification`, `requestReplenishment`, `approveReplenishment`. State seeded from mock data, in-memory only.
  - Provider mounted once inside the petty-cash route subtree (wraps the 5 pages in `App.tsx`).

### New pages — `src/accounting/pages/petty-cash/`
1. `AccountingPettyCashDashboardPage.tsx` (`/accounting/petty-cash`)
   - KPI strip: total float across branches, spent today, spent MTD, pending approvals, flagged count.
   - Branch grid (cards, responsive 1/2/3 col): opening, spent today, spent MTD, remaining (with progress bar vs ₹10k), pending approvals badge, flagged badge, last updated, "View" + "New voucher" buttons.
   - Branch comparison: simple horizontal bar list (CSS bars, no chart lib).
   - Monthly trend: inline SVG line/area sparkline grouped by month.
   - Category breakdown: stacked horizontal bars with category color tokens.
   - Filters: branch, date range, category. Export buttons (CSV download via Blob, no new pkg).
2. `AccountingPettyCashVoucherPage.tsx` (`/accounting/petty-cash/new`)
   - Form: branch, category, amount, paidTo, paymentType (petty cash | reimbursement), employee + reimbursement method (conditional), date, notes, receipt upload (file input, in-memory), emergency toggle, recurring toggle, linked client (optional combobox over MOCK_CLIENTS), linked counselor (optional). Validation. Sonner toast on save. Approval rule preview: shows badge "Auto-approved / Custodian / Secondary / Finance" based on amount.
3. `AccountingPettyCashDetailPage.tsx` (`/accounting/petty-cash/:id`)
   - Voucher header (status badge, branch, amount, date), receipt panel, approval timeline (created → custodian → secondary → finance), linked journal entry references (formatted Dr/Cr lines per accounting rules in spec), action buttons (approve / reject / mark reimbursed) gated by current step. Flag chips if applicable.
4. `AccountingPettyCashAuditPage.tsx` (`/accounting/petty-cash/audit`)
   - Tabs: Discrepancies, Missing receipts, Flagged vouchers, Flagged branches, Flagged custodians, Approval delays. Each tab: searchable table + branch filter + export.
   - Daily cash verification panel: list of verifications with expected vs actual + "New verification" dialog (branch, physical cash → computes delta, creates discrepancy alert if non-zero).
5. `AccountingPettyCashReplenishmentPage.tsx` (`/accounting/petty-cash/replenishment`)
   - Top: branches with balance < ₹2,500 surfaced as "Suggested replenishment" cards with one-click Request.
   - Table: branch, current balance, requested amount, approved amount, status, requestedBy, approvedBy, dates. Inline approve/reject for finance.
   - "New replenishment" dialog.

### Shared mini-components inside the new folder (kept local to module)
- `BranchCard.tsx`, `KpiTile.tsx`, `ApprovalTimeline.tsx`, `JournalPreview.tsx`, `CashVerificationDialog.tsx`, `CategoryBar.tsx`, `MonthlyTrend.tsx`. Use existing `AccountingPageHeader`, `AccountingStatusBadge`, shadcn `Card/Table/Dialog/Select/Tabs/Badge/Button/Input/Textarea/Switch`.

### Routes — `src/App.tsx` (additive only)
- Import the 5 new pages + `PettyCashProvider`.
- Add 5 new `<Route>` entries under existing accounting block, each wrapped in `<AccountingProtectedRoute>` and `<PettyCashProvider>` so state persists across petty-cash navigation. Order routes so `/audit` and `/replenishment` are listed before `/:id` to avoid param capture.

### Sidebar — `src/components/layout/AppLayout.tsx`
- Add one `accountingNav` entry: `{ to: "/accounting/petty-cash", icon: Wallet, label: "Petty cash" }`. Place it after "Bank accounts" so cash-related items group together. Import `Wallet` from lucide-react. No other changes.

### Fraud Dashboard integration
- Extend `src/accounting/data/mockFraud.ts` only if necessary by appending pre-derived petty-cash flags as additional rows (duplicate bills, round numbers, missing receipts) with a new `source: 'PETTY_CASH'` discriminator + a "View voucher" deep link. If `mockFraud.ts` shape can't be extended without breaking the existing fraud page, instead add a "Petty cash signals" panel to `AccountingFraudPage.tsx` that reads from the petty cash store via `usePettyCash`. Decide based on a quick read of the file at implementation time; default plan = the second option (no edits to existing mock data shapes).

## Behavior details

### Approval rules
Pure function in store:
- amount < 500 → status APPROVED, step "auto"
- 500–2000 → needs custodian
- 2000–5000 → needs secondary approver (falls back to finance if branch has none)
- > 5000 → needs finance

### Accounting journal preview (display-only)
Per spec, render Dr/Cr lines on the detail page. No writes to MOCK_JOURNALS — purely informational rows in a small table.

### Daily cash verification
Dialog computes `expected = openingFloat - sum(approved+reimbursed vouchers since last verification)`. Delta = actual − expected. Non-zero delta surfaces as red alert + creates audit row.

### Replenishment suggestion
Dashboard + replenishment page surface branches where `currentBalance < 2500` as a "Suggested" call-to-action.

### UX
- Sonner toasts for all mutations.
- Skeletons on initial mount (200ms simulated) using existing skeleton component.
- Empty states for each table.
- Mobile: cards collapse to single column; tables become stacked cards under `md`.
- All colors via semantic tokens (`bg-card`, `text-muted-foreground`, `border-border`, `text-destructive`, `bg-primary/10`). Status badges use existing `AccountingStatusBadge`.

## Out of scope
- No CRM page edits.
- No new npm packages.
- No edits to `src/integrations/*`, mock data shapes outside the petty-cash files (fraud integration via store read), or existing accounting pages other than (optionally) the Fraud page panel insertion.
- No backend / Supabase changes.

## Deliverable at end
File list of created/modified files and a short note that the Petty Cash sidebar entry is live at `/accounting/petty-cash`.
