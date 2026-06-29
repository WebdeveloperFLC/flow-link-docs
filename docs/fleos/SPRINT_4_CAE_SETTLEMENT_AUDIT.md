# FLEOS Sprint 4 — Commercial Agreement & Settlement Engine

## Phase 1 Audit · Gap Analysis · Implementation Plan

**Status:** Audit only — **awaiting approval before coding**  
**Prerequisite:** Phases A–C platform foundation (frozen architecture)  
**Constitution:** [CUSTOMER_OWNERSHIP_PROTECTION_CONSTITUTION.md](../governance/CUSTOMER_OWNERSHIP_PROTECTION_CONSTITUTION.md)

---

## Executive Summary

The codebase has **mature domain-specific settlement logic** (incentives, UPI commissions, referrals, AP vendors) but **no universal Commercial Agreement Engine**. Payments are still largely determined by **module-specific plans and tables**, not by a single agreement-centric model.

A **partial CAE slice** exists locally (customer ownership gate + settlement gate stub + DB RPC). It covers ~15% of the Sprint 4 spec. The approved architecture — ownership inside CAE, Settlement Engine always calls CAE first — is correct but **incomplete**.

**Recommendation:** Extend the partial CAE into a full agreement registry + settlement orchestrator **without redesigning** EWE, FOE, Work Queue, SoD, Business Events, or Platform Config.

---

## 1. Existing Components

### 1.1 FLEOS Platform (Phases A–C) — reuse as-is

| Service | Location | Sprint 4 use |
|---------|----------|--------------|
| Enterprise Workflow Engine | `src/platform/ewe/workflowEngine.ts`, `workflowStepEngine.ts`, `approvalEngine.ts` | Agreement approval, override workflow, settlement release |
| Financial Operations Engine | `src/platform/foe/moneyInOrchestrator.ts`, `businessEventService.ts`, `pipelineJobService.ts` | Post-settlement accounting handoff |
| SoD Engine | `src/platform/ewe/sodEngine.ts` | Override requester ≠ approver; record ≠ verify |
| Business Events | `foe_business_events` + `businessEventService.ts` | Immutable audit for eligibility + overrides |
| Work Queue | `workQueueEngine.ts`, `financeQueueService.ts` | Pending overrides, blocked settlements inbox |
| Notifications | `notificationRouter.ts`, `notificationChannelRegistry.ts` | Executive alerts, approver notifications |
| Platform Config | `platformConfigService.ts`, `platform_config` table | Agreement types, ownership rules, override roles, cycles |
| Transaction Lock | `transactionLockEngine.ts` | Lock settlement while override pending |

### 1.2 Partial CAE / Settlement (Sprint 4 in progress)

| Component | Location | Maturity |
|-----------|----------|----------|
| CAE eligibility API | `src/platform/cae/commercialAgreementEngine.ts` | Ownership snapshot + rule eval only |
| Ownership rules (pure) | `src/platform/cae/customerOwnershipRules.ts` | 6 block reasons; config-driven |
| Override service (stub) | `src/platform/cae/ownershipOverrideService.ts` | EWE + queue wired; no UI |
| Settlement gate | `src/platform/settlement/settlementEngine.ts` | CAE call only; **no calculation** |
| Edge shared module | `supabase/functions/_shared/cae/settlementEligibility.ts` | RPC + pure fallback |
| DB migration | `20260753120000_commercial_agreement_engine.sql` | Decisions, overrides, RPC (published) |
| Incentive gate | `incentive-calculate-run/index.ts` | CAE on payment/commission/QE paths |

### 1.3 Domain settlement engines (module-specific, not universal)

| Domain | Engine | Location |
|--------|--------|----------|
| Counselor incentives | Run calculator | `supabase/functions/incentive-calculate-run/index.ts` |
| Incentive rules (client mirror) | Slab/stack logic | `src/incentives/lib/incentiveEngineLogic.ts` |
| UPI institution commission | Simulator | `src/institutions/lib/commissionEngine.ts` |
| Commission eligibility | Deposit/visa/enrolled | `fn_evaluate_eligibility` RPC |
| Commission tracking KPIs | Ledger builder | `src/incentives/lib/commissionTrackingCmsLogic.ts` |
| Commercial profitability | CMS RPC | `fn_commercial_profitability` migration |
| Money In | Orchestrator | `moneyInOrchestrator.ts` |
| Money Out (AP) | Direct post | `apPosting.ts`, `apBillsStore.ts` — **not platform-integrated** |

### 1.4 UI surfaces (no CAE dashboards yet)

