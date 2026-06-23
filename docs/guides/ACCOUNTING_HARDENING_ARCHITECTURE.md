# Accounting Hardening Architecture (APPROVED)

> **Status:** Phase A1.5 blocked on accounting prerequisite deploy (bridge + trust tables). See [`ACCOUNTING_A1_5_PREREQ_DEPLOY.md`](./ACCOUNTING_A1_5_PREREQ_DEPLOY.md). Phases A2–A6 deferred until A1.5 UAT passes.  
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

1. Run `fn_assess_service_financial_dependencies` → tier `pre_financial` or `financial`.
2. **Pre-financial** (draft only, ₹0 paid, no money artifacts) → cleanup drafts → archive case.
3. **Financial** → block → offer Transfer / Refund / Cancel.
4. Never hard-delete posted financial records. Draft commercial invoices may be **cancelled** (soft) pre-financial only.

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

## 7. Dependency check (Phase A1 / A1.5)

`fn_assess_service_financial_dependencies` returns tier:

| Tier | Meaning | Removal |
|------|---------|---------|
| `pre_financial` | Draft-only commercial records; ₹0 paid; no receipts/allocations/refunds/journals/trust/wallet applied | Archive + `fn_cleanup_pre_financial_service_drafts` |
| `financial` | Issued/sent invoice OR any money artifact | Block → Transfer / Refund / Cancel |

**Pre-financial rules (locked):** Draft + discounts OK. Wallet `applied`/`reserved` → financial. Issued/sent invoice → financial even if ₹0 paid.

**Service-scoped traceability:**

| Record | Service link |
|--------|----------------|
| Invoice lines | `line_items[].service_id`, `service_code`, `case_id` |
| Payment allocations | `service_id`, `line_item_key`, `invoice_id` |
| Payments / receipts | Via `invoice_id` → line match |
| Refunds / adjustments | Via `invoice_id` |
| Wallet allocations | `invoice_id` + `client_id` |
| CRM accounting bridge / journals | Via `invoice_id` |
| Trust entries | Via `accounting_crm_invoice_bridge.journal_id` for service invoices |
| Service cases / documents | `service_code`, `case_id` |
| Client-level trust account | Scoped to service only when bridge exists on that service's invoices |

If financial tier → block removal → **Transfer Financials** | **Process Refund** | **Cancel**.

---

## Phase A1.5 — Pre-financial draft cleanup (APPROVED)

Migration: `20260925120000_accounting_hardening_phase_a1_5.sql`

- Extend `fn_assess_service_financial_dependencies` with `tier`, `draft_invoices`, `issued_invoices`
- `fn_cleanup_pre_financial_service_drafts` — cancel exclusive drafts or strip lines on mixed invoices
- Audit: `draft_invoice_cancelled`, `draft_invoice_lines_removed`
- Cancelled drafts: `status = cancelled`, `archived_at` set — hidden from counselor UI, retained for audit
- No purge job in this phase

### Phase A1.5 UAT checklist

- [ ] Publish migration `20260925120000_accounting_hardening_phase_a1_5.sql`
- [ ] Remove pre-financial service → draft invoice cancelled, hidden from Payments tab
- [ ] Multi-service client → remove Germany only → Canada drafts unchanged
- [ ] Mixed draft invoice → Germany lines removed, Canada lines remain
- [ ] Issued/sent invoice on service → financial block (Transfer/Refund path)
- [ ] Draft with applied wallet → financial block
- [ ] Audit rows for `draft_invoice_cancelled` / `draft_invoice_lines_removed`

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
| **A1** | Dependency RPC, archive lifecycle, removal UI, transfer wizard skeleton | **Shipped** |
| **A1.5** | Pre-financial tier + draft cleanup RPC + cancelled draft hide | **Ready for UAT** |
| A2 | Immutability + `financial_audit_log` | After A1.5 UAT |
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
