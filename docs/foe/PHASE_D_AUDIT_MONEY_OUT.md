# FLEOS Phase D — Money Going Out (Vendor Bills & Payments)

## Audit Report · Gap Analysis · Reuse Plan

**Status:** Audit only — **no implementation**  
**Prerequisite:** Phases A–C approved (EWE + FOE platform)  
**Reference workflow:** Money Coming In (`money_in` domain)

---

## Executive Summary

The accounting module already has a **functional AP layer** (vendor bills, partial payments, journal leg builders, Supabase tables). It does **not** use the FLEOS platform (EWE/FOE) built in Phases A–C. Journals are often **posted immediately** on bill approval or payment, bypassing the mandated **Draft → Finance Approval → Posted** pipeline. Vendor detail views still rely on **mock data** for ledger, payments, and timeline.

Phase D should **wire existing AP into the platform**, mirroring Money Coming In — not build new engines. Estimated net-new platform surface: **one FOE orchestrator** (`moneyOutOrchestrator.ts`) plus **config extensions** and **thin accounting adapters**. No new queue, notification, SoD, or approval engines.

---

## 1. Audit Report

### 1.1 What exists today (AP / Vendors)

| Area | Location | Maturity | Platform-integrated? |
|------|----------|----------|----------------------|
| Vendor master | `accounting_vendors` + `vendorsStore.ts` | DB + localStorage hybrid | ❌ |
| Vendor bills | `accounting_ap_bills` + `apBillsStore.ts` | DB + localStorage hybrid | ❌ |
| Vendor payments | `accounting_ap_payments` + allocations | DB (Phase 1 migration) | ❌ |
| Bill accrual legs | `apPosting.apBillAccrualLegs()` | Production-quality | ❌ (not via FOE) |
| Payment legs | `apPosting.apPaymentLegs()` | Production-quality | ❌ |
| Payment orchestration | `postApPayment()` | Posts **POSTED** journal in one step | ❌ |
| Bill auto-accrual | `apBillsStore.autoPostAccrual()` | Legacy `addJournal` → **POSTED** | ❌ |
| Bill UI — list/new/detail | `AccountingAPPage`, `NewBill`, `BillDetail` | Usable | ❌ |
| Vendor UI — list | `AccountingVendorsPage` + store | Live vendors | Partial |
| Vendor UI — detail | `AccountingVendorDetailPage` | **Mock txns/docs/payments** | ❌ |
| Approvals | `AccountingApprovalsPage` | Mock chain + `PENDING_REVIEW` bills | ❌ |
| Expense categories | `mockAP.ExpenseCategory` (17 values) | Code-defined | ❌ |
| Payment methods | Hardcoded in `AccountingBillDetailPage` | 7 methods | ❌ |
| DB approval column | `accounting_ap_bills.approval_status` | Exists, **not wired** in store | ❌ |
| Finance queue | `FinanceWorkQueuePage` | Money In only | ❌ |
| KPIs | `financeKpiService` | AR / collections only | ❌ |

### 1.2 Money Coming In (reference — platform-integrated)

```
Bill/Payment record → startWorkflowForPayment (EWE)
  → createBusinessEvent (FOE)
  → onPaymentRecorded / runMoneyInOrchestrator
  → receipt + DRAFT journal → finance queue → approve & post
  → three statuses + SoD + notifications + pipeline jobs
```

Key files: `moneyInOrchestrator.ts`, `workflowEngine.ts`, `financeQueueService.ts`, `paymentVerification.ts`, `crmBridge.createPaymentDraftJournal()`.

### 1.3 Critical architectural gaps (vs Phase D spec)

| Requirement | Current AP behavior | Gap severity |
|-------------|---------------------|--------------|
| Three independent statuses | Single `status` + `approval_status` (unused in UI) | **High** |
| Draft journal before post | Accrual/payment journals **POSTED immediately** | **High** |
| EWE configurable approvals | One-click Approve on bill detail; mock multi-auditor page | **High** |
| Payment: approve ≠ release | Single `recordApBillPayment` → posted | **High** |
| Business events | None for AP | **High** |
| SoD (entry ≠ approve, etc.) | No checks | **High** |
| Finance work queue | No AP item kinds | **Medium** |
| Notifications | None for AP | **Medium** |
| Vendor timeline | None (clients have `appendTimeline`) | **Medium** |
| Transaction locking | Journal immutability exists; AP bills editable post-post | **Medium** |
| Cash SoD (2 users) | Not enforced for AP cash payments | **Medium** |
| Dashboard AP KPIs | Not in `financeKpiService` | **Low** |

### 1.4 What works well (keep)