- Performance Hub / Incentive Plans — `PerformanceIncentivePlans.tsx`
- Finance Work Queue — `FinanceWorkQueuePage` (Money In only)
- Platform Workflow Config — `PlatformWorkflowConfigPage.tsx`
- Referral portal — `PortalRefer.tsx`
- Commission claims / aggregator statements — institutions module
- Executive KPIs — `PerformanceExecutiveKpiStrip`, `financeKpiService` (AR-focused)

---

## 2. Existing Tables

### 2.1 Agreement-like (fragmented, not universal)

| Table | Scope | Agreement fields |
|-------|-------|------------------|
| `upi_agreements` | Institution only | type enum (commission, mou…), valid_from/to, status |
| `upi_commissions` + `upi_commission_rules` | Institution commission models | model_type, slabs, effective dates |
| `upi_aggregators` | Aggregator master | agreement_status, valid_from/to |
| `upi_partnership_routes` | Institution ↔ aggregator/direct | route-specific commission |
| `incentive_plans` + `incentive_rules` + `incentive_slabs` | Counselor incentive | plan-scoped; not party-centric |
| `incentive_counselor_plan_assignments` | Period enrollment | assignment_role, plan_stack_role |
| `incentive_attribution_splits` | Client → counselor % | Not ownership protection |
| `upi_commission_eligibility_configs` | Commission trigger rules | deposit/visa/enrolled |
| `commercial_autoapply_policy` | CMS auto-apply | Policy rows, not agreements |
| `platform_config` | Key-value config | `commercial_agreement_config` seed |

**Missing:** Universal `commercial_agreements` table with party_id, agreement_type (config-driven), company, branch, payment basis, settlement cycle, workflow, tax, payment method.

### 2.2 Settlement / payout tables

| Table | Purpose |
|-------|---------|
| `incentive_runs`, `incentive_line_items`, `incentive_adjustments` | Counselor settlement runs |
| `incentive_qualifying_events` | Milestone/payment events feeding runs |
| `upi_commission_students` | Per-student commission lifecycle |
| `commission_receipts`, remittance batches | Commission money-in |
| `referrals`, `credit_wallet`, `point_transactions`, `point_redemptions` | Referral points |
| `accounting_ap_bills`, `accounting_ap_payments` | Vendor outflows |
| `cae_eligibility_decisions`, `cae_override_requests` | Ownership audit (new) |

### 2.3 Party / entity tables (no unified Party model)

| Entity | Table | Notes |
|--------|-------|-------|
| Student/client | `clients` | CRM primary party for students |
| Parent | Often same client record or linked | No dedicated parent party table |
| Counselor | `profiles` + `user_roles` | Incentive payee |
| Institution | `upi_institutions` | Commission partner |
| Aggregator | `upi_aggregators` | Indirect channel |
| Vendor | `accounting_vendors` | AP only |
| Employee | HR payroll tables | Out of Sprint 4 scope |
| Freelancer / consultant | **None dedicated** | HR has employment_type `consultant` only |

**Gap:** Sprint 4 requires reusable Party model — today parties are **implicit per module**.

### 2.4 Platform tables (published)

- `foe_business_events`, `foe_business_event_links`
- `platform_workflow_instances`, `platform_work_queue_items`
- `platform_config`, `platform_foe_pipeline_jobs`
- `foe_cash_registers`

---

## 3. Existing Calculations

| Calculation | Where | Inputs | Output |
|-------------|-------|--------|--------|
| Incentive slabs | Edge fn + `incentiveEngineLogic.ts` | Verified payments, commissions, QEs, rules, FX | `earned_amount` line items |
| Rule stacking | additive/exclusive/cap | Multiple rules per counselor | Single payout total |
| Target bonus | incentive run | Achievement % vs target | Bonus line |
| Discount penalty | incentive run | Gross vs net revenue | Penalty adjustment |
| Campaign/contest overlays | incentive run | Qualifying events, campaigns | Bonus lines / wallet topup |
| UPI commission simulate | `commissionEngine.ts` | Rules + tuition input | Payout breakdown |
| Commission eligibility | `fn_evaluate_eligibility` | Student commission row + config | eligible + reason |
| Commission snapshot | `fn_create_commission_snapshot` | Breakdown JSON | Immutable expected amount |
| Commercial profitability | `fn_commercial_profitability` | Revenue, cost, incentive share | Margin KPIs |
| Referral points | Manual / status on `referrals` | joined status | `points_earned` |
| CAE ownership | `fn_cae_evaluate_settlement_eligibility` | client_id, prior payments | eligible / not_eligible |

