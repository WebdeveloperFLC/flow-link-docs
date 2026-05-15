## Complete AP/AR Module

Finish the remaining AR pages and wire up all routes.

### Files to create (4 new)

1. **`src/accounting/pages/ar/AccountingARPage.tsx`**
   - List view of customer invoices from `mockAR.ts`
   - KPIs: Outstanding, Overdue, Due this week, Collected (TODAY = 2024-11-01)
   - Aging buckets: Current, 1-30, 31-60, 61-90, 90+
   - Filters: entity, category, status
   - Row actions: Mark as paid, Void (shadcn AlertDialog confirm), View detail
   - Pagination: 15/page
   - Empty state via `AccountingEmptyState`
   - Same shape/patterns as `AccountingAPPage.tsx`

2. **`src/accounting/pages/ar/AccountingNewInvoicePage.tsx`**
   - react-hook-form + zod
   - Fields: client (FreeCombobox), entity, category, issue date, due date, line items, tax %, tags
   - Auto-calc subtotal/tax/total, multi-currency via `fmtMoney`
   - Mirror `AccountingNewBillPage.tsx`

3. **`src/accounting/pages/ar/AccountingInvoiceDetailPage.tsx`**
   - Header (status badge, aging banner if overdue)
   - Financial summary, line items table
   - Activity timeline from status transitions
   - Actions: Mark paid, Void (AlertDialog), back link
   - "View client ledger" → `/accounting/clients` if route exists else Sonner toast "Coming soon"
   - Mirror `AccountingBillDetailPage.tsx`

### Files to modify (1)

4. **`src/App.tsx`** — Add 4 routes inside the existing accounting layout:
   ```
   /accounting/ap/new          → AccountingNewBillPage
   /accounting/ap/:id          → AccountingBillDetailPage
   /accounting/ar              → AccountingARPage
   /accounting/ar/new          → AccountingNewInvoicePage
   /accounting/ar/:id          → AccountingInvoiceDetailPage
   ```
   (Plus AP detail/new if not yet routed.)

### Constraints respected
- No CRM files touched
- No previously built accounting files modified (only additive + App.tsx routes)
- Plain HTML tables + Tailwind, no AG Grid
- `AccountingPageHeader` subtitle (no breadcrumbs component)
- shadcn AlertDialog for confirms, Sonner for toasts
- No new npm packages
- TODAY = `new Date('2024-11-01')` for aging
- No auto journal creation; vendor/client ledger = navigate or toast

### Final deliverable
List of all files created (7 total across both turns) and modified (App.tsx).
