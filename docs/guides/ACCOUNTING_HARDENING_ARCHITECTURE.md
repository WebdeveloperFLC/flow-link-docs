# Accounting Hardening Architecture (APPROVED)

> **Status:** Phase A1 ready for UAT (2026-06-22). Phases A2–A6 deferred until A1 UAT passes.  
> **Document module:** LOCKED — no changes to documents, binders, Service Library document structure.

---

## Objective

Protect accounting records from accidental deletion, service removal, payment loss, refund mistakes, and audit failures. **Accounting remains the source of truth for money.**

---

## 1. Service records — never deleted

**No physical delete** of service cases or financial records.

### Lifecycle statuses (`client_service_cases.lifecycle_status`)

| Status | Meaning |
|--------|---------|
| `active` | On client file, in workflow |
| `completed` | Service finished successfully |
| `cancelled` | Cancelled by client/agency |
| `withdrawn` | Client withdrew |
| `transferred` | Financials moved to another service (Phase A3+) |
| `archived` | Removed from active client view; history retained |

Legacy `closed` maps to `completed`.

### Remove-from-client behaviour

1. Run `fn_assess_service_financial_dependencies`.
2. **No financial data** → confirm → archive case, remove from client selection.
3. **Financial data exists** → block → offer Transfer / Refund / Cancel.
4. Never hard-delete invoices, payments, receipts, journals, documents, or audit rows.

---

## 2. Refund policy configuration (Phase A4 — not built in A1)

Per **entity** (FLC India, FLC Canada, FLC USA):

| Field | Default |
|-------|---------|
| Minimum Admin Fee % | 25 |
| Minimum Admin Fee Amount | entity currency floor |
| Tax Refundable | No |
| Third Party Fees Refundable | No |
| MD Override Required | Yes (for exceptions) |

**Not hardcoded in application code** — read from `refund_policy_config` at calculation time.

---

## 3. Refund calculation — invoice-line based (Phase A4+)

Refunds **must not** use invoice total alone.

Each line classified:

| Line example | Typical class |
|--------------|---------------|
| Consultancy Fee | Refundable / partially |
| Visa Fee | Partially / non-refundable |
| Courier Fee | Partially |
| GST/HST | Non-refundable (default) |
| Government Fee | Non-refundable (default) |

Refund engine sums **eligible lines only** per policy config.

---

## 4. Approval matrix (Phase A4+)

Role + amount based (INR defaults; entity-scoped):

| Amount | Approvers |
|--------|-----------|
| Under ₹25,000 | Accountant |
| ₹25,001 – ₹100,000 | Administrator + Accountant |
| Above ₹100,000 | Managing Director |

Store permanently: **Approved By**, **Approval Date**, **Approval Notes**.

---

## 5. Transfer wizard (Phase A1 skeleton / A3 posting)

Every transfer requires a mandatory reason:

- Wrong Service Selected
- Country Changed
- Visa Category Changed
- Duplicate Service
- Management Correction
- Other

Stored permanently in `client_service_audit_log` (`transfer_requested`).

Phase A1 records intent only; posting deferred to Phase A3.

---

## 6. Financial immutability (Phase A2)

Append-only model:

- No DELETE on posted financial transactions
- No UPDATE on posted amounts
- Negative payments for refunds
- Reversal journals for corrections
- Superseded allocations (never overwrite)

---

## 7. Dependency check (Phase A1)

`fn_assess_service_financial_dependencies` checks:

**Financial:** invoices, payments, allocations, receipts, refunds, discounts, wallet usage, accounting journals, trust entries

**Non-financial:** tasks, forms, documents, notes

If financial records exist → block removal → **Transfer Financials** | **Process Refund** | **Cancel**.

---

## 8. Commercial reporting (Phase A6)

Performance Hub must show:

- Gross Revenue
- Refund Amount
- Net Revenue
- Outstanding Balance

Refunds remain visible historically — never removed from reports.

---

## Implementation phases

| Phase | Scope | Status |
|-------|-------|--------|
| **A1** | Dependency RPC, archive lifecycle, removal UI, transfer wizard skeleton | **Ready for UAT** |
| A2 | Immutability + `financial_audit_log` | After A1 UAT |
| A3 | Transfer engine (posting) | After A2 |
| A4 | Refund policy + line-based calculation + approval | After A3 |
| A5 | Refund processing (negative payment + reversal) | After A4 |
| A6 | Reporting + permissions hardening | After A5 |

---

## Phase A1 deliverables

1. Migration: lifecycle statuses + `fn_assess_service_financial_dependencies`
2. `src/lib/serviceFinancialDependencies.ts` — types + RPC client
3. Updated `clientServiceRemoval.ts` + `RemoveServiceDialog.tsx`
4. `FinancialTransferWizard.tsx` — skeleton (reason + target; no posting)
5. Tests + UAT checklist

### Phase A1 UAT checklist

- [ ] Publish migration `20260924120000_accounting_hardening_phase_a1.sql` in Lovable
- [ ] Client with **no** financial data → Archive service → case `lifecycle_status = archived`, removed from selection
- [ ] Client with invoices/payments on service → Archive blocked → financial counts shown
- [ ] Blocked path → **Transfer financials** opens wizard; reason required; audit row `transfer_requested`
- [ ] Blocked path → **Process refund** shows Phase A4 placeholder (no refund posted)
- [ ] Blocked path → **Cancel** closes dialog without changes
- [ ] Legacy `closed` cases migrated to `completed` after migration

---

## Related docs

- `docs/system-map/flows/invoices-payments-receipts.md`
- `docs/guides/SERVICE_MANAGEMENT_AND_DELETION_RULES.md`