**Critical gap:** Calculations run **inside domain engines**. Settlement Engine does not yet orchestrate calculation — only gates on ownership.

---

## 4. Existing Referral Logic

| Piece | Location | Ownership gate? |
|-------|----------|-----------------|
| Portal refer UI | `PortalRefer.tsx` | ❌ Inserts referral with name/email/phone only |
| Referrals table | `referrals` | status: joined/pending/invalid; points_earned |
| Credit wallet | `credit_wallet`, `point_transactions` | Points ledger; no CAE |
| Redemption | `point_redemptions` + validate trigger | Min 50 points; admin approve |
| Referral link | `/portal/auth?ref=` | No duplicate/existing-client check |

**Fraud not implemented:** existing FL customer as referral, self-referral, duplicate referral, counselor claiming assigned student.

---

## 5. Existing Commission Logic

| Layer | Details |
|-------|---------|
| Master data | Institutions, agreements, commission models, rules, slabs |
| Routes | Direct vs indirect via `upi_partnership_routes` + aggregators |
| Student lifecycle | `upi_commission_students` — status machine (pending → eligible → paid) |
| Eligibility | Config-driven triggers (deposit, visa, enrolled) — **not** customer ownership |
| Receipts | Phase 1 commission receipts, remittance batches, aggregator invoices |
| Statements | `commission_aggregator_statement_storage` — aggregator-facing |
| Incentive feed | Paid commissions flow into `incentive-calculate-run` as revenue source |

**Attribution vs ownership:** `fn_incentive_resolve_client_attribution` picks **which counselor** gets credit — orthogonal to CAE.

---

## 6. Existing Freelancer Logic

**No dedicated freelancer settlement module exists.**

| Related | Notes |
|---------|-------|
| HR `employment_type = consultant` | Payroll classification only — Sprint 4 excludes payroll |
| `accounting_vendors` | Could pay freelancers as vendors — AP path, not agreement-based |
| Incentive plans | Could theoretically target roles — not freelancer-specific |

**Gap:** Freelancer agreements, hourly/daily rules, freelancer statements — **greenfield** on top of CAE.

---

## 7. Existing Aggregator Logic

| Piece | Location |
|-------|----------|
| Aggregator master | `upi_aggregators` |
| Partnership routes | `upi_partnership_routes` (institution + aggregator + channel) |
| Route slabs / fee waiver | `20260611110000_partnership_route_slabs_and_fee_waiver.sql` |
| Commission claims (aggregator scope) | `20260815120400_commission_claim_cycles_aggregator_scope.sql` |
| Aggregator invoices | `20260815120000_commission_aggregator_invoices.sql` |
| Metrics views | `20260815120200_commission_aggregator_metrics_views.sql` |
| Statement storage | `20260815120500_commission_aggregator_statement_storage.sql` |

Aggregators are **institution-channel partners**, not universal financial parties. Commission settlement is UPI-scoped, not CAE-scoped.

---

## 8. Reuse Plan

### 8.1 Reuse without modification

- EWE, FOE, SoD, Business Events, Work Queue, Notifications, Platform Config
- `ApplicationDuplicateWarningDialog` pattern for override UX
- `moneyInOrchestrator` pattern for settlement → accounting handoff
- Existing domain calculators as **adapters** behind Settlement Engine (Phase 2+)

### 8.2 Extend (do not replace)

| Asset | Extension |
|-------|-----------|
| `platform_config` | Agreement type registry, ownership rule catalog, override roles, settlement cycles |
| `commercialAgreementEngine.ts` | Full agreement CRUD, multi-agreement per party, rule binding |
| `settlementEngine.ts` | Orchestration pipeline: event → CAE → calc adapter → EWE → FOE |
| `cae_eligibility_decisions` | Keep; add agreement_id FK when universal agreements exist |
| `incentive-calculate-run` | Replace inline calc with Settlement Engine calls (incremental) |
| `fn_cae_evaluate_settlement_eligibility` | Enrich snapshot; wire configurable existing-customer definitions |

### 8.3 Wrap (adapters, not rewrite)

| Domain engine | Adapter role |
|---------------|--------------|
| `incentive-calculate-run` | `IncentiveSettlementAdapter` |
| `commissionEngine` + commission RPCs | `CommissionSettlementAdapter` |
| Referral points | `ReferralSettlementAdapter` |
| Future freelancer | `FreelancerSettlementAdapter` |

### 8.4 Do not build (per spec)

- Payroll, Treasury, Vendor Payments orchestration, Construction, Trading
- Workflow Designer, Visual Rule Builder

---

## 9. Gap Analysis

