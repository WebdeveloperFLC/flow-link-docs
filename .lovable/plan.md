# Extend Invoice + Payment Collection — End-to-End (Final v3)

Extend `client_invoices` and add supporting tables; add the missing CRM toolbar so payment can actually be collected. Everything additive — no rebuild, no rename, no duplicate of `accounting_ar_invoices`. Reuses `client_access` / `can_view_client` / `can_edit_client` / `has_role` / `is_accounting_user` for permissions, `client_timeline` / `client_emails` / `client_notifications` / `client_tasks` for side-effects, `credit_wallet` / `point_redemptions` / `client_offers` for money mechanics, `firm_profile` / `branches` / `departments` for entity, `case_people` / `client_family_members` for payer attribution.

---

## 1. `client_invoices` — additive columns

```
branch_id, department_id, firm_entity_id,
assigned_counselor_id, assigned_accounts_user_id,
invoice_category, invoice_stage,
invoice_locked, invoice_locked_by, invoice_locked_at,
invoice_sent_at, invoice_viewed_at,
invoice_reminder_last_sent_at, invoice_reminder_locked_until,
payment_posted_by, receipt_generated_by, receipt_generated_at,
fx_snapshot_date, fx_rate_to_inr/cad/usd, fx_provider, fx_manual_override, fx_locked,
subtotal_in_inr/cad/usd,
amount_paid, amount_paid_in_inr/cad/usd,
balance_due_in_inr/cad/usd,
foreign_payment_due_currency, foreign_payment_due_amount, foreign_payment_status,
reminder_lock_status, external_request_sent_today,
payment_processing_lock, payment_processing_lock_by, payment_processing_lock_at,
receipt_prefix, receipt_sequence,
followed_up_by, collected_by, converted_by,

-- numbering
invoice_prefix, invoice_sequence, invoice_year,
invoice_branch_code, invoice_entity_code, invoice_number_generated,

-- allocation / installments cache
payment_allocations jsonb DEFAULT '[]',
due_schedule jsonb DEFAULT '[]',

-- escalation
escalation_level int DEFAULT 0, escalation_locked boolean DEFAULT false,

-- soft delete
archived_at, archived_by,

-- reconciliation
bank_reconciled, bank_reconciled_by, bank_reconciled_at, bank_reconciliation_ref,

-- NEW v3: immutability + snapshot
immutable_after_paid boolean DEFAULT true,
invoice_locked_for_edit boolean DEFAULT false,   -- flipped true on full paid
invoice_snapshot_jsonb jsonb,                    -- frozen at first 'sent' + at 'paid'
invoice_snapshot_taken_at timestamptz,
invoice_snapshot_version int DEFAULT 0
```

Replace `status` CHECK with: `draft, sent, viewed, pending_payment, partially_paid, paid, overdue, cancelled, refunded`.

### Numbering
`invoice_number_sequences(year, entity_code, branch_code, last_number)` + `generate_invoice_number(entity, branch)` → `FLC-<ENTITY>-<BRANCH>-<YYYY>-<SEQ4>`. Same pattern for `receipt_number_sequences` + `generate_receipt_number`. Mirrors existing `lead_number_sequences` / `generate_lead_number`.

---

## 2. New tables (all soft-delete via `archived_at`; RLS via `can_view_client`/`can_edit_client`; posting / receipt / refund-approve / adjustments-approve gated to accounts/admin)

### 2a. `client_invoice_payments`
`id, invoice_id, client_id, paid_at, method, currency, amount, amount_in_inr/cad/usd, fx_rate, reference, notes, posted_by, is_refund, payer_person_id, payer_type, payment_proof_file_id, payment_proof_status, verified_by, verified_at, split_group_id, archived_at, archived_by, bank_reconciled, bank_reconciled_by, bank_reconciled_at, bank_reconciliation_ref, refund_request_id`

### 2b. `client_invoice_payment_allocations`  (allocation layer)
`id, payment_id, invoice_id, line_item_key, service_id, installment_id, amount_allocated, amount_in_inr/cad/usd, allocated_at, allocated_by`

### 2c. `client_invoice_installments`  (due schedule)
`id, invoice_id, installment_number, installment_label, installment_due_date, installment_amount, currency, amount_in_inr/cad/usd, installment_status (pending|partially_paid|paid|waived|overdue), paid_amount, paid_at, fee_category, archived_at`

### 2d. `client_invoice_receipts`
`id, invoice_id, payment_id, receipt_number unique, receipt_prefix, receipt_sequence, firm_entity_id, branch_id, currency, amount, generated_by, generated_at, pdf_path, receipt_voided, receipt_voided_by, receipt_voided_at, receipt_void_reason, archived_at, archived_by, receipt_snapshot_jsonb, receipt_snapshot_taken_at`

### 2e. `client_invoice_reminders`
`id, invoice_id, client_id, channel, reminder_status, scheduled_for, sent_at, created_by, reminder_created_by, locked_by, locked_until, is_external, escalation_level`. Partial unique index `(invoice_id, (sent_at::date)) WHERE is_external AND reminder_status='sent'`.

### 2f. `client_invoice_refund_requests`
`id, invoice_id, payment_id, amount, currency, refund_reason, refund_requested_by, requested_at, refund_status (requested|approved|rejected|processed), refund_approved_by, approved_at, refund_processed_by, refund_processed_at, processor_reference, archived_at`. Processing inserts a `client_invoice_payments` row with `is_refund=true`.

### 2g. `client_invoice_adjustments`  (**NEW v3** — never edit a posted invoice directly)
`id, invoice_id, adjustment_type (discount_correction | waiver | goodwill | penalty | fx_adjustment | write_off | other), reason, amount, currency, amount_in_inr/cad/usd, target_line_item_key, target_installment_id, requested_by, requested_at, status (requested|approved|rejected|applied|reversed), approved_by, approved_at, applied_by, applied_at, reversed_by, reversed_at, archived_at`

Applying an adjustment writes a derived effect (changes `balance_due_*` via trigger, optionally creates a paired refund payment for write-offs) **without mutating the frozen invoice snapshot**. Timeline event `invoice_adjustment_applied`.

Permissions: anyone with `can_edit_client` can `request`; only accounts/admin can `approve`/`apply`/`reverse`.

---

## 3. Snapshot + immutability (**NEW v3 — critical for historical accuracy**)

### When snapshots are taken (write-once per version, append-only)
- **On first `sent`** — `invoice_snapshot_jsonb` v1 = full header + line_items + installments + offers + FX rates + entity/branch context.
- **On full `paid`** — v2, plus payment allocations roll-up.
- **On every receipt insert** — `receipt_snapshot_jsonb` = invoice snapshot + payment + entity branding + receipt number/prefix/sequence + FX used. This is what the PDF renders from forever.
- **On every approved adjustment** — new snapshot version (bumps `invoice_snapshot_version`); previous versions retained in `client_invoice_snapshots` history table:
  `client_invoice_snapshots(id, invoice_id, version, snapshot_jsonb, reason, created_by, created_at)`.

### Immutability rules (enforced in trigger `fn_enforce_invoice_immutability`)
- If `status = 'paid'` AND `immutable_after_paid = true`: block UPDATE on `line_items`, `due_schedule`, `fx_rate_*`, `amount`, `currency`, `firm_entity_id`, `branch_id`. Only `archived_at`, `bank_reconciled*`, and adjustment-derived cache fields (`payment_allocations`, `balance_due_*`) may change.
- Same lockout on `client_invoice_installments` once their parent invoice is paid.
- Any post-paid change must go through `client_invoice_adjustments` (approved + applied).
- `invoice_locked_for_edit` flag flips true on full-paid and is the cheap UI check.
- Receipts are never updated except for the void columns; voiding creates a timeline event but the `receipt_snapshot_jsonb` stays intact (legal record).

### Why this matters
Future changes to `service_catalogue` pricing, FX rates, or line items can NEVER retroactively alter posted invoices/receipts — every historical financial record renders from its frozen snapshot.

---

## 4. Payment aging + escalation
View `client_invoice_aging` → `days_overdue, aging_bucket (current|0-7|8-15|16-30|30+)`. Daily edge function `process-invoice-escalations` (pg_cron):
- `>= 8-15` days & `escalation_level < 1` → notify counselor + branch manager (`client_tasks` + `client_notifications`), set `escalation_level=1`.
- `>= 30+` days & `escalation_level < 2` → `escalation_locked=true`, `payment_processing_lock=true`, status → `overdue`. Downstream stage transitions must check `escalation_locked`.
Config in `invoice_escalation_rules`.