- **`journalEngine.postJournal()`** with `sourceModule: "AP"` and role-based legs (`AP_TRADE`, `BANK_OPERATING`, TDS).
- **`accounting_ap_payment_allocations`** — partial/multi-bill payments already modeled.
- **Expense category → COA mapping** via `coaCategoryMap` / `linkedExpenseCOACode`.
- **Entity/branch scoping** on bills and payments.
- **Platform types** already declare `money_out` domain, `vendor` queue domain, and link types.

---

## 2. Gap Analysis

### 2.1 Workflow gaps

| Step (spec) | Exists? | Gap |
|-------------|---------|-----|
| Vendor → Bill | ✅ | No EWE instance, no business event |
| Bill → Approval workflow | ⚠️ Partial | `PENDING_REVIEW` → manual Approve; no sequential/parallel/multi-level |
| Approval → FOE | ❌ | No orchestrator |
| Draft accrual journal | ⚠️ | Auto-post POSTED on APPROVED |
| Payment request | ⚠️ | Payment dialog on bill; no separate payment entity workflow |
| Payment approval | ❌ | Missing |
| Payment release | ❌ | `postApPayment` posts immediately |
| Journal posted → GL | ✅ | Via journal engine |
| Vendor ledger | ❌ | Mock only on vendor detail |
| Dashboard | ⚠️ | Overview has AR KPIs only |
| Audit trail | ⚠️ | DB timestamps; no unified timeline |

### 2.2 Configuration gaps

| Config need | Money In pattern | AP today |
|-------------|------------------|----------|
| Expense category rules | N/A | Hardcoded `ExpenseCategory` enum |
| Payment method rules | `DEFAULT_PAYMENT_METHOD_CONFIGS` | Hardcoded `PAYMENT_METHODS` array |
| Approval definitions | `DEFAULT_WORKFLOW_DEFINITIONS` | None |
| SoD rules | `DEFAULT_SOD_RULES` | None for `money_out` |
| Notification rules | `DEFAULT_NOTIFICATION_RULES` | None for AP |
| DB override | `platform_config` | Empty seeds only |

### 2.3 Data model gaps

- No `business_event_id`, `business_status`, `workflow_status`, `accounting_status`, `lock_state` on `accounting_ap_bills` or `accounting_ap_payments`.
- `accounting_ap_payments.status` only: `DRAFT | POSTED | VOIDED` — missing `PENDING_APPROVAL`, `APPROVED`, `RELEASED` for release workflow.
- No vendor-scoped timeline table (client timeline pattern is `client_timeline_events` via `appendTimeline`).
- `approval_status` on bills (`PENDING/APPROVED/REJECTED`) duplicates concept of workflow status — must align with three-status model, not a fourth silo.

---

## 3. Reuse Analysis

### 3.1 Platform services — reuse as-is (no changes required)

| Service | AP usage |
|---------|----------|
| `businessEventService` | `domain: "money_out"`, `sourceModule: "AP"`, link bill/payment/journal |
| `workflowEngine.startWorkflow*` | New thin wrappers: `startWorkflowForApBill`, `startWorkflowForApPayment` |
| `workflowStepEngine` | Advance bill approval, accrual, payment approval, release, post steps |
| `approvalEngine.resolveApproverUserIds` | Bill approvers, payment approvers, journal approvers |
| `sodEngine.checkSod` | `domain: "money_out"` + action history from bill/payment rows |
| `transactionLockEngine` | Lock bill after approval; lock payment after release |
| `workQueueEngine.enqueueWorkItem` | AP-specific kinds via finance adapter |
| `notificationRouter` + `notificationChannelRegistry` | New event keys in config only |
| `platformConfigService` | Add config keys (see schema) |
| `pipelineJobService` + `foe-pipeline-tick` pattern | Post-release reconciliation |
| `journalEngine` + `apPosting` leg builders | Accrual/payment legs unchanged |
| `journalsStore.promoteJournalToPosted` | Finance approval step (same as Money In) |
| `bankReconciliationBridge` | Future: mark AP payment bank-reconciled |

### 3.2 Platform services — extend (not replace)

| Service | Extension |
|---------|-----------|
| `defaultWorkflowConfig.ts` / `platform_config` | `money_out_bill_*`, `money_out_payment_*` definitions + SoD + notifications |
| `financeQueueService` | Add AP fallback loaders + sections |
| `financeKpiService` | `outstandingAp`, `overdueAp`, `pendingBillApproval`, `pendingPaymentRelease` |
| `types/workQueue.ts` | New `WorkQueueItemKind` values (see schema) |
| `types/statuses.ts` | AP-specific business statuses if needed (or map to existing) |
| `types/businessEvent.ts` | Extend `linkType` if needed (`bill`, `payment` already cover via `other`) |

### 3.3 Justified net-new (domain orchestrators only)