| Sprint 4 requirement | Current state | Severity |
|---------------------|---------------|----------|
| Universal Commercial Agreements (multi per party) | Fragmented UPI/incentive tables | **Critical** |
| Config-driven agreement types (no hardcode) | Enums in UPI; incentive source_type enum | **Critical** |
| Settlement Engine never calculates directly | Partial gate only; calc in edge fns | **Critical** |
| Business Event → CAE → Eligibility → Calc → EWE → FOE → Accounting | Only CAE gate on incentives | **Critical** |
| Customer ownership in CAE (not separate engine) | Partial — rules + RPC + incentive gate | **High** (extend) |
| Configurable existing-customer definitions | 3 hardcoded SQL checks in RPC | **High** |
| Override workflow (Super Admin default) | Service stub; no UI; partial RLS | **High** |
| Commercial rules (fixed, %, hourly, per student…) | Spread across incentive slabs, UPI rules | **High** |
| Settlement cycles (immediate, monthly, on visa…) | Implicit in plans/triggers; not unified | **High** |
| Fraud protection (9 scenarios) | ~3 ownership rules; rest missing | **High** |
| Unified Party model | Module-specific entities | **High** |
| Statements (referral, commission, freelancer…) | Aggregator statements only; no universal | **Medium** |
| Dashboards (blocked, pending, conflicts…) | Not built | **Medium** |
| Constitutional precedence (ownership > agreement) | Designed; not fully enforced everywhere | **High** |
| Payments determined by agreements not party type | Not true today | **Critical** |

### Partial implementation note

Migrations **501**, **511**, **531** are published. CAE RPC is live. Incentive run has CAE gate in code (requires edge function deploy). Override UI and non-incentive paths remain ungated.

---

## 10. Proposed Implementation Plan

**Principle:** Incremental layers on frozen platform. No engine redesign.

### Phase 1 — Agreement registry (after audit approval)

1. Migration: `commercial_agreements`, `commercial_agreement_parties`, `commercial_agreement_rules` (config-driven types via `platform_config`)
2. Party bridge: map `clients`, `profiles`, `upi_institutions`, `upi_aggregators`, `accounting_vendors` → `financial_parties` view/table (thin registry, no special-case code per type)
3. CAE API: `resolveAgreements(partyId, asOfDate)`, `getActiveAgreement(event, party)`
4. Platform config seeds: agreement types, settlement cycles, payment basis enums

### Phase 2 — Settlement Engine orchestration

1. `settlementOrchestrator.ts`: Business Event in → CAE eligibility → agreement selection → adapter calc → proposed settlement rows
2. Adapters: incentive (wrap existing edge fn logic), commission, referral
3. EWE: settlement approval workflow instance per run/batch
4. FOE: business events + optional draft accounting entries (reuse money-in patterns)

### Phase 3 — Ownership & fraud hardening

1. Configurable existing-customer definitions (client, student, parent, corporate…)
2. Fraud rules: duplicate referral, self-referral, counselor-own-student, duplicate agreements
3. Override UI in finance queue (reuse duplicate-application pattern)
4. Gate all paths: referrals, commission claims, wallet credit, qualifying events

### Phase 4 — Statements & dashboards

1. Statement generators per agreement type (PDF/data RPC)
2. Finance dashboard widgets: pending/blocked/upcoming settlements
3. Executive alerts via notification router

### Phase 5 — Remaining domains (future sprints)

- Freelancer/consultant agreements
- Revenue share / partner fee generalization
- Treasury handoff stub

---

## Approval checklist

Before coding:

- [ ] Confirm universal `commercial_agreements` schema vs wrapping existing UPI/incentive tables
- [ ] Confirm Party registry approach (new table vs polymorphic references)
- [ ] Confirm Phase 1 scope: registry + ownership only vs include first adapter (incentive)
- [ ] Confirm partial CAE (531) is baseline — extend, not rewrite
- [ ] Approve migration numbering and Lovable publish sequence

---

## Related documents

- [CUSTOMER_OWNERSHIP_PROTECTION_CONSTITUTION.md](../governance/CUSTOMER_OWNERSHIP_PROTECTION_CONSTITUTION.md)
- [CUSTOMER_OWNERSHIP_PROTECTION_AUDIT.md](../governance/CUSTOMER_OWNERSHIP_PROTECTION_AUDIT.md)
- [PHASE_D_AUDIT_MONEY_OUT.md](./PHASE_D_AUDIT_MONEY_OUT.md)
- Platform Phase C: `docs/foe/PHASE_C_DELIVERABLE.md` (if present)
