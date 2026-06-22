# Accounting Module Readiness Report

**Audit date:** 2026-06-19  
**Scope:** `src/accounting/**`, `docs/guides/ACCOUNTING_*`, `docs/system-map/flows/accounting-and-approvals.md`  
**Route wiring:** `src/App.tsx` (accounting routes only — minimal out-of-scope read)  
**Policy:** Audit only — no code modified

---

## Executive verdict

| Question | Answer |
|----------|--------|
| **Production-ready?** | **No** |
| **Overall status** | 🔴 **Red** |
| **Best current use** | Internal pilot / Phase 1 UAT with finance team supervision |
| **Blocking themes** | Hybrid mock + DB stores, immutability gaps in UI, mock-heavy reports/tax/fraud, incomplete vendor/AR surfaces, entity RLS not uniform |

The module has a **broad, navigable UI** (~70 routes) and **meaningful Supabase integration** on core ledgers (journals, COA, AP, trust, payroll batches, entities, access). It is **not** safe for unsupervised production finance operations until Phase 1 UAT passes, mock surfaces are retired or gated, and hardening rules are enforced end-to-end.

---

## Status legend

| Status | Meaning |
|--------|---------|
| 🟢 **Green** | Production-viable for stated scope; DB-backed; aligns with hardening |
| 🟡 **Amber** | Usable with caveats; partial DB; UAT required |
| 🔴 **Red** | Mock, missing, or contradicts production policy |

---

## 1. Implemented Features

**Status: 🟡 Amber**

| Area | Implementation | Evidence |
|------|----------------|----------|
| **Module shell & access gate** | `AccountingProtectedRoute`, `useAccountingAccess()` → `accounting_users` | Active-user check; CRM admin no longer auto-grants |
| **Section RBAC** | `AccountingSectionRoute` + `usePermission()` + `accounting_user_module_permissions` | 30 module keys in `accountingModulePermissions.ts` |
| **Chart of Accounts** | `coaStore` ↔ `accounting_coa` + localStorage cache | CRUD, entity filter, bank-type scrub |
| **Journals** | `journalsStore` ↔ `accounting_journals` / `accounting_journal_lines` | Contract columns, DRAFT→POSTED path, reversal fields |
| **AP bills & payments** | `apBillsStore` ↔ `accounting_ap_bills`; `apPosting.ts` → journals + `accounting_ap_payments` | Partial payment flow, payment proofs |
| **AR (corporate)** | `arInvoicesStore` ↔ `accounting_ar_invoices` | Separate from student CRM invoices per UAT |
| **Student trust** | `trustStore` ↔ `accounting_trust_*`; `crmBridgeStore` CRM sync | Disbursement flow, bucket balances |
| **Bank accounts** | `bankAccountsStore` ↔ `accounting_bank_accounts` | Entity-scoped; linked COA |
| **Petty cash** | `pettyCashStore` ↔ `accounting_petty_cash` | Vouchers, replenishment, audit page |
| **Payroll accounting** | `payrollStore` ↔ `accounting_payroll_batches` + `payrollPosting.ts` | Accrual / pay journals |
| **Entities & settings** | `accountingEntitiesStore`, access admin, collection categories | Multi-entity picker, `fn_student_financial_summary` RPC |
| **Intercompany** | `intercompanyStore` ↔ `accounting_intercompany` | New/detail/list |
| **Reimbursements** | `reimbursementsStore` ↔ `accounting_reimbursements` | List/new/detail |
| **Card reconciliation** | `cardReconciliationStore` ↔ `accounting_card_reconciliation` | Large new-session UI |
| **Documents** | `documentsStore` ↔ `accounting_documents` + storage bucket | Upload/OCR queue |
| **Trial balance / GL (client-side)** | `financialReports.ts` computes from journals + COA | TB, P&L, BS pages use live journal data |
| **Owners / wealth** | `ownersStore` ↔ `owner_profiles`, `financial_accounts` | List + detail (partial actions) |

