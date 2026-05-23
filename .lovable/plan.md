## Fix payment entry & tab clicks on client ledger

**Problems observed**
1. On `/accounting/clients/:id`, the Invoices grid shows columns up to Status, but the **Actions** column (with "Add payment") is off-screen on the 1318px viewport — there is no visible way to record a payment.
2. The DRAFT invoice in the screenshot still has outstanding ₹48,380 but Add payment is hidden behind horizontal scroll AND gated on status. Users expect to pay against any non-void invoice with a balance.
3. Tabs (Transactions / Invoices / Receipts / …) appear unclickable — likely because the AG Grid container sits above with a row covering the tab strip after re-render, or the tabs are inside a Card that absorbs clicks.

**Changes (UI only, no schema)**

1. **`AccountingClientDetailPage.tsx`**
   - Move the **Add payment** action out of the grid's Actions column and into a **toolbar above the Invoices tab content** (a single "Record payment" button that opens a picker of outstanding invoices) AND keep an inline icon button on each row.
   - Pin the Actions column (`pinned: "right"`, width 220, `lockPinned`) so it's always visible regardless of horizontal scroll.
   - Drop the `status !== "VOID"` gate's hidden-DRAFT side effect — show Add payment whenever `outstandingBalance > 0 && status !== "VOID"` (DRAFT already qualifies; just confirm column visible).
   - Add a top-level **"Record payment"** button next to "New invoice" in the page header that opens the same `ClientPaymentDialog` with an invoice selector (lists all invoices where outstanding > 0).

2. **Tabs clickability**
   - Wrap each TabsContent grid in a `Card` with `overflow-hidden` but ensure the AG Grid has a bounded `height` (already 420) and the `TabsList` is rendered outside any element with `pointer-events-none`. Add `relative z-10` to `TabsList` so it always sits above the grid card.
   - Verify no parent has `pointer-events: none` from the Aging card or service panel.

3. **Empty-state nudges**
   - When `invs.length > 0` but no Actions visible, show a helper line under the tab: "Use Record payment to post against an outstanding invoice."

**Out of scope**
- No DB schema changes; reuses existing `arInvoicesStore.updateArInvoice` and the existing `ClientPaymentDialog`.
- No changes to CRM `ClientInvoicesPanel` or migrations.

**Files to edit**
- `src/accounting/pages/clients/AccountingClientDetailPage.tsx`
