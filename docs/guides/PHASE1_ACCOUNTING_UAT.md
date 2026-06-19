# Phase 1 Accounting UAT Checklist

Use this checklist after Lovable **Publish** (all Phase 1 migrations `20260720120000`–`20260720120130` approved) and a hard refresh.

**Pass criteria:** Every workflow creates a balanced, immutable `POSTED` journal with `entity_id`, `branch_id`, `source_module`, and `posting_date`. Corrections use reversal entries only — never edit posted journals.

---

## Pre-flight (all modules)

| # | Step | Expected |
|---|------|----------|
| P1 | Log in as accounting user (Accountant or Finance Admin) | Accounting sidebar visible |
| P2 | Open **Chart of Accounts** | Phase 1 accounts present (1200 AR, 2000 AP, 2480 trust, tax roles, payroll roles) |
| P3 | Open **Journals** | Can view posted journals; POSTED rows cannot be edited or deleted |
| P4 | Pick one entity in reports (not "All") | TB / BS / P&L totals change and exclude other entities' journal activity |
| P5 | Run `npm run test` → `postingWorkflows.test.ts` (dev) | 17 tests pass |

---

## A. Accounts Receivable (CRM bridge)

**Source of truth:** `client_invoices`, `client_invoice_payments` (not `accounting_ar_invoices` for students).

| # | Step | Expected |
|---|------|----------|
| AR1 | Issue a CRM invoice with mixed lines (coaching + tuition) | Invoice status `sent` / `paid` |
| AR2 | Accounting → **Sync CRM** (Trust page) or wait for auto-sync | `accounting_crm_invoice_bridge` row created; classification REVENUE vs TRUST |
| AR3 | Verify accrual journal for invoice | DR AR (revenue + tax only) · CR revenue · CR output tax; **no trust liability at invoice** |
| AR4 | Record verified payment on CRM invoice | Payment journal: DR bank · CR AR (revenue share) · CR trust buckets (pass-through share) |
| AR5 | Confirm journal fields | `source_module=CRM_AR`, `entity_id` = firm, `branch_id` set |
| AR6 | Partial CRM payment | Outstanding AR reduces; trust credited proportionally |
| AR7 | Corporate-only AR invoice (Accounting → AR → New) | Uses `accounting_ar_invoices`; separate from student trust |

---

## B. Student Trust

| # | Step | Expected |
|---|------|----------|
| ST1 | Open **Accounting → Student Trust** | Balances by client / bucket after CRM payment sync |
| ST2 | Confirm trust receipt subledger | `accounting_trust_entries` RECEIPT row; balance increases |
| ST3 | **New disbursement** — pay institution from tuition bucket | Journal: DR trust liability · CR bank; **not** through expense |
| ST4 | Attempt disbursement > available balance | Blocked in UI; DB guard rejects if forced |
| ST5 | Upload attachment on disbursement | File in `accounting-attachments` bucket; path on disbursement row |
| ST6 | Student refund payee type | Same liability clearance pattern; `is_refund=true` |
| ST7 | Verify trust balance after disbursement | Subledger + GL liability reduced; client bucket shows lower available |

---

## C. Accounts Payable (partial payments)

| # | Step | Expected |
|---|------|----------|
| AP1 | Create / approve vendor bill | Accrual journal: DR expense · CR AP |
| AP2 | **Record payment** for 50% of outstanding | Status `PARTIALLY_PAID`; `paid_amount` / `outstanding` updated |
| AP3 | Verify payment journal | DR AP · CR bank (partial amount); `accounting_ap_payments` + allocation rows |
| AP4 | Second payment clears remainder | Status `PAID`; outstanding = 0 |
| AP5 | Payment with TDS (India bill) | DR AP (gross) · CR bank (net) · CR TDS payable |
| AP6 | Over-payment attempt | UI error before posting |
| AP7 | Bill detail shows paid / outstanding columns | Matches DB |

---

## D. Payroll accounting

| # | Step | Expected |
|---|------|----------|
| PY1 | Open **Accounting → Payroll accounting** | Lists `accounting_payroll_batches` |
| PY2 | Draft batch with balanced components | DR salary/expense + employer cost · CR deduction payables · CR net payroll payable |
| PY3 | **Post accrual** | Batch → `ACCRUED`; accrual journal linked; `source_module=PAYROLL` |
| PY4 | **Pay net** on accrued batch | DR net payroll payable · CR bank; batch → `PAID` |
| PY5 | Verify entity + branch on both journals | Match batch `entity_id` / `branch_id` |
| PY6 | Attempt pay before accrue | Error — only ACCRUED batches can be paid |
| PY7 | Attachment on batch (if set) | Visible on journal / batch record |

---

## E. Tax

| # | Step | Expected |
|---|------|----------|
| TX1 | Entity tax config (`accounting_entity_tax_config`) | Registration, default output/input codes, commission tax mode |
| TX2 | Canada invoice with HST | Output tax legs to HST payable role; single or split per config |
| TX3 | India invoice — intra-state | CGST + SGST output legs |
| TX4 | India purchase with recoverable GST | Input tax credit DR legs |
| TX5 | TDS on vendor payment | Withholding CR to TDS payable (AP payment flow) |
| TX6 | Commission tax mode = EXEMPT / RCM | No hardcoded India treatment; driven by `entity_tax_config` |
| TX7 | Tax filing / remittance (when data exists) | Filing row + remittance journal + attachment support |

---

## F. Banking & reconciliation

| # | Step | Expected |
|---|------|----------|
| BK1 | Trust / CRM payment journal | Credits `BANK_OPERATING` or `BANK_TRUST` role per workflow |
| BK2 | AP payment journal | CR bank for cash paid |
| BK3 | Payroll payment journal | CR bank for net salaries |
| BK4 | Bank account COA link | Bank picker on AP payment resolves to COA via `bankAccountsStore` |
| BK5 | Reconciliation session (framework) | Can create `accounting_recon_sessions`; import statement lines |
| BK6 | Match statement line to journal line | `accounting_recon_matches` row; session status updates |

---

## G. Entity-scoped financial reports

| # | Step | Expected |
|---|------|----------|
| R1 | **Trial balance** — filter Entity A | Only Entity A journals + global accounts touched by A |
| R2 | TB debits = credits (within rounding) | Balanced banner / zero difference |
| R3 | **Balance sheet** — same entity filter | Assets = Liabilities + Equity (incl. retained earnings) |
| R4 | **P&L** — same entity filter | Revenue / COGS / opex reflect entity-scoped activity only |
| R5 | Switch entity filter | All three reports change consistently |
| R6 | Compare to General Ledger for same entity | Line totals reconcile |

---

## H. Immutability & period controls

| # | Step | Expected |
|---|------|----------|
| I1 | Try editing a POSTED journal amount | Blocked (UI + DB trigger) |
| I2 | Reverse a posted journal | New reversal journal; original linked `reversed_by_journal_id` |
| I3 | Post into CLOSED fiscal period | Blocked by period lock trigger |
| I4 | Trust disbursement driving negative balance | Blocked by `fn_trust_entry_balance_guard` |

---

## Sign-off

| Module | Tester | Date | Pass / Fail | Notes |
|--------|--------|------|-------------|-------|
| AR / CRM bridge | | | | |
| Student Trust | | | | |
| AP partial pay | | | | |
| Payroll | | | | |
| Tax | | | | |
| Banking | | | | |
| Entity reports | | | | |

**Do not start UAT for:** Commission, Procurement, Assets, Construction, or Forecasting (Phase 2/3).