---

## 2. Partially Implemented Features

**Status: 🟡 Amber**

| Feature | What works | What’s incomplete |
|---------|------------|-------------------|
| **Hybrid stores** | Most stores hydrate from Supabase on auth ready | Fallback to `localStorage` + empty/mock seeds on failure |
| **AR student revenue** | Trust + CRM bridge sync on Trust page | Primary student invoices live in CRM (`client_invoices`); `accounting_ar_invoices` is corporate-only |
| **Approvals** | AP bill rows drive live approval list | `MOCK_APPROVALS` still seeded; multi-stage OTP flow UI-only |
| **Bank reconciliation** | Report reconciliation page uses live journals | `/accounting/reconciliation` uses `MOCK_PAST_SESSIONS`, `MOCK_JOURNALS` for matching |
| **Tax** | `taxStore` hydrates `accounting_tax_codes` | Dashboard/calendar/notices pages use `MOCK_TAX_PERIODS`, `MOCK_NOTICES` |
| **Vendors** | List + CRUD via `vendorsStore` → DB | **Detail page reads `MOCK_VENDORS` only** — breaks for real vendors |
| **Clients (accounting)** | List from `accounting_clients` + CRM link | Detail tabs use `MOCK_CLIENT_SERVICES`, notes, activity |
| **COA drill-down** | Account drawer | Transaction history from `MOCK_JOURNALS`, not live |
| **Overview dashboard** | Entity picker, onboarding, migrate helper | KPI charts use **empty arrays** — no live aggregates |
| **AI assistant** | Chat UI shell | Context built from `mockReports`, `MOCK_INVOICES`, `MOCK_BILLS`, etc. |
| **Hardening A1** | Documented in `ACCOUNTING_HARDENING_ARCHITECTURE.md` | Phases A2–A6 (refunds, transfer engine, immutability) deferred |

---

## 3. Placeholder Screens

**Status: 🔴 Red**

| Screen / action | Path | Placeholder behaviour |
|-----------------|------|------------------------|
| **Fraud dashboard** | `/accounting/fraud`, `/accounting/fraud/flagged` | `MOCK_FRAUD_FLAGS`, `MOCK_RISK_TREND` |
| **Tax calendar** | `/accounting/tax/calendar` | `MOCK_TAX_PERIODS`; “Add filing” → toast |
| **Tax notices** | `/accounting/tax/notices` | `MOCK_NOTICES`; manual add → toast |
| **Consolidated reports** | `/accounting/reports/consolidated` | `mockReports` (`ENTITY_DATA`, `FX_RATES`, …) |
| **Cash flow report** | `/accounting/reports/cashflow` | `CF_DATA` mock; PDF export → toast |
| **Balance sheet export** | `/accounting/reports/bs` | PDF/Excel → “coming soon” |
| **Owner detail** | `/accounting/owners/:id` | Upload, transactions, document link → toast |
| **AR / AP edit** | AR list, AP list, bill detail | “Edit coming soon” |
| **Receipt email** | Receipt modal | “Email delivery coming soon” |
| **Overview widgets** | `/accounting` | Revenue/monthly/approvals/fraud/tax arrays empty |

---

## 4. Broken Routes

**Status: 🟡 Amber** (routes resolve; some UX dead-ends)

| Issue | Severity | Detail |
|-------|----------|--------|
| **Vendor detail 404 for DB vendors** | 🔴 High | `/accounting/vendors/:id` looks up `MOCK_VENDORS` only — Supabase vendors show “Vendor not found” |
| **Doc path mismatch** | 🟡 Low | Architecture cites `/accounting/settings/access`; app route is `/accounting/access` (works; doc wrong) |
| **Duplicate wealth routes** | 🟡 Low | Both `/accounting/wealth` and `/accounting/owners/wealth-summary` → same page |
| **All declared routes** | 🟢 OK | ~70 `/accounting/*` routes registered in `App.tsx`; no orphan page components found |

