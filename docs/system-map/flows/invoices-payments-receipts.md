# Flow: Invoices → Payments → Receipts (CRITICAL)

This is the most fragile area in the app. **Do not** modify any step without re-reading this file and `09-safety-rules.md`.

## Entities
- `client_invoices` — header (amount, currency, status, FX rates, snapshot fields, lock flags).
- `client_invoice_installments` — schedule (optional).
- `client_invoice_payments` — each receipt of cash/wire/card/cheque/UPI; `is_refund` flag; `payment_status` (default `verified`).
- `client_invoice_payment_allocations` — split a payment across invoices/installments.
- `client_invoice_receipts` — generated receipt PDFs with immutable snapshot.
- `client_invoice_snapshots` — historical immutable copies of the invoice.
- `client_invoice_reminders` — reminder log + day-lock state on the invoice header.

## Lifecycle

```
DRAFT ──► PENDING_PAYMENT ──► PARTIALLY_PAID ──► PAID ──► (locked)
                       ╲                            │
                        └─────────► CANCELLED       ├─► REFUNDED
                                                    │
                                  RECEIPT GENERATED ┘ (snapshot taken)
```

## UI entry
`src/components/clients/ClientInvoicesPanel.tsx` is the single component for create/edit/pay/receipt across both CRM and (mirrored) accounting views.

### Modal architecture
- Parent `Dialog` = Record Payment form (sibling `AlertDialog` = confirmation, z-[70]).
- Generate Receipt is a separate `Dialog`.
- Confirm-payment `AlertDialog` is rendered as a **sibling** to the parent dialog (not nested) — see safety rules.

## Server-side cascade on payment insert

1. INSERT into `client_invoice_payments` (RLS: `can_edit_client`).
2. AFTER INSERT trigger `fn_log_invoice_payment_timeline` → writes `payment_received` or `refund_processed` row in `client_timeline`.
3. AFTER INSERT/UPDATE/DELETE trigger `fn_recompute_invoice_totals`:
   - Sums verified, non-archived payments (refunds negative).
   - Sets `amount_paid`, `amount_paid_in_{inr,cad,usd}`, `balance_due_in_*`.
   - Sets `status` to `paid` / `partially_paid` / prior status.
   - Sets `paid_at` when first reaching paid.
   - Sets `invoice_locked_for_edit=true` if `immutable_after_paid`.
4. BEFORE UPDATE on the invoice → `fn_take_invoice_snapshot` fires for `draft→sent` and `→paid` transitions, writing `client_invoice_snapshots` + bumping `invoice_snapshot_version`.

## Receipt generation

1. INSERT into `client_invoice_receipts` (number from `generate_receipt_number(entity, branch)` via sequence table `receipt_number_sequences`).
2. BEFORE INSERT `fn_take_receipt_snapshot` captures invoice + payment + firm + branch JSON; stamps `receipt_generated_at/by` on the invoice header.
3. AFTER INSERT `fn_log_invoice_receipt_timeline` writes `receipt_generated` timeline row.
4. Frontend triggers `notifications-dispatch` with event `receipt_generated`.

## Email dispatch

`notifications-dispatch` (edge function) recipients:
- Primary **To**: client email (from `clients.email`).
- **Cc**: assigned counselor (from `profiles` via `clients.assigned_counselor_id`) if `cc_assigned_counselor=true`.
- **Bcc**: `notification_settings.accounting_inbox_email` if `bcc_accounting_inbox=true`.

Uses entity logo from `accounting_entities` (per `firm_entity_id` on receipt) — falls back to `firm_profile` if absent.

Delivery via `smtp-send` (centralised). Both events also log to `client_timeline` as `notification.receipt_generated` / `notification.payment_received`.

## Reminders
`client_invoice_reminders` insert → `fn_log_invoice_reminder_timeline` writes timeline and, for external sent reminders, stamps a 24h day-lock on the invoice (`invoice_reminder_locked_until`).

## Numbering sequences
- Invoices: `invoice_number_sequences(year, entity_code, branch_code)` via `generate_invoice_number` (trigger `fn_assign_invoice_number`).
- Receipts: `receipt_number_sequences(...)` via `generate_receipt_number`.
- Journals: `generate_journal_number` (`JE-YYYY-NNNN`).

## FX
`client_invoices.fx_rate_to_{inr,cad,usd}` snapshotted at issue; payments carry `amount_in_{inr,cad,usd}` derived from invoice FX in `fn_recompute_invoice_totals`.

## Failure modes
- A payment insert that fails RLS will not run triggers — `client_timeline` and totals stay consistent.
- A successful payment insert with a failing trigger (e.g. JSON build error) rolls back the payment.
- Recompute uses **only** verified, non-archived payments — flipping `payment_status` or `archived_at` re-runs totals via UPDATE trigger.
- Snapshot is **idempotent** for receipts (`IF NEW.receipt_snapshot_jsonb IS NOT NULL THEN RETURN NEW`).
- Day-lock on reminders prevents double-sending external reminders within the same day.

## Permission map
| Action | Required | Notes |
|---|---|---|
| Create invoice (draft) | admin/counselor | `accounting_ar_invoices` policy mirror |
| Edit invoice | edit on client + not locked | `invoice_locked_for_edit` blocks |
| Record payment | `can_edit_client` | trigger always recomputes |
| Generate receipt | `can_edit_client` | snapshot always taken |
| View accounting view | `is_accounting_user` | mirror UI |
| Send notification email | any signed-in caller of the panel | dispatcher uses service-role to resolve recipients |