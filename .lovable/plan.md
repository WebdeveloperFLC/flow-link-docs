## Goal

Fix the operational gaps surfaced during testing **without rebuilding** any of the existing invoice / payment / receipt / reminder system. Everything below extends existing tables, dialogs, and components. Delivered in **3 phases** so each phase is small, testable, and safe.

## Guardrails (apply to every phase)

- No renames, no deletes, no replacement of existing components or RPCs.
- Continue to read/write `client_invoices`, `client_invoice_payments`, `client_invoice_receipts`, `client_invoice_reminders`, `client_invoice_payment_allocations`, `client_invoice_installments`, `client_invoice_refund_requests`, `client_invoice_adjustments`, `client_documents`, `client_timeline` exactly as today.
- Snapshot fields, allocations, installments, refunds, adjustments, reconciliation, Power BI/ERP shape untouched.
- All new behavior gated by existing role checks (`isAccounts` / `useAccountingAccess`).
- All migrations are **additive** (new nullable columns + check constraints + indexes only) — existing rows keep working.

---

## PHASE 1 — Verification workflow + multi-currency + payment proof + payment source

The most foundational changes, grouped so the data model and the Collect Payment dialog land together.

### 1.1 Additive migration (safe, nullable)

`client_invoice_payments` — add only if missing:

- `payment_status text` — values: `awaiting_verification | verified | rejected | cancelled`. Default `awaiting_verification` on insert when method ∈ (`bank_transfer`, `wire`, `upi`, `cheque`); default `verified` for `cash` and online gateway. Existing rows backfilled to `verified` so nothing regresses.
- `payment_source text` — values: `walk_in | portal | counselor_collection | whatsapp_link | manual | branch_counter | online_gateway`. Nullable; backfill `manual`.
- `verification_notes text` nullable.
- `verification_rejected_reason text` nullable.

Index on `(invoice_id, payment_status)`.

No change to existing columns. No change to `client_invoices.amount_paid` semantics — see 1.4.

### 1.2 Collect Payment dialog — multi-currency

Update `CollectPaymentDialog` (`src/components/clients/ClientInvoicesPanel.tsx`) and `ClientPaymentDialog` (`src/accounting/pages/clients/AccountingClientDetailPage.tsx`):

- **Payment currency** selector (default = invoice currency) with `INR / CAD / USD` plus any extra codes from branch/entity config when present.
- **FX rate** input — auto = 1 when currencies match; otherwise prefilled from a new `getFxRate(from,to)` helper (`src/accounting/lib/fx.ts`, static matrix today, swappable later). Editable for accounts/admin only.
- Display block: invoice currency + total, payment currency + amount, FX rate, converted amount (in invoice ccy), outstanding after conversion.
- Persist: `currency` = payment ccy, `amount` = entered amount, `fx_rate` = rate used, `amount_in_inr/_cad/_usd` filled via the rate.

Existing invoice currency logic untouched.

### 1.3 Payment proof upload (inside same dialog)

- Drag-and-drop + browse + mobile `capture="environment"`.
- Accepts `image/*, application/pdf`.
- Uploaded via existing `supabase.storage` pattern; inserts a `client_documents` row tagged `kind = "payment_proof"`; returned id stored in `payment_proof_file_id`; `payment_proof_status = "uploaded"`.
- For methods `bank_transfer / wire / upi / cheque / card`: block "Post payment" until proof is attached, unless an **Admin override** checkbox (visible only to accounts/admin) is ticked.
- Timeline event `payment_proof_uploaded` inserted on success.

Shared helper: `src/accounting/lib/paymentProof.ts`.

### 1.4 Payment source

- New `Payment source` select in the Collect Payment dialog with the seven values from 1.1.
- Default chosen by context: portal-initiated → `portal`; in-app accounts page → `manual`; quick-action from client header → `counselor_collection`.

### 1.5 "Awaiting verification" flow

- After insert, payments default to `awaiting_verification` for the four methods listed above.
- **`client_invoices.amount_paid` is only incremented when `payment_status` flips to `verified`.** Until then the payment shows in history as "Awaiting verification" and does not reduce outstanding balance.
- Receipt generation is blocked while a payment is `awaiting_verification` or `rejected` (see Phase 2).
- Timeline events: `payment_submitted`, `payment_awaiting_verification`.

---

## PHASE 2 — Verification UI, receipt gating, receipt numbering + snapshot

### 2.1 Verification queue + row actions