**Inspected route groups:** overview, journals, COA, owners, AP, AR, trust, payroll, vendors, clients, bank, documents, approvals, reports (8), tax (3), fraud (2), reconciliation, AI, settings (3), petty cash (5), intercompany (3), reimbursements (3), card-recon (2), access.

---

## 5. Missing Database Dependencies

**Status: 🟡 Amber** (tables referenced in code; publish state not verified in this audit)

Stores expect these Supabase objects (non-exhaustive):

| Table / object | Used by | Risk if migration unpublished |
|----------------|---------|-------------------------------|
| `accounting_journals`, `accounting_journal_lines` | Journals, reports | 🔴 Core ledger broken |
| `accounting_coa` | COA, posting | 🔴 |
| `accounting_ap_bills`, `accounting_ap_payments` | AP | 🔴 |
| `accounting_ar_invoices` | Corporate AR | 🟡 |
| `accounting_vendors` | Vendors list | 🟡 |
| `accounting_clients` | Clients mirror | 🟡 |
| `accounting_bank_accounts` | Bank module | 🔴 |
| `accounting_trust_accounts`, `accounting_trust_entries`, `accounting_trust_disbursements` | Trust | 🔴 |
| `accounting_payroll_batches`, `accounting_payroll_components` | Payroll accounting | 🔴 |
| `accounting_tax_codes`, `accounting_tax_components`, `accounting_entity_tax_config` | Tax store | 🟡 |
| `accounting_petty_cash` | Petty cash | 🟡 |
| `accounting_intercompany` | Intercompany | 🟡 |
| `accounting_reimbursements` | Reimbursements | 🟡 |
| `accounting_card_reconciliation` | Card recon | 🟡 |
| `accounting_documents` + `accounting-documents` bucket | Documents | 🟡 |
| `accounting_entities` | Entity setup | 🔴 |
| `accounting_users`, `accounting_user_module_permissions`, `accounting_user_entity_scope` | Access | 🔴 |
| `accounting_collection_categories` | Collection categories | 🟡 |
| `accounting_crm_invoice_bridge` | CRM bridge | 🔴 for student AR |
| `vw_accounting_payment_purpose` | Payment purpose report | 🟡 |
| `owner_profiles`, `financial_accounts`, `owner_profile_directors` | Owners | 🟡 |
| `client_invoices`, `client_invoice_payments`, `client_invoice_receipts` | CRM AR bridge, verification | 🔴 (CRM tables — read-only cross-boundary) |

**UAT prerequisite:** Phase 1 migrations `20260720120000`–`20260720120130` per `PHASE1_ACCOUNTING_UAT.md` (read from guides registry; out of strict `ACCOUNTING_*` glob but accounting UAT).

**Gap:** No single migration manifest inside `src/accounting/` — production readiness depends on Lovable publish checklist.

---

## 6. Missing Permissions / RBAC

**Status: 🟡 Amber**

| Item | Status | Gap |
|------|--------|-----|
| **Module permission matrix** | 🟢 Defined | 30 sections + role defaults (`ACCT_ROLE_DEFAULTS`) |
| **Gate: accounting access** | 🟢 | `accounting_users.status = ACTIVE` |
| **Per-section route guard** | 🟢 | `AccountingSectionRoute` view/edit/delete |
| **Entity scope UI** | 🟡 | `useEntityScope`, `DataAccessPanel` for `accounting_user_entity_scope` |
| **Entity scope RLS** | 🔴 Incomplete | Flow doc: **only `accounting_bank_accounts` has entity RLS**; other modules rely on UI filter |
| **Delete permission vs immutability** | 🔴 | UI exposes delete on POSTED journals and AR invoices despite policy |
| **CRM cross-read** | 🟡 | `paymentVerification.ts`, `trustStore`, `RecentReceiptsCard` read `clients` / CRM invoice tables — needs CRM RLS + accounting role alignment |