---

## 5. Soft delete & reconciliation
No DELETE policies. All financial tables use `archived_at` + `archived_by`. CRM/portal queries default to `archived_at IS NULL`. Bank reconciliation columns on `client_invoice_payments` + header roll-up + accounts-only `ReconcilePaymentDialog`. View `client_invoice_unreconciled_payments` for the worklist.

---

## 6. Auto-draft RPC
`create_invoice_from_services(p_client_id, p_service_ids[], p_branch_id, p_firm_entity_id, p_installments jsonb default null)` → builds draft, copies services + offers, FX snapshot, inserts installments, timeline `invoice_drafted`. Callable from client workspace / counselor / accounts / service-selection flows.

---

## 7. CRM UI — `ClientPaymentsCard.tsx`

Keep `accounting_ar_invoices` block. Add new `client_invoices` section with toolbar:

- **Create Invoice** (any `can_edit_client`)
- **Send Reminder** (disabled with "Already sent today by X" tooltip when locked)
- **Collect Payment** (visible to all; submit gated to accounts/admin)
- **Generate Receipt** (accounts/admin)
- **Void Receipt** (accounts/admin, reason required)
- **Request Refund** / **Approve Refund** / **Process Refund**
- **Request Adjustment** / **Approve Adjustment** / **Apply Adjustment**  *(NEW)*
- **Reconcile** (accounts/admin)
- **Download Invoice** / **Download Receipt** — renders from frozen snapshot
- **View Snapshot History**  *(NEW — accounts/admin)*
- **Archive** (admin)

Dialogs:
- `CreateInvoiceDialog`, `CollectPaymentDialog` (with allocation editor + payer + proof + wallet/points + split), `GenerateReceiptDialog`, `VoidReceiptDialog`, `RefundRequestDialog`, `RefundApprovalQueue`, `AdjustmentRequestDialog`, `AdjustmentApprovalQueue`, `ReconcilePaymentDialog`, `SendReminderMenu`, `SnapshotHistoryDrawer`.

Aging badge + escalation banner ("Manager notified · processing locked") + "Locked – paid" badge once `invoice_locked_for_edit=true`.

---

## 8. Portal compatibility
`/portal/payments` keeps reading `client_invoices` + `credit_wallet` (additive only). Adds installment progress, payment history, receipt download. Receipts render from `receipt_snapshot_jsonb`.

---

## 9. Timeline events
`invoice_drafted, invoice_updated, invoice_sent, invoice_snapshot_taken, reminder_scheduled, reminder_sent, payment_received, payment_posted, allocation_updated, receipt_generated, receipt_voided, refund_requested, refund_approved, refund_processed, invoice_adjustment_requested, invoice_adjustment_approved, invoice_adjustment_applied, invoice_adjustment_reversed, invoice_closed, invoice_locked_for_edit, invoice_archived, payment_request_locked, duplicate_request_blocked, payment_request_escalated, processing_stage_locked, payment_reconciled`.

---

## 10. Out of scope
- `accounting_ar_invoices` ledger pages untouched.
- No new permission system; reuse `has_role` / `client_access` / `is_accounting_user`.
- No table renames or destructive drops.
- ERP sync remains a future additive layer.

---

## Execution order
1. Migration: extend `client_invoices`, create 8 new tables (`payments, allocations, installments, receipts, reminders, refund_requests, adjustments, snapshots`), 2 sequence tables, aging view, escalation config, immutability + snapshot triggers, number generators, RLS, timeline triggers.
2. Edge function `process-invoice-escalations` + daily pg_cron.
3. RPC `create_invoice_from_services` + RPC `apply_invoice_adjustment` (snapshot bump).
4. Build the CRM toolbar + dialogs in `ClientPaymentsCard.tsx`.
5. Portal additive updates + receipt PDF renderer pointed at `receipt_snapshot_jsonb`.

Outcome: working **Collect Payment** flow with numbering, allocations, installments, refunds-with-approval, adjustments-with-approval, void receipt, aging, escalation, archive, bank reconciliation, and **frozen historical snapshots** so future price/FX/line-item edits can never corrupt past invoices or receipts.
