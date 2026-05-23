# Extend Collect Payment for service-level + staged collections

Scope: only `CollectPaymentDialog` (and a thin extension to the existing receipt snapshot) inside `src/components/clients/ClientInvoicesPanel.tsx`. No changes to invoice creation, verification, FX, proof upload, reminders, reconciliation, or receipt template. No new tables.

## What changes

### 1. Service-level breakdown inside Collect Payment
Replace the single "Amount (payCcy)" input with a selectable table of the invoice's line items (from `client_invoices.line_items` JSONB) plus its installments (from `client_invoice_installments`). For each row:

- checkbox to include in this payment event
- service name + category + country + visa/service type (resolved from `service_catalogue` by `service_id`)
- invoice amount for that line/installment
- already paid (sum of prior `client_invoice_payment_allocations` for that `line_item_key` / `service_id` / `installment_id`)
- outstanding (line total − allocated)
- due date (installment due if linked, else invoice due)
- per-row "Pay now" amount (defaults to outstanding, editable)
- **payer** dropdown (optional) — Applicant / Sponsor / Parent / Other; free text when Other
- current status badge: pending / partial / paid / overdue
- **projected status after this payment** — client-side only: shows `Paid` / `Partial · ₹X remaining` / `Remaining ₹Y` based on current paid + per-row "Pay now"

Header chips above the table (auto-populated, editable by accounts/admin): company/entity, branch, assigned counselor, accounts handler.

Mode selector: **Consolidated**, **Individual service**, **Partial**, **Installment** — only adjusts default selection + default per-row amounts; write path is identical.

### 2. Partial + staged
- "Pay now" per row is free-form; sum must be > 0 and ≤ selected outstanding.
- No requirement to pay the full invoice.
- Unselected/under-paid rows stay visible in the panel as pending / partially paid / overdue.

### 3. Different due dates
Each row shows its installment's `installment_due_date`, or invoice `due_date` if none. No global override; existing installment engine continues to drive reminders.

### 4. Live payment summary
Recomputed on every change:
- selected count + selected outstanding
- sum entered + FX rate + converted total in invoice currency
- outstanding after (per row + grand total)
- **remaining unpaid services count** — e.g. `"2 services remain unpaid"`, computed across the whole invoice after projected allocations
- **next due service** — earliest unpaid row by due date after this payment is applied, e.g. `"Next due: Canada Visitor Visa — Jun 15"`
- overpay warning

### 5. Allocation writes (reuse existing tables)
After inserting the `client_invoice_payments` row exactly as today, insert one row per selected line/installment into `client_invoice_payment_allocations`:
- `payment_id`, `invoice_id`
- `line_item_key` (stable hash) and/or `service_id`
- `installment_id` when the row is an installment
- `amount_allocated` (invoice currency, via dialog FX rate)
- `amount_in_inr/cad/usd` mirrored from the payment

No new allocation system, no trigger changes — existing aggregation continues to update `amount_paid` / `status`.

### 6. Allocation labels + ordering (snapshot + timeline)
Each allocation carries:

- **`allocation_label`** — for receipts, exports, accounting review, analytics, refunds.
  - Installment row → `"{service_name} — Installment {n}"`
  - Line-item row → `"{service_name} — {category_or_type}"`
  - Fallback → `service_name`
- **`allocation_order`** — 1-based: installments first by `installment_number`, then line items by their position in `line_items`. Stable across re-renders.

Built client-side; stored inside the receipt snapshot and timeline metadata (no DB column changes).

### 7. Receipt + history
Extend the snapshot in `GenerateReceiptDialog` (around lines 698–740) so `snapshot.payment.allocations` is an array (sorted by `allocation_order`) of:
```
{ allocation_id, allocation_order, line_item_key, service_id, installment_id,
  allocation_label, service_name, country, category, service_type,
  payer, amount_allocated, currency,
  amount_in_inr, amount_in_cad, amount_in_usd, fx_rate }
```
Timeline events (`payment_submitted` / `payment_awaiting_verification`) gain the same `allocations` array. Receipt PDF template change is out of scope; data is preserved immutably.

### 8. Preserved as-is
Payment currency selector, FX conversion, proof upload, verification flow, admin override, multi-currency mirror columns, realtime subscription, reminders, receipt generation, reconciliation, snapshot drawer, `ClientInvoicesPanel` table.

## Files touched
- `src/components/clients/ClientInvoicesPanel.tsx`
  - `CollectPaymentDialog`: service/installment table, mode selector, per-row amount + payer + projected-status chip, header entity/branch/counselor chips, live summary with "N services remain unpaid" + "Next due", allocation insert with labels + order after payment insert, expanded timeline metadata.
  - `GenerateReceiptDialog`: include ordered, labeled allocations (with payer) in `snapshot.payment.allocations`.

## Out of scope
- No schema migrations — `client_invoice_payment_allocations` and `client_invoice_installments` already have the columns we need; `payer`, `allocation_label`, `allocation_order`, and projected-status are computed/stored in snapshot/timeline JSON only.
- No changes to `client_invoices`, verification queue, AR pages, receipt PDF template, or `ClientPaymentsCard`.
- No installment-engine rebuild — read and allocate only.

## Technical notes
- `line_item_key` = deterministic key (`service_id` if present, else `slug(service_name)+index`) for stable allocations.
- "Already paid" per row computed via a single `client_invoice_payment_allocations` query on dialog open, grouped client-side.
- When an invoice has installments, installment rows are shown instead of raw line items to avoid double-counting; otherwise line items are shown.
- Overpayment guard runs against the sum of selected row outstandings, not the whole invoice — enables true partial collection.
- `payer` optional; blank ⇒ omitted from snapshot, rendered as "Applicant".
- Projected status chip + "Next due" + "Remaining unpaid services" are 100% client-side derivations from current paid + per-row "Pay now" values; no DB writes.