---

## 7. Save / CRUD Issues

**Status: 🔴 Red**

| Issue | Location | Impact |
|-------|----------|--------|
| **Optimistic local-first writes** | All hybrid stores | UI updates before DB confirm; silent revert on failure (toast only) |
| **Delete POSTED journals** | `AccountingJournalsPage`, `AccountingJournalDetailPage` | UI offers “Delete anyway” for POSTED — conflicts with UAT P3 and hardening |
| **Delete AR invoices** | `arInvoicesStore.deleteArInvoice`, invoice detail | Physical delete exposed |
| **Delete accounting_clients** | `clientsStore`, clients page | Physical delete on mirror table |
| **localStorage drift** | journals, COA, AP, AR, vendors, banks | Multi-browser / cleared cache → divergent truth |
| **Vendor detail no CRUD** | `AccountingVendorDetailPage` | Read path disconnected from `vendorsStore` |
| **Migrate helper on overview** | `migrateToSupabase.ts` | Suggests one-time local→DB migration still needed in some environments |

---

## 8. Validation Issues

**Status: 🟡 Amber**

| Area | Validation | Gap |
|------|------------|-----|
| **Journal balance** | Client + DB (`is_balanced`) | POSTED path forces DRAFT insert then promote — good |
| **AP over-payment** | UAT AP6 expects UI block | Needs live UAT confirmation |
| **Trust disbursement > balance** | UAT ST4 | Store + UI guards referenced; needs UAT |
| **Entity on journals** | `entity_id`, `branch_id` on contract columns | Legacy `entity` name field still used in places |
| **COA categories** | `coaCategoriesStore` | **localStorage only** — no DB persistence |
| **COA master types/groups** | `coaMasterStore` | localStorage only |
| **AR edit** | — | No edit flow — validation bypass via “coming soon” |

---

## 9. Reporting Gaps

**Status: 🟡 Amber** (TB/GL 🟢; consolidated/fraud/tax reports 🔴)

| Report | Data source | Status |
|--------|-------------|--------|
| Trial balance | Live journals + COA | 🟢 |
| General ledger | Live journals | 🟢 |
| P&L | `compute*` from journals | 🟢 (client-side) |
| Balance sheet | Live data | 🟡 (export not implemented) |
| Cash flow | `mockReports.CF_DATA` | 🔴 |
| Consolidated | `mockReports` eliminations/FX | 🔴 |
| Report reconciliation | Mix: live journals in one page, mock sessions in another | 🟡 |
| Payment purpose | `vw_accounting_payment_purpose` | 🟡 (needs hydrated categories + publish) |
| Overview KPIs | Empty static arrays | 🔴 |

**Note:** Client-side reporting does not replace audited GL subledger views in Postgres for statutory filing.

---

## 10. AR / AP Gaps

**Status: 🟡 Amber**

### Accounts Receivable

| Item | Status |
|------|--------|
| CRM student invoices (source of truth) | 🟢 Bridge via `crmBridgeStore` / Trust sync |
| Corporate `accounting_ar_invoices` | 🟡 CRUD to DB; empty mock seed |
| Receipts page | 🟡 Uses CRM `client_invoice_receipts` in components |
| Payment verification queue | 🟢 `paymentVerification.ts` → CRM payments |
| Edit invoice | 🔴 Not implemented |
| Delete invoice | 🔴 Allowed in UI — policy conflict |
| Installment / classification | 🟡 Partial; collection categories integration |

### Accounts Payable

| Item | Status |
|------|--------|
| Bill CRUD + DB sync | 🟢 |
| Partial payments + journals | 🟢 `apPosting.ts` |
| Payment proofs (storage) | 🟢 |
| Bill edit UI | 🔴 Coming soon |
| TDS / India-specific | 🟡 UAT checklist item AP5 — needs verification |
| Vendor master detail | 🔴 Mock-only detail page |

