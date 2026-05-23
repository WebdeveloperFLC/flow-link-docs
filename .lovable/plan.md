## Goal

Extend Phase 1–3 work into the rest of the accounting surface. **No rebuilds, no schema changes.** All new behavior reuses existing tables: `client_invoices`, `client_invoice_payments`, `client_invoice_receipts`, `client_timeline`. Delivered in 2 small phases.

---

## PHASE 4 — Live DB on accounting pages + receipt reprint + timeline

### 4.1 Wire accounting client detail page to live DB

`src/accounting/pages/clients/AccountingClientDetailPage.tsx` currently reads `mockAR` for Transactions / Invoices / Receipts tabs. Switch to live data, keeping the AG-Grid layout and column defs intact.

- Add a `useLiveClientLedger(clientId)` hook (new file `src/accounting/hooks/useLiveClientLedger.ts`) that fetches:
  - `client_invoices` for this client (real + linked CRM id)
  - `client_invoice_payments` for this client
  - `client_invoice_receipts` joined to those invoices
- Build `invs`, `recs`, `txns`, `totals`, `aging` from those rows (same shape currently produced from mock).
- Each AG-Grid row gets `onRowClicked` → opens the same **InvoiceSnapshotDrawer** already built in `ClientInvoicesPanel`. Extract that drawer into a shared module: `src/components/clients/InvoiceSnapshotDrawer.tsx`, then re-export from the panel.
- Mock fallback retained only when no live rows exist (so demo clients still look populated).

### 4.2 Receipt reprint from snapshot

In `InvoiceSnapshotDrawer`, each receipt row gets a **Download PDF** button.

- Click → render `AccountingReceiptTemplate` into a hidden div from `receipt_snapshot_jsonb`, then `window.print()` (same pattern `AccountingReceiptModal.printReceipt` already uses).
- New mapper `snapshotToReceiptData(snapshot)` in `src/accounting/lib/receiptHelpers.ts` converts the stored snapshot into the existing `ReceiptData` interface — no template changes required.
- Legacy receipts without a snapshot show "Snapshot unavailable" (button disabled with tooltip).

### 4.3 Timeline events

Add `appendTimeline(...)` calls (function already exists in `src/lib/timeline.ts`) at these write-points in `ClientInvoicesPanel.tsx`:

- After `client_invoice_payments` insert → `payment_submitted` (or `payment_awaiting_verification` when status is awaiting).
- After proof upload → `payment_proof_uploaded`.
- After verify update → `payment_verified`.
- After reject update → `payment_rejected` (with reason in metadata).
- After receipt insert → `receipt_generated` (receipt # in metadata).

All summaries plain-English. Metadata holds payment_id / receipt_number / amount / currency. Failures are non-blocking (wrapped in try/catch and toasted lightly so a timeline write never fails the user action).

---

## PHASE 5 — Global verification queue + payment-source analytics

### 5.1 Global Verification Queue page

New route + page:

- Route: `/accounting/ar/verification` registered in `src/App.tsx` (same role gate as other accounting AR pages).
- Page: `src/accounting/pages/ar/AccountingVerificationQueuePage.tsx`.
- Lists every `client_invoice_payments` row where `payment_status = 'awaiting_verification'` across all clients, joined to invoice + client name. Filter chips: Method, Source, Date range. Same Verify / Reject / View proof actions as the per-client queue (reuse the action helpers — pull `verify`/`reject` out of `PendingVerificationQueue` into `src/accounting/lib/paymentVerification.ts`).
- Realtime subscription on `client_invoice_payments` so newly submitted items appear without refresh.
- Nav entry added to the AR sidebar section.

### 5.2 Payment source analytics tile

On `src/accounting/pages/AccountingOverviewPage.tsx`, add a small **Payments by source** card:

- Single query: `client_invoice_payments` where `payment_status='verified'`, grouped client-side by `payment_source`, summed by `amount_in_inr` (fallback to `amount`).
- Renders a compact table: source · count · total. Optional sparkline omitted to keep scope tight.
- Honors the existing entity scope hook (`useEntityScope`) if present so multi-firm setups stay filtered.

---

## Guardrails

- No schema changes. No DB migrations.
- No edits to invoice numbering, allocation, refund, reconciliation, snapshot-jsonb shape, RLS.
- Mock data path preserved as fallback for demo clients on the accounting detail page.
- All new write paths gated by `useAccountingAccess` / `isAccounts` checks.
- Timeline writes are best-effort; never block UX.

## Files touched

- New: `src/accounting/hooks/useLiveClientLedger.ts`, `src/components/clients/InvoiceSnapshotDrawer.tsx`, `src/accounting/lib/paymentVerification.ts`, `src/accounting/pages/ar/AccountingVerificationQueuePage.tsx`.
- Edited: `src/accounting/pages/clients/AccountingClientDetailPage.tsx`, `src/components/clients/ClientInvoicesPanel.tsx` (timeline writes + drawer extraction + shared helpers), `src/accounting/lib/receiptHelpers.ts` (snapshot→ReceiptData mapper), `src/accounting/pages/AccountingOverviewPage.tsx`, `src/App.tsx` (route), accounting sidebar nav file.

## Out of scope

- Email/PDF delivery of receipts (still print-based).
- Reminder system changes.
- Portal-side payment changes.
- Power BI / ERP export shape.
