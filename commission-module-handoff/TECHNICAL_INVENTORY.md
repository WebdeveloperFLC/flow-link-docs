# Commission Module — Technical Inventory (Implementation Baseline)

**Audit date:** 30 June 2026  
**Evidence source:** `flow-link-docs` codebase only  
**Guiding principle:** REUSE → EXTEND → CREATE

---

## 1. Executive Summary

| Metric | Value |
|--------|-------|
| Overall completion | **~72%** (institution partner commissions through Phase 2B) |
| Production-ready | Billing, agreements, eligibility config, commission rules, lifecycle, claims/invoicing, receipts (2A), aggregator workbench (2B), counselor status view, PH CMS ledger |
| Partial | Client linking, custom eligibility trigger, FX edge cases, Phase 2B TypeScript types, global dashboard |
| Stub / not built | CRM bridge, Finance GL posting, claim eligibility rules (backlog), referral/B2B/agent commissions |
| Stack | React + TypeScript + Supabase (PostgreSQL RPCs, RLS, Edge Functions) |

**Readiness:** Conditional UAT-ready for Phases 1–2B. Not enterprise-ready for Finance GL or CRM automation.

---

## 2. Database Architecture

### Tables (22 objects in types extract + 3 migration-only)

**Setup:** `upi_agreements`, `upi_agreement_versions`, `upi_billing_profiles`, `upi_commissions`, `upi_commission_rules`, `upi_commission_eligibility_configs`, `upi_commission_hold_reasons` (11 codes), `upi_commission_periods`

**Operational:** `upi_claim_cycles`, `upi_commission_students` (3-axis lifecycle), `upi_commission_snapshots` (immutable), `upi_commission_transfer_events`, `upi_commission_invoices`, `upi_invoice_line_items`

**Receipts (2A):** `upi_commission_receipts`, `upi_commission_receipt_invoice_allocations`, `upi_commission_receipt_student_allocations`, `upi_commission_receipt_attachments`, `upi_commission_remittance_batches`

**Aggregator (2B, partial in types.ts):** `upi_commission_aggregator_invoices`, `upi_commission_aggregator_invoice_lines`, `upi_commission_remittance_batch_statements`

### Views

In types: `v_client_commission_status`, `v_commission_receipt_open_items`, `v_commission_receipts_in_progress`, `v_commission_student_receipt_ledger`

Migration-only: `v_commission_aggregator_student_rows`, `v_commission_institution_metrics_agg`, `v_commission_aggregator_metrics`, `v_commission_batch_reconciliation`

### RPCs (~35)

See `src/integrations/supabase/types.commission-extract.ts` and `docs/database/COMMISSION_SCHEMA.sql`.

Categories: rule resolution, eligibility, snapshots, publish, hold/release, transfer, receipt CRUD/allocation/post/void, aggregator batch/invoice/summary.

### Triggers

- Snapshot immutability (`block_commission_snapshot_mutation`)
- Receipt edit guard (`block_commission_receipt_edit`)
- Legacy status sync on students (`sync_ucs_legacy_commission_status`)

### ER diagram

`docs/architecture/15_commissions-er.mmd`

---

## 3. Business Process Architecture

```
Institution Agreement → Commission Plan (upi_commissions) → Eligibility Config
→ Student Row → Calculation → Mark Eligible → Snapshot → Claim Submit
→ Invoice → Receipt (2A) → [Finance GL — NOT BUILT] → Performance Hub (read-only)
```

| Stage | Status |
|-------|--------|
| Agreement / billing / eligibility / rules | Implemented |
| Student row creation | Partial (manual; CRM bridge stub) |
| Calculation / eligibility / hold / transfer | Implemented |
| Claim / invoice | Implemented |
| Receipt posting | Implemented (no GL journal) |
| Aggregator reconciliation | Implemented |
| Finance posting | Not Found |
| Performance Hub | Read-only overlay |

---

## 4. Backend Architecture

**Pattern:** Supabase client + RPCs. No REST controllers.

| Domain | Primary files |
|--------|---------------|
| Agreements | `AgreementsPanel.tsx` |
| Commission plans | `CommissionsPanel.tsx`, `commissionEngine.ts`, `commissionRuleResolver.ts` |
| Billing | `BillingProfilesPanel.tsx` |
| Eligibility | `EligibilityConfigPanel.tsx`, `commissionEligibilityEvaluator.ts` |
| Claims | `ClaimsPanel.tsx`, `claimEngine.ts`, `claimsExport.ts` |
| Lifecycle | `CommissionLifecycleDialog.tsx`, Phase 1 RPCs |
| Receipts | `CommissionReceiptWizard.tsx`, `commissionReceiptRules.ts`, receipt RPCs |
| Aggregator | `AggregatorWorkbenchPage.tsx`, `commissionAggregatorRules.ts` |
| CRM integration | `planned/clientIntegrationBridge.ts` (dormant) |
| AI extraction | `supabase/functions/upi-extract-commission-sheet/` |

