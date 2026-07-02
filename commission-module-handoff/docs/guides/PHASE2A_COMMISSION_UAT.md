# Phase 2A — Commission Receipt & Allocation UAT

**Status:** Official UAT script — run after Lovable publish + migration apply  
**Scope:** Receipt lifecycle, allocation, short-pay, FX review, attachments, immutability  
**Out of scope:** Accounting journals (Phase 2C)

---

## Preconditions

- Commission admin or Accounting user logged in
- Institution with at least one submitted invoice and eligible students
- Phase 2A migrations applied (`20260801120000` – `20260801120200`)

---

## Scenarios

| ID | Scenario | Steps | Expected |
|----|----------|-------|----------|
| **2A-1** | Create draft receipt | Institution → Receipts → New receipt. Enter amount, currency, date. Save draft & exit. | Receipt appears in list as `draft`. Payer fields populated (`payer_type=institution`, `payer_id`, `payer_name_snapshot`). |
| **2A-2** | Invoice allocation | Resume draft → Invoices step. Allocate full receipt to one invoice. Next. | `amount_allocated` matches receipt; `unallocated_amount = 0`. |
| **2A-3** | Student allocation | Students step. Allocate slice to each student (sum = invoice slice). Review → Post. | Receipt `posted`. Invoice `amount_received` updated. Students `payment_status` updated. |
| **2A-4** | Short-pay | Invoice total $3,500. Record receipt $3,200, allocate fully, post. | Invoice `partially_paid`, `short_paid=true`, outstanding $300. Receipt fully allocated ($0 unallocated). |
| **2A-5** | Cross-currency draft | Receipt USD, invoice CAD. Save draft + allocate in draft. | Receipt saved. `fx_review_status=pending`. Ready/Post blocked until FX approved. |
| **2A-6** | FX approve then post | Approve FX on review step. Mark ready or Post. | `fx_review_status=approved`. Post succeeds. |
| **2A-7** | Payment advice attachment | Upload PDF as payment advice on Review step (draft). | Row in `upi_commission_receipt_attachments`; file in `upi-commission-receipts` bucket. |
| **2A-8** | Remittance attachment | Upload remittance document. | Type `remittance` stored. |
| **2A-9** | Wire confirmation | Upload wire confirmation. | Type `wire_confirmation` stored. |
| **2A-10** | Supporting document | Upload misc supporting doc. | Type `supporting` stored. |
| **2A-11** | Claims → Record receipt | Claims tab → open invoice → **Record receipt**. | Navigates to Receipts; wizard opens with invoice pre-filled. |
| **2A-12** | Ready without post | Complete allocations → Mark ready (no post). | Status `ready`; no ledger change on invoice/student totals. |
| **2A-13** | Reopen ready | Reopen ready receipt to draft. Edit allocation. | Status returns to `draft`; edits allowed. |
| **2A-14** | Draft resume | Start wizard, save at Invoices step, exit. Resume from Receipts list. | Wizard opens at saved step (`metadata.wizard_step`). Data intact. |
| **2A-15** | Void draft | Void draft receipt. | Status `voided`; no ledger impact. |
| **2A-16** | Void posted | Void posted receipt with reason. | Status `voided`; invoice/student amounts reversed. |
| **2A-17** | Snapshot guard | Post receipt where student snapshot_id mismatches current student snapshot. | Post rejected with snapshot mismatch error. |
| **2A-18** | No journal in 2A | Post any receipt. Inspect receipt row. | `accounting_journal_id` remains NULL. |
| **2A-19** | Unallocated draft OK | Draft receipt $1,000, allocate $600 only. Save draft. | Allowed — `unallocated_amount=400`. |
| **2A-20** | **Posted immutable** | Post a receipt. Attempt to edit amount, allocations, or attachments via UI or direct update. | Edit blocked (trigger/RPC error). Only **Void** and **recreate** allowed. |

---

## Pass criteria

- All 20 scenarios pass
- No regression on Phase 1 lifecycle (eligibility, holds, transfers)
- Counselor commission view unchanged for non-confidential users

---

## Sign-off

| Role | Name | Date | Pass/Fail |
|------|------|------|-----------|
| Commission admin | | | |
| Accounting | | | |
| Product owner | | | |