| New file | Justification |
|----------|---------------|
| `src/platform/foe/moneyOutOrchestrator.ts` | Same role as `moneyInOrchestrator` — chains EWE completion → draft journals → queue → notify. **Not** a new engine. |
| `src/platform/foe/apStatusResolver.ts` | Mirror `paymentStatusResolver` for three statuses + DB/derived fallback. |
| `src/accounting/lib/apWorkflowBridge.ts` | Thin adapter: bill save → EWE/FOE (like CRM payment path). Keeps accounting UI decoupled. |

**Not justified:** new approval engine, new queue system, new notification system, new SoD module, new KPI framework.

### 3.4 Accounting code — modify (not rewrite)

| File | Change type |
|------|-------------|
| `apBillsStore.ts` | Replace auto-post with FOE calls; wire statuses |
| `apPosting.ts` | Split: create **DRAFT** journals; defer POSTED to orchestrator |
| `AccountingBillDetailPage.tsx` | Platform SoD gates; payment = request not release |
| `AccountingNewBillPage.tsx` | Start workflow + business event on submit |
| `AccountingAPPage.tsx` | Three-status badges; queue links |
| `AccountingVendorDetailPage.tsx` | Live bills/payments/journals from DB |
| `AccountingApprovalsPage.tsx` | Deprecate toward finance queue OR read-only legacy |
| `FinanceWorkQueuePage.tsx` | AP tabs/actions |
| `vendorsStore.ts` | Compute outstanding from bills (remove mock balances) |

---

## 4. Components Modified (planned — post-approval)

### 4.1 New files (minimal)

```
src/platform/foe/moneyOutOrchestrator.ts
src/platform/foe/apStatusResolver.ts
src/platform/foe/apPipelineRetry.ts          (optional; mirror pipelineRetry)
src/accounting/lib/apWorkflowBridge.ts
src/accounting/lib/apBillVerification.ts     (mirror paymentVerification pattern)
src/components/vendors/VendorFinancialTimelineStrip.tsx
src/components/vendors/VendorLedgerPanel.tsx
src/platform/platform.phase-d.test.ts
supabase/migrations/20260752120000_foe_money_out.sql
docs/foe/PHASE_D_DELIVERABLE.md
```

### 4.2 Modified files

```
src/platform/config/defaultWorkflowConfig.ts   (+ money_out configs)
src/platform/workQueue/financeQueueService.ts
src/platform/workQueue/workQueueEngine.ts      (+ enqueue helpers)
src/platform/types/workQueue.ts                (+ kinds)
src/platform/index.ts
src/accounting/stores/apBillsStore.ts
src/accounting/lib/apPosting.ts
src/accounting/pages/ap/*
src/accounting/pages/vendors/AccountingVendorDetailPage.tsx
src/accounting/pages/finance/FinanceWorkQueuePage.tsx
src/accounting/pages/AccountingOverviewPage.tsx
src/accounting/pages/approvals/AccountingApprovalsPage.tsx  (redirect/legacy)
```

---

## 5. Platform Services Reused (checklist)

- [x] Enterprise Workflow Engine (`workflowEngine`, `workflowStepEngine`)
- [x] Approval Engine (`approvalEngine`)
- [x] SoD Engine (`sodEngine`)
- [x] Transaction Lock Engine (`transactionLockEngine`)
- [x] Business Event Service (`businessEventService`)
- [x] Work Queue Engine + Finance adapter (`workQueueEngine`, `financeQueueService`)
- [x] Notification Router + Channel Registry
- [x] Platform Config Service (`platformConfigService`)
- [x] Pipeline Job Service (pattern from Money In)
- [x] Finance KPI Service (extend queries)
- [x] Journal Engine + AP posting legs (`journalEngine`, `apPosting`)
- [ ] Money Out Orchestrator (**new FOE module**, same pattern as Money In)

---

## 6. Proposed Schema Changes

Migration: `20260752120000_foe_money_out.sql` (proposed)

### 6.1 `accounting_ap_bills` — platform columns

```sql
ALTER TABLE accounting_ap_bills ADD COLUMN IF NOT EXISTS
  business_status text,
  workflow_status text,
  accounting_status text,
  business_event_id uuid REFERENCES foe_business_events(id),
  lock_state text NOT NULL DEFAULT 'draft',
  created_by_user uuid;  -- if not already tracked for SoD
```

Map legacy `status` + `approval_status` → three statuses during transition.

### 6.2 `accounting_ap_payments` — workflow columns

```sql
ALTER TABLE accounting_ap_payments ADD COLUMN IF NOT EXISTS
  business_status text,
  workflow_status text,
  accounting_status text,
  business_event_id uuid REFERENCES foe_business_events(id),
  lock_state text NOT NULL DEFAULT 'draft',
  approved_by uuid,
  approved_at timestamptz,
  released_by uuid,
  released_at timestamptz;

-- Extend status check (replace constraint):
-- DRAFT → PENDING_APPROVAL → APPROVED → RELEASED → POSTED → VOIDED
```