---

## 11. Bank / Trust Accounting Gaps

**Status: 🟡 Amber**

### Bank

| Item | Status |
|------|--------|
| Bank account CRUD | 🟢 DB-backed |
| Entity RLS on bank accounts | 🟢 Per flow doc |
| Bank detail txn history | 🟡 Uses `MOCK_JOURNALS` filter |
| Statement reconciliation | 🟡 `/accounting/reconciliation` largely mock sessions |
| Card reconciliation | 🟢 DB-backed; complex UI |

### Trust

| Item | Status |
|------|--------|
| Trust balances & entries | 🟢 `trustStore` |
| CRM sync button | 🟢 |
| Disbursement + journals | 🟢 |
| Refund flag (`is_refund`) | 🟡 UAT ST6 |
| Attachment on disbursement | 🟡 UAT ST5 |

---

## 12. Tax Module Gaps

**Status: 🔴 Red**

| Item | Status |
|------|--------|
| `taxStore` → `accounting_tax_codes` | 🟢 Hydration implemented |
| Tax dashboard UI | 🔴 Uses mock periods/notices |
| Tax calendar | 🔴 Mock + placeholder actions |
| Notices compliance | 🔴 Mock |
| Filings / remittances | 🔴 Not surfaced in UI (migrations exist per Phase 1 naming) |
| Export / filing workflow | 🔴 |

---

## 13. Payroll Integration Gaps

**Status: 🟡 Amber** (accounting payroll only — HR module out of scope)

| Item | Status |
|------|--------|
| `accounting_payroll_batches` UI | 🟢 List/detail + posting helpers |
| Accrual / payment journals | 🟢 `payrollPosting.ts` |
| HR payroll → accounting auto-feed | 🔴 No integration from `hr_payroll` (by design in scope lock) |
| Manual batch entry | 🟡 Assumed for Phase 1 UAT |
| Attachment on batch | 🟡 UAT PY7 |

**Clarification:** “Payroll” in accounting is **GL posting for payroll batches**, not the HR Payroll module (`/hr/*`), which is explicitly out of scope.

---

## 14. Security Concerns

**Status: 🔴 Red**

| Concern | Severity | Detail |
|---------|----------|--------|
| **Financial immutability** | 🔴 High | Delete POSTED journals/invoices from UI |
| **Entity isolation** | 🔴 High | RLS not uniform — UI-only filtering on most tables |
| **localStorage authoritative cache** | 🟡 Medium | Tamperable client-side state |
| **Trust disbursement rollback** | 🟡 Medium | `trustStore` deletes disbursement row on journal failure (compensating) — review audit trail |
| **Access bootstrap** | 🟢 Low | No auto-admin; requires `accounting_users` row |
| **Payment proof signed URLs** | 🟢 | Short-lived storage URLs |
| **AI context** | 🟡 | Mock financial data sent to AI gateway — misleading answers risk |

---

## 15. UAT Risks

**Status: 🔴 Red** (checklist exists; pass status unknown)

Reference: `docs/guides/PHASE1_ACCOUNTING_UAT.md` (accounting Phase 1).

| Risk | Likelihood | Impact |
|------|------------|--------|
| Migrations `202607201200*` not all published | High | All posting workflows fail |
| P3 POSTED journal immutability | High | UI allows delete — UAT fail |
| AR1–AR7 CRM bridge | Medium | Requires CRM actions (out of module scope but required for student AR) |
| Vendor detail for AP UAT | High | Detail page mock — AP7 vendor traceability weak |
| TB entity filter (P4) | Medium | Depends on consistent `entity_id` on journals |
| `postingWorkflows.test.ts` (P5) | Low | Dev test exists; must pass in CI |
| Mock tax/fraud/consolidated | High | False confidence if stakeholders demo those screens |
| Multi-user localStorage | Medium | Different users see different cached data |

