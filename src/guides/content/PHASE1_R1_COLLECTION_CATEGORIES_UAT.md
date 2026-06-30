# Phase 1 R1 — Collection Category Master UAT

Use after Lovable **Publish** (migrations `20260722120000`–`20260722120020` approved) and a hard refresh.

**Scope:** Replace hardcoded trust buckets with a configurable **Collection Category Master** that drives CRM invoicing, payment allocation, trust subledger, disbursements, student financial ledger, and payment-purpose reporting.

**Out of scope (R2+):** Recoverable/reimbursement journals, bank selection, FX, line-level tax GL.

---

## Pre-flight

| # | Step | Expected |
|---|------|----------|
| R1-P1 | Log in as Finance Admin or Accountant | Accounting sidebar shows **Collection categories** and **Payment purpose** |
| R1-P2 | Open **Settings → Collection categories** | Seeded tree: Third Party Collections, Revenue, IELTS, Insurance, Tuition, etc. |
| R1-P3 | Confirm lifecycle badges | Categories show Draft / Active / Inactive / Archived |
| R1-P4 | Run `npm run test` → `postingWorkflows.test.ts` | All tests pass (includes multi-category payment allocation) |

---

## CA-01 — Category master CRUD & lifecycle

| # | Step | Expected |
|---|------|----------|
| CA-01a | Create a **Draft** leaf category under Third Party | Saved; not selectable on new invoice lines |
| CA-01b | Set **expected payee name** (e.g. `GuardMe`) and treatment **Third Party** | Fields persist on reload |
| CA-01c | Activate category (Draft → Active) | Appears in service/invoice mapping pickers |
| CA-01d | Deactivate then Archive | Inactive blocks new use; Archived read-only in admin |

---

## CA-02 — Service catalogue mapping

| # | Step | Expected |
|---|------|----------|
| CA-02a | In Collection categories admin, map a `service_catalogue` row to **IELTS** leaf | `collection_category_id` stored on service |
| CA-02b | Add that service to a CRM client invoice | Invoice line carries `collection_category_id` |
| CA-02c | Sync CRM / post invoice accrual | `accounting_invoice_line_classifications` row has category + treatment |

---

## CA-03 — Balveer end-to-end (INR collect → disburse)

| # | Step | Expected |
|---|------|----------|
| CA-03a | Issue Balveer invoice: consulting (revenue) + tuition + insurance + IELTS | Mixed REVENUE + TRUST/INSTITUTION lines |
| CA-03b | Record verified INR payment (full amount) | Payment journal: DR bank · CR AR (revenue share) · CR trust buckets by category |
| CA-03c | Open **Accounting → Clients → Balveer** | **Student Financial Ledger** shows KPIs + category breakdown |
| CA-03d | Confirm **Recoverables** section | Placeholder visible; balance `0` until R2 |
| CA-03e | Disburse insurance from trust | Category picker shows **Insurance → GuardMe**; payee prefilled |
| CA-03f | Disburse tuition to institution | Clears institution-related category; not expense |

---

## UAT-MP-01 — One payment across multiple categories

| # | Step | Expected |
|---|------|----------|
| MP-01a | Invoice with **only** pass-through lines: IELTS ₹18,000 + Insurance ₹12,000 + GIC ₹50,000 | Three distinct categories on lines |
| MP-01b | Single verified payment ₹80,000 | One payment journal; three trust CR legs (proportional) |
| MP-01c | Inspect `client_invoice_payment_allocations` | Three rows with distinct `collection_category_id` |
| MP-01d | Student Financial Ledger | Each category shows collected amount matching allocation |
| MP-01e | Trust page | Separate balances per category (not merged into one bucket label) |

---

## CA-04 — Payment Purpose report

| # | Step | Expected |
|---|------|----------|
| CA-04a | Open **Reports → Payment purpose** | Grid loads from `vw_accounting_payment_purpose` |
| CA-04b | Filter by client and date range | Rows show category name, treatment, expected payee, allocated amount |
| CA-04c | Export / review totals | Sums match payment allocations for period |

---

## CA-05 — Trust UI category labels

| # | Step | Expected |
|---|------|----------|
| CA-05a | Open **Student Trust** after MP-01 payment | Held-by-category badges use category names (not raw `TRUST_*` keys) |
| CA-05b | Start disbursement from trust row | **Payment purpose** dropdown; expected payee prefilled when configured |

---

## CA-06 — Regression guards

| # | Step | Expected |
|---|------|----------|
| CA-06a | Partial CRM payment on mixed invoice | AR and each trust category credited proportionally |
| CA-06b | Disbursement over available category balance | Blocked in UI + DB guard |
| CA-06c | Posted journals | Still immutable; corrections via reversal only |

---

## Pass gate (R1 complete)

- [ ] Category master seeded and editable with lifecycle + expected payee
- [ ] CRM invoice lines persist `collection_category_id`
- [ ] Single payment allocates across multiple categories (UAT-MP-01)
- [ ] Student Financial Ledger on accounting client detail incl. Recoverables placeholder
- [ ] Payment Purpose report accessible and accurate
- [ ] Trust disbursement uses category picker + expected payee prefill

See also: [PHASE1_ACCOUNTING_UAT.md](./PHASE1_ACCOUNTING_UAT.md)