### 6.3 `platform_config` seeds

```json
{
  "config_key": "ap_expense_category_configs",
  "domain": "money_out"
}
{
  "config_key": "ap_payment_method_configs",
  "domain": "money_out"
}
{
  "config_key": "money_out_workflow_definitions",
  "domain": "money_out"
}
{
  "config_key": "money_out_sod_rules",
  "domain": "money_out"
}
{
  "config_key": "money_out_notification_rules",
  "domain": "money_out"
}
```

### 6.4 Work queue kinds (TypeScript + metadata)

Extend `WorkQueueItemKind`:

- `pending_ap_bill_approval`
- `pending_ap_payment_approval`
- `pending_ap_payment_release`
- `pending_ap_journal_approval`

### 6.5 SoD triggers (DB — mirror Phase C)

- Bill: `created_by` cannot set `approval_status = APPROVED`
- Payment: `approved_by` cannot equal `released_by` (when both set)
- Journal: payment approver cannot post same payment's journal

### 6.6 Vendor timeline

**Option A (preferred):** Reuse `appendTimeline` pattern with new `vendor_id` column on timeline table if exists, OR  
**Option B:** `vendor_timeline_events` table mirroring client timeline shape.

Audit note: confirm existing timeline table schema before implementation.

### 6.7 Pipeline jobs

Reuse `platform_foe_pipeline_jobs` with `job_type = 'money_out_post_release'`.

---

## 7. Risk Analysis

| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| Breaking existing AP auto-post behavior | High | High | Feature-flag via `platform_config`; parallel path until UAT |
| Dual status models (`status` vs three-status) | High | Medium | Resolver maps legacy; migrate incrementally |
| `apBillsStore` localStorage vs DB drift | Medium | Medium | FOE writes authoritative statuses to DB first |
| Vendor detail mock → live switch | Medium | Low | Compute ledger from `accounting_ap_bills` + payments |
| Payment release without Treasury | Low | Medium | Stub `released_at`; hook point for future Treasury API |
| Multi-level approval complexity | Medium | Medium | Use existing `workflowStepEngine`; config-driven steps only |
| Cash AP payments SoD | Medium | High | Reuse cash rules from Money In config pattern |
| Journal posted before approval (regression) | High | High | Change `postApPayment` to DRAFT-only; orchestrator gates POSTED |

---

## 8. UAT Checklist (for post-implementation)

### Bill lifecycle

- [ ] Create bill (goods/services/rent/utilities/pro fees) → business event + workflow instance
- [ ] Submit for approval → finance queue item + notification to configured role
- [ ] Recorder cannot approve own bill (SoD UI + DB)
- [ ] Approve bill → draft accrual journal (not POSTED)
- [ ] Finance approves journal → POSTED; AP balance updated
- [ ] Vendor detail shows bill without duplicate entry

### Payment lifecycle

- [ ] Record payment request against approved bill (partial allowed)
- [ ] Payment approval (different user) → queue item cleared
- [ ] Releaser ≠ approver (SoD)
- [ ] Release payment → draft payment journal
- [ ] Finance post → GL + bill `paid_amount` / status updated
- [ ] Cash payment requires second user verification (if configured)

### Platform reuse verification

- [ ] `platform_workflow_instances.step_states` advances on each milestone
- [ ] `foe_business_event_links` links bill, payment, journals
- [ ] Notifications fire via config event keys only
- [ ] No duplicate queue systems created
- [ ] Overview KPIs include outstanding AP

### Regression

- [ ] Money Coming In unchanged
- [ ] Manual journals still work
- [ ] TDS / input tax legs still balance
- [ ] Partial payments across multiple bills

---

## 9. Recommended implementation sequence (after approval)

1. **Config seed** — AP expense categories, payment methods, workflows, SoD, notifications in `platform_config` / code fallback.
2. **Schema migration** — three statuses + payment release states.
3. **`moneyOutOrchestrator`** — bill approved → draft accrual; payment released → draft payment journal.
4. **`apWorkflowBridge`** — wire `apBillsStore` create/approve/pay through EWE/FOE.
5. **Finance queue** — AP sections + actions.
6. **Vendor detail** — live ledger + timeline.
7. **KPI extension** — AP on overview.
8. **Pipeline jobs + SoD triggers** — production hardening (Phase C pattern).

---

## 10. Out of scope confirmation

Per spec, Phase D audit confirms these remain **excluded**:

- Treasury platform (release hook only)
- Payroll / revenue distribution / construction / trading modules
- Visual workflow designer
- WhatsApp / SMS channel implementation

---

**Awaiting explicit approval to begin Phase D implementation.**
