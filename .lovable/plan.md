## Goal

Harden the existing finance + upload workflows. Do not redesign or replace any system. All changes are guards, UI safety rails, and consistency fixes layered on top of the current architecture in `ClientInvoicesPanel.tsx`, `paymentVerification.ts`, `paymentProof.ts`, and `SmartUploadZone.tsx`.

---

## A. Confirmation workflow for "Collect" / verification (no more one-click)

Edit `src/components/clients/ClientInvoicesPanel.tsx`.

1. **New `ConfirmPostPaymentDialog`** — small AlertDialog rendered from inside `CollectPaymentDialog.save()`.
   - Shows: invoice number, client, currency, outstanding balance, sum to collect, payment method, payment source, allocation list (`buildLabel(row) — money(payNow)`), reference, optional admin note textarea.
   - Two confirm buttons depending on role + method:
     - Non-accounts user OR proof-required method without admin override → only **"Submit for verification"**.
     - Accounts/admin with admin-override or instant method → **"Confirm payment received"** (verified) AND a secondary **"Submit for verification"** option.
   - Cancel returns to the collect form unchanged.
   - On confirm, runs the existing insert+allocation transaction path (already has rollback). Button shows `Loader2` + is disabled while `saving === true` to debounce double-clicks.

2. **Verify button in `PendingVerificationQueue`** — wrap `verify(p)` in a `ConfirmDialog` (reuse `@/accounting/components/shared/ConfirmDialog`) showing payment summary + optional note field. Note is appended to `appendTimeline` metadata in `verifyPayment`. Add `disabled={busyId === p.id}` (already present) + ignore extra clicks via guard.

3. **Permission gate**: `isAccounts` already drives Verify/Collect visibility. Add explicit gating in the confirm dialog so non-accounts users never see the "Confirm payment received" path — only "Submit for verification".

---

## B. Outstanding / total / status consistency

Edit `ClientInvoicesPanel.tsx`.

1. **Single derivation helper** `computeInvoiceTotals(invoice, verifiedPaymentsForInvoice)`:
   - `total = Number(invoice.amount)`
   - `paid = sum of verified payments only` (not awaiting/rejected)
   - `outstanding = max(total − paid, 0)`
   - `status` derived for display: `cancelled`/`refunded`/`void` pass through; else `paid` when outstanding≤0 and paid>0; `partially_paid` when paid>0; `overdue` when due date < today; else current `status`.
2. **Update list query** to also fetch verified payments per invoice (single `client_invoice_payments` query filtered by `payment_status=eq.verified`) and compute totals client-side from that, instead of relying solely on `invoice.amount_paid`. This makes the list immune to drift.
3. **"Collect" disable**: `disabled = !isAccounts || outstanding <= 0 || ['cancelled','void','refunded','paid'].includes(invoice.status)`.
4. **Header `outstanding`** uses the same helper across all rows.
5. Remove the `STATUS_STYLE` fallback to `""` — explicit map keys covered, otherwise neutral muted style.

---

## C. Due-date safety (no more "Due in NaN days")

1. New helper in same file: `formatDue(dueIso: string | null, nextInstallmentDue?: string | null)`:
   - If both nullish → `"No due date"`.
   - If parsed `Date` is invalid (`isNaN(d.getTime())`) → `"No due date"`.
   - If `nextInstallmentDue` present and main is null → display next installment date.
   - Otherwise show `Due in N days` / `Overdue by N days` / `Due today`.
2. Replace every `r.due_date ?? "—"` and any current "Due in ... days" render with `formatDue(...)`.
3. Audit `CollectPaymentDialog` row "Due" cell and snapshot drawer for the same fix.

---

## D. Receipt / payment discoverability

Augment `InvoiceSnapshotDrawer` (no new system):

1. Already lists payments — extend each row to render:
   - Receipt number (look up from existing receipts table via `receipt_snapshots` if present; otherwise show `—` and a "Generate receipt" link for verified, unused payments).
   - Payer (from `payment.payer_name` if stored, else fallback to client name).
   - Source, method, status badge (VERIFIED / AWAITING VERIFICATION / REJECTED / ADVANCE).
   - Row actions: **View receipt** (opens existing `GenerateReceiptDialog` view mode or signed-URL preview), **Download PDF** (reuse `AccountingReceiptTemplate` + html→pdf path already imported), **Print** (`window.print` on rendered template), **Open snapshot** (already open).
2. **Top-of-card counters** in `ClientInvoicesPanel` header: `Payments: N · Receipts: M · Awaiting verification: K` (computed from already-loaded `rows` + `pending`).
3. **Search bar** above payments table inside snapshot drawer: filters by receipt #, payment ref, reference, method (client-side filter on already-loaded rows). Scope is per invoice — keeps cost zero.

---

## E. Verification safety

1. **Verified-only paid calculation** (already covered in B by computing `paid` from verified payments).
2. **Status badges**: extend the `STATUS_STYLE` map and badge rendering to include `awaiting_verification` and `advance_received` styles. Receipt row badge in snapshot drawer derives from `payment_status` directly.
3. **Awaiting-verification audit**: confirm `appendTimeline` already fires `payment_awaiting_verification`. Add one in `verifyPayment` / `rejectPayment` if the optional note from D is non-empty.

---

## F. Upload validation hard guard

Edit `src/components/documents/SmartUploadZone.tsx` and `src/components/clients/PersonWorkspaceCard.tsx`.

1. **Never auto-set `status = "verified"` on insert** — confirm every document insert path writes `status: "uploaded"` (or `"pending_review"` when classification confidence is low). Search-and-fix any code path that does otherwise.
2. **Classification gate**: in `SmartUploadZone.uploadOne()` the document is already inserted with non-verified status; add:
   - `verification_required: true` flag in metadata if `confidence < 0.6` OR predicted type doesn't match an expected category for the target section.
   - If file is clearly not a document (image without OCR text, classification = `Other` AND `confidence < 0.4`) → status `"pending_review"` + toast warning "Uploaded but flagged for review — not a recognised document".
3. **Verification action** in `PersonWorkspaceCard.setDocStatus` and `SectionBuilderCard` — only path that can set `"verified"`. Add explicit `ConfirmDialog` before promoting to verified.
4. **Timeline events** on every transition: `document_uploaded`, `document_flagged_mismatch`, `document_rejected`, `document_verified` — reuse existing `appendTimeline`.
5. **DB-level guard (optional minor migration)** — add CHECK or trigger on `client_documents.status` to ensure transitions to `verified` always come paired with `verified_by NOT NULL`. Only added if cheap; otherwise enforced at app layer.

---

## Files touched

- `src/components/clients/ClientInvoicesPanel.tsx` — most of A/B/C/D/E.
- `src/accounting/lib/paymentVerification.ts` — accept optional `note` param, log to timeline.
- `src/components/documents/SmartUploadZone.tsx` — F.1–F.2 guards.
- `src/components/clients/PersonWorkspaceCard.tsx` — confirm dialog before verify, timeline events.
- `src/components/clients/SectionBuilderCard.tsx` — same confirm-before-verify guard (only if it currently flips status to verified).
- (Optional) one migration adding a trigger ensuring `verified` requires `verified_by`.

## Out of scope

- No changes to invoice/receipt/payment/allocation schemas or snapshot generation.
- No OCR engine or AI changes.
- No new finance pages, no architectural refactor.