**Recommendation:** Run UAT only on 🟢/🟡 surfaces listed in §1–2; exclude fraud, tax UI, consolidated, AI from sign-off until rebuilt.

---

## 16. Recommended Next Phase

**Status: N/A (planning)**

### Phase A — Production gate (blocking)

| Priority | Work item | Target status |
|----------|-----------|---------------|
| P0 | Publish & verify all `202607201200*`–`20260720120130` migrations | DB 🟢 |
| P0 | Remove/disable delete on POSTED journals, receipts, paid invoices | Security 🟢 |
| P0 | Wire `AccountingVendorDetailPage` to `vendorsStore` / AP history | AP 🟢 |
| P0 | Complete Phase 1 UAT checklist with sign-off record | UAT 🟢 |
| P1 | Enforce entity RLS on journals, AP, AR, trust (not only bank) | Security 🟢 |
| P1 | Retire mock data from tax, fraud, consolidated, overview KPIs | Reports 🟢 |

### Phase B — Hardening (per `ACCOUNTING_HARDENING_ARCHITECTURE.md`)

| Priority | Work item |
|----------|-----------|
| P1 | A2 financial immutability — reversals only |
| P2 | A4 refund engine + `refund_policy_config` |
| P2 | A3 transfer wizard + `financial_transfer_events` |
| P3 | Service lifecycle / `fn_assess_service_financial_dependencies` integration |

### Phase C — Operational completeness

| Priority | Work item |
|----------|-----------|
| P2 | Bank reconciliation sessions → DB (replace `MOCK_PAST_SESSIONS`) |
| P2 | COA master metadata → DB (replace localStorage types/groups) |
| P3 | Statutory export (PDF/Excel) on financial statements |
| P3 | HR payroll batch import (when approved cross-module) |

---

## Area scorecard (RAG summary)

| # | Area | Status |
|---|------|--------|
| 1 | Implemented features | 🟡 Amber |
| 2 | Partially implemented | 🟡 Amber |
| 3 | Placeholder screens | 🔴 Red |
| 4 | Broken routes | 🟡 Amber |
| 5 | Missing DB dependencies | 🟡 Amber |
| 6 | Permissions / RBAC | 🟡 Amber |
| 7 | Save / CRUD issues | 🔴 Red |
| 8 | Validation issues | 🟡 Amber |
| 9 | Reporting gaps | 🟡 Amber |
| 10 | AR / AP gaps | 🟡 Amber |
| 11 | Bank / trust gaps | 🟡 Amber |
| 12 | Tax module gaps | 🔴 Red |
| 13 | Payroll integration gaps | 🟡 Amber |
| 14 | Security concerns | 🔴 Red |
| 15 | UAT risks | 🔴 Red |
| 16 | Recommended next phase | — |

**Module production readiness: 🔴 Red**

---

## Files inspected (audit trail)

| File | Why |
|------|-----|
| `docs/SYSTEM_ARCHITECTURE.md` §4 | Module scope (read per context rules) |
| `docs/guides/ACCOUNTING_HARDENING_ARCHITECTURE.md` | Hardening policy |
| `docs/system-map/flows/accounting-and-approvals.md` | Module map, RLS note |
| `docs/guides/PHASE1_ACCOUNTING_UAT.md` | UAT pass criteria |
| `src/App.tsx` (accounting routes only) | Route completeness |
| `src/accounting/lib/accountingModulePermissions.ts` | RBAC matrix |
| `src/accounting/hooks/useAccountingAccess.ts`, `usePermission.ts` | Access gates |
| `src/accounting/stores/*.ts` | DB vs mock persistence |
| `src/accounting/pages/**` (sampled all major sections) | UI completeness |
| `src/accounting/data/mock*.ts` | Placeholder inventory |

---

*Audit only. No application code changed.*