- New "Awaiting verification" filter chip on the payments tab (CRM panel + accounting detail page).
- Row action menu per payment (accounts/admin only): **Preview proof · Verify · Reject · Replace proof · Download proof**.
  - Verify → `payment_status = verified`, `verified_by/at` set, invoice `amount_paid` incremented, status recomputed (`PAID / PARTIALLY_PAID`), timeline `payment_verified`.
  - Reject → `payment_status = rejected`, `verification_rejected_reason` captured, timeline `payment_rejected`. Invoice balance untouched.
  - Replace → re-runs proof upload helper, timeline `payment_proof_replaced`.

### 2.2 Receipt generation gating

`GenerateReceiptDialog` only lists payments where `payment_status = 'verified'` AND `is_refund != true`. Other payments shown disabled with reason.

### 2.3 Receipt numbering uses real entity/branch codes

Replace hard-coded `p_entity_code: "FLC", p_branch_code: "GEN"` with codes resolved from `firm_profile` / `branches` for the invoice → produces e.g. `RCP-FLC-IN-AHD-2026-0001`. Falls back to existing defaults if codes missing.

### 2.4 Receipt snapshot

At insert, build `receipt_snapshot_jsonb` with: client, invoice, payment (currency, amount, fx_rate, converted), branch, entity, counselor, posted-by, footer text (legal name, tax #, address, support email/phone, disclaimer). Set `receipt_snapshot_taken_at = now()`. Stored on existing `client_invoice_receipts` columns.

### 2.5 Receipt template improvements

`AccountingReceiptTemplate` renders strictly from snapshot when present (live fallback for legacy receipts). Adds:

- Counselor, Received by / Posted by, Branch rows.
- Multi-currency block: invoice ccy + total, payment ccy + amount, FX rate, converted amount, outstanding.
- Status badge (`PAID / PARTIALLY PAID / REFUNDED`) colored.
- Footer: legal entity, GST/VAT, branch address, support email/phone, disclaimer.
- Bolden totals, emphasize "Amount received".

---

## PHASE 3 — WhatsApp fix, clickable history, snapshot drawer, mobile polish

### 3.1 WhatsApp external open

New helper `src/lib/whatsappShare.ts` exporting `openWhatsApp(phone, message)`:

- Builds `https://wa.me/<phone>?text=...`.
- If running inside the Lovable preview iframe (`window.top !== window.self`), creates a temporary `<a target="_top" rel="noopener noreferrer">` and clicks it, breaking out of the iframe. Otherwise `window.open(url, "_blank", "noopener,noreferrer")`.

Used by `AccountingReceiptModal.handleWhatsApp`, `QuickActionsBar`, and the reminder dialog. Message body generation logic unchanged.

### 3.2 Clickable invoice / payment / receipt rows

- Invoices, Transactions, Receipts tabs (accounting detail) + CRM panel: row click opens a read-only **Snapshot Drawer** showing the frozen invoice/receipt snapshot.
- Per-row action menu: **View Invoice · View Payment · View Receipt · View Timeline · Download PDF**.
- "Download PDF" reuses the existing receipt template print path. Snapshot drawer is strictly read-only, preserving immutability.

### 3.3 UI/UX polish

- Extend `STATUS_STYLE` with `refunded`; show `paid / partially_paid / overdue / refunded` badges everywhere.
- Add `awaiting_verification` and `rejected` badges for payments.
- Dialog wrappers switch to `sm:max-w-lg max-w-[95vw] max-h-[90vh] overflow-y-auto`; proof drop-zone stacks vertically below `sm`.
- Preserve existing realtime subscriptions and `invoice_locked_for_edit` checks.

---

## Files touched

- `src/components/clients/ClientInvoicesPanel.tsx` — collect dialog (P1), verification actions (P2), row clicks/menu (P3).
- `src/accounting/pages/clients/AccountingClientDetailPage.tsx` — same dialog (P1), verification queue (P2), snapshot drawer (P3).
- `src/accounting/components/receipts/AccountingReceiptModal.tsx` — WhatsApp helper (P3).
- `src/accounting/components/receipts/AccountingReceiptTemplate.tsx` — multi-ccy + footer + badge (P2).
- `src/components/clients/QuickActionsBar.tsx` — WhatsApp helper (P3).
- New: `src/accounting/lib/fx.ts`, `src/accounting/lib/paymentProof.ts`, `src/lib/whatsappShare.ts`.
- One additive migration in Phase 1.

## Out of scope

- Any change to `client_invoices` schema, invoice currency logic, allocation engine, installment engine, refund engine, reconciliation, snapshots already in place, Power BI / ERP exports, portal payments table layout.