**Background jobs / queues:** Not Found

---

## 5. Frontend Architecture

### Routes

| Route | Component |
|-------|-----------|
| `/commissions` | `CommissionsPage` |
| `/institutions/:id` (tabs) | Institution panels |
| `/institutions/aggregators/:id/workbench` | `AggregatorWorkbenchPage` |
| `/performance/commissions` | `PerformanceCommissions` |

### Screens not found as dedicated routes

- Pending Claims, Reports, Administration (Commission module)

---

## 6. Business Logic (evidence-based)

### Rule precedence

Promotion → Intake → Program → Category → Campus → Country → Default  
(`commissionRuleResolver.ts`, `fn_resolve_commission_rule`)

### Calculation

Base rate + rules (fixed/percentage/multiplier); slab tiers on student_count (`commissionEngine.ts`)

### Eligibility triggers

deposit, visa, enrolled, registered, started_classes; **custom → not implemented**

### Receipt state machine

draft → ready → posted; void from draft/posted (`commissionReceiptRules.ts`)

### Finance posting

**Not Found** — `accounting_journal_id` on receipts unused

---

## 7. APIs, Hooks & Services

| Hook | File |
|------|------|
| `useCommissions`, `useCommissionRules`, `useClaimCycles`, `useInvoices` | `useInstitutionData.ts` |
| `useCommissionTrackingCmsData` | `hooks/useCommissionTrackingCmsData.ts` |
| `useModulePermission("commissions")` | `hooks/useModulePermission.ts` |

Repositories: `commissionsRepo`, `claimCyclesRepo`, `studentsRepo`, `paymentsRepo` in `repositories/index.ts`

---

## 8. Reusable Components

`CommissionsPanel`, `ClaimsPanel`, `CommissionLifecycleDialog`, `CommissionReceiptWizard`, `CommissionReceiptsPanel`, `BillingProfilesPanel`, `EligibilityConfigPanel`, `AgreementsPanel`, `ClientCommissionStatusPanel`, `PerformanceCommissionLedgerTable`, `CommissionsProtectedRoute`

---

## 9. UI Inventory

Screenshots: **Not captured** — see `screenshots/README.md`

Screen hierarchy documented in package `README.md`.

---

## 10. Technical Debt

| Item | File |
|------|------|
| Custom eligibility not implemented | `commissionEligibilityEvaluator.ts` |
| Manual client link UI disabled | `ClaimsPanel.tsx` |
| CRM bridge dormant | `planned/clientIntegrationBridge.ts` |
| Phase 2B types missing | `types.ts` vs migrations; `AggregatorWorkbenchPage.tsx` |
| Accounting bridge not built | UAT docs; receipt `accounting_journal_id` |
| Invoice placeholder numbering | UAT readiness doc |
| ClaimsPanel monolith (~1200 lines) | `ClaimsPanel.tsx` |
| No E2E commission tests | — |

---

## 11. Reuse Analysis

| Feature | Classification |
|---------|----------------|
| Rule engine + Phase 1 RPCs | KEEP AS IS |
| Institution tab workspace | KEEP AS IS |
| Receipt wizard + RPCs | IMPROVE (add GL bridge) |
| Global `/commissions` dashboard | IMPROVE |
| `ClaimsPanel` | CONSOLIDATE (extract subcomponents) |
| CRM bridge | REBUILD when activating |
| Referral/B2B | CREATE (future) |

---

## 12. Extension Points

| Area | Exists | Missing |
|------|--------|---------|
| Multi-currency | Partial | Entity-level mapping |
| Aggregator | Yes | Type generation |
| CRM automation | Stub only | Event handlers |
| Finance GL | Column only | Journal creation |
| Referral/B2B/Agent | Not Found | Full domain |
| Clawback | Schema columns | Logic |

---

## 13. Cross-Module Dependencies

| Module | Interaction |
|--------|-------------|
| Institution | Host UI, routes, aggregators, documents |
| Client/CRM | `client_id`, counselor status view; auto-link stub |
| Admission | Planned bridge only |
| Finance | No live journal bridge |
| Performance Hub | Read-only ledger + FX |
| Auth | `commission_admin`, confidential RLS |
| CAE | Agreement templates, settlement types |

---

## 14. Migrations index

**Foundational:** `20260516010849`, `20260516033040`, `20260516051211`, `20260604140000`, `20260611100000`, `20260611130000`

**Phase 1:** `20260723120000` – `20260723120400`

**Phase 2A:** `20260801120000` – `20260801120300`

**Phase 2B:** `20260815120000` – `20260815120500`

**CAE (adjacent):** `20260753120000`

Full rollup: `docs/database/COMMISSION_SCHEMA.sql`
