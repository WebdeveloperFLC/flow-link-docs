# Customer Ownership Protection — Constitutional Compliance Audit

**Status:** Implementation in progress (Commercial Agreement Engine) · **Not shipped**  
**Policy:** [CUSTOMER_OWNERSHIP_PROTECTION_CONSTITUTION.md](./CUSTOMER_OWNERSHIP_PROTECTION_CONSTITUTION.md) (frozen)

> **Architecture (approved):** Customer Ownership & Attribution is a **core rule within the Commercial Agreement Engine (CAE)**, not a standalone Customer Attribution Engine. The **Settlement Engine** always requests an eligibility decision from CAE before creating settlements. Default for existing Future Link customers: **NOT ELIGIBLE**. Override authority is configuration-driven (default: Super Admin only; optional Finance Admin/Accountant).

---

## Implementation map (CAE)

| Component | Location | Role |
|-----------|----------|------|
| Commercial Agreement Engine | `src/platform/cae/commercialAgreementEngine.ts` | Ownership rules + eligibility API |
| Customer ownership rules | `src/platform/cae/customerOwnershipRules.ts` | Pure rule evaluation (default NOT ELIGIBLE) |
| Settlement Engine | `src/platform/settlement/settlementEngine.ts` | Always calls CAE before settlement |
| Override workflow | `src/platform/cae/ownershipOverrideService.ts` | Config-driven Super Admin / Finance override |
| DB RPC + audit | `supabase/migrations/20260753120000_commercial_agreement_engine.sql` | `fn_cae_evaluate_settlement_eligibility`, immutable decisions |
| Incentive run gate | `supabase/functions/incentive-calculate-run/index.ts` | CAE check on payment/commission/qualifying paths |

---

## 1. Audit Report

### 1.1 What exists today (related systems)

| System | Location | What it does | Meets constitution? |
|--------|----------|--------------|---------------------|
| Incentive attribution | `fn_incentive_resolve_client_attribution` | Resolves **which counselor** earns credit (closer/owner/assignee) | ❌ Not ownership protection |
| Split attribution | `incentive_attribution_splits` | Multi-counselor share (e.g. 50/50 handoff) | ❌ |
| Incentive calculation | `incentive-calculate-run` edge function | Builds settlement line items from payments, commissions, enrolments | ❌ No existing-customer gate |
| Commission eligibility | `fn_evaluate_eligibility` / `commissionEligibilityEvaluator.ts` | Deposit/visa/enrolled triggers | ❌ Not customer ownership |
| Referrals (portal) | `referrals` table + `PortalRefer.tsx` | Client refers friend; status pending/joined/invalid | ❌ No auto-block for existing FL client |
| Client portal referral insert | RLS: portal user or `can_edit_client` | Counselors can update referral rows | ⚠️ No SoD / override workflow |
| Attribution lock | `clients.incentive_attribution_locked` | Locks incentive attribution changes | ⚠️ Partial; not eligibility gate |
| Application duplicate guard | `ApplicationDuplicateWarningDialog` + DB override columns | Blocks duplicate applications; **mandatory reason** + elevated override | ✅ **Pattern match** for override workflow |
| WhatsApp lead type | `existing_client` in whatsapp types | Classification label only | ❌ No settlement block |
| Performance Hub fraud | `performance-hub-prototype-gaps.md` O9 | Self-referral, duplicate device — **not built** | ❌ |
| FLEOS platform (A–C) | EWE, FOE, SoD, business events, work queue | Money In / AP foundation | ✅ Reusable for override workflow |
| Executive dashboard | `PerformanceExecutiveKpiStrip`, profitability views | Revenue/incentive KPIs | ❌ No ownership override alerts |

### 1.2 Critical finding (addressed by CAE design)

There is **no standalone Customer Attribution Engine** — by design. Ownership protection runs inside the **Commercial Agreement Engine** before the **Settlement Engine** creates any payout.

The similarly named `fn_incentive_resolve_client_attribution` answers a **different question**: “who gets paid?” not “should anyone be paid?” CAE answers the latter.

### 1.3 Settlement paths that must be gated (inventory)

| Path | Trigger | Gate today? |
|------|---------|-------------|
| Incentive run line items | `incentive-calculate-run` | ❌ |
| Incentive qualifying events | DB triggers / `fn_incentive_*` | ❌ |
| Commission student settlement | UPI commission claims / receipts | ❌ |
| Referral points | `referrals` → wallet credit | ❌ |
| Partner / referral AP bills | `accounting` PARTNER category | ❌ |
| Wallet / offer incentives | Offer redemption → qualifying event | ❌ |
| HR payroll incentive pull | `fn_pull_incentives` | ❌ (downstream of ungated payouts) |

---

## 2. Gap Analysis

| Constitutional requirement | Gap | Severity |
|---------------------------|-----|----------|
| Auto eligibility check before **any** settlement | No central pre-settlement hook | **Critical** |
| Status = Not Eligible blocks payment | Payments proceed independently | **Critical** |
| Override only Super Admin / Finance Admin | No role gate on settlement override | **Critical** |
| Override workflow (no direct edit) | Application duplicate pattern exists; not used for referrals/settlements | **High** |
| Mandatory business reason | Partial (application duplicate only) | **High** |
| Immutable audit + Business Event ID | FOE `businessEventService` exists; not wired | **High** |
| Executive dashboard alerts | Not implemented | **High** |
| Fraud: existing student as new referral | Not detected | **High** |
| Fraud: duplicate referral / multi-party claim | Not detected | **High** |
| Managers cannot override | Managers can approve AP/incentives in some flows | **Medium** |
| Continuing relationship detection | No canonical “relationship continuity” rule | **Medium** |
| Active commercial agreement check | No cross-module agreement index | **Medium** |

---

## 3. Reuse Analysis

### 3.1 Reuse as-is (FLEOS platform)

| Service | Use for ownership protection |
|---------|------------------------------|
| `businessEventService` | Immutable override audit records + correlation ID |
| `workflowEngine` + `workflowStepEngine` | Override request → approve → release settlement |
| `approvalEngine` | Resolve Super Admin / Finance Admin approvers |
| `sodEngine` | Block requester = approver; block counselor/partner override |
| `workQueueEngine` + `financeQueueService` | “Pending ownership override” inbox |
| `notificationRouter` | Alert approvers + executive dashboard feed |
| `platformConfigService` | Eligibility rules, role mapping, fraud scenarios |
| `transactionLockEngine` | Lock settlement row while override pending |

### 3.2 Reuse as pattern (not new invention)

| Existing pattern | Reuse for |
|------------------|-----------|
| `ApplicationDuplicateWarningDialog` | Override UI: block → reason → submit request |
| `cf_client_programs.duplicate_override_*` columns | Schema template for override audit fields |
| `allow_duplicate_override` RPC params | API contract for gated release |
| Money In SoD (recorder ≠ verifier) | Same engine, `domain: "customer_ownership"` |
| `foe-pipeline-tick` / `pipelineJobService` | Retry settlement after override approved |

### 3.3 Justified net-new (minimal)

| Component | Justification |
|-----------|---------------|
| **Customer Attribution Engine** (`customerAttributionEngine.ts`) | Single pre-settlement gate required by constitution; **not** a duplicate of EWE — it is a **domain eligibility resolver** (like `commissionEligibilityEvaluator` but for ownership). |
| **`customerOwnershipService.ts`** | Encapsulates four YES/NO checks + fraud heuristics; callable from edge functions and RPC. |
| **`ownershipOverrideOrchestrator.ts`** | FOE orchestrator for override workflow completion → release settlement (mirrors `moneyInOrchestrator` scope). |

**Not justified:** new approval engine, new notification system, new audit store, new dashboard framework.

---

## 4. Components Modified (planned — post-approval)

### 4.1 New (proposed)

```
src/platform/cae/customerAttributionEngine.ts      # eligibility gate
src/platform/cae/customerOwnershipService.ts       # four checks + fraud rules
src/platform/cae/ownershipOverrideOrchestrator.ts  # FOE override release
src/platform/config/defaultOwnershipConfig.ts      # rules seed
src/incentives/lib/settlementEligibilityGate.ts    # adapter before line items
supabase/migrations/20260753120000_customer_ownership_protection.sql
docs/governance/CUSTOMER_OWNERSHIP_PROTECTION_AUDIT.md (this file)
```

### 4.2 Modified (touch points)

```
supabase/functions/incentive-calculate-run/index.ts   # gate before line items
src/incentives/* payout / settlement UI
src/pages/portal/PortalRefer.tsx                      # block + redirect to staff workflow
src/institutions/* commission claim paths
src/platform/config/platformConfigService.ts          # ownership config keys
src/platform/workQueue/financeQueueService.ts         # override queue section
src/components/performance/*                          # executive alert strip
commission / referral RPCs and triggers
```

---

## 5. Platform Services Reused

- [x] Enterprise Workflow Engine
- [x] Approval Engine (Super Admin / Finance Admin specs)
- [x] SoD Engine (`record`/`approve` pairs for override)
- [x] Business Event Service (immutable audit)
- [x] Work Queue + Finance adapter
- [x] Notification Router + Channel Registry
- [x] Platform Config Service
- [ ] Customer Attribution Engine (**new gate**, uses platform — not a rewrite)

---

## 6. Proposed Schema Changes

Migration: `20260753120000_customer_ownership_protection.sql`

### 6.1 `customer_ownership_decisions` (immutable audit)

```sql
-- One row per eligibility evaluation or override decision
id, client_id, agreement_id, source_module, source_record_id,
decision text NOT NULL,  -- 'eligible' | 'not_eligible' | 'override_pending' | 'override_approved' | 'override_rejected'
reason_code text,        -- 'existing_customer' | 'assigned_to_fl' | 'continuing_relationship' | 'active_agreement' | ...
business_reason text,    -- mandatory on override
original_ownership jsonb,
previous_decision text,
new_decision text,
approver_id uuid,
business_event_id uuid REFERENCES foe_business_events(id),
supporting_document_paths jsonb,
created_at timestamptz NOT NULL DEFAULT now(),
created_by uuid
-- NO UPDATE/DELETE (append-only via trigger)
```

### 6.2 `customer_ownership_override_requests`

```sql
id, client_id, settlement_type, settlement_source_id,
status text,  -- pending | approved | rejected | released
requested_by uuid, approved_by uuid, rejected_by uuid,
business_reason text NOT NULL,
metadata jsonb,
business_event_id uuid,
workflow_instance_id uuid REFERENCES platform_workflow_instances(id)
```

### 6.3 Extend settlement tables (link only)

- `incentive_line_items.eligibility_status` + `ownership_decision_id`
- `referrals.eligibility_status` + block auto points when `not_eligible`
- `upi_commission_students` / claim rows — same pattern

### 6.4 `platform_config` seeds

- `customer_ownership_rules` — four check definitions + active agreement sources
- `customer_ownership_sod_rules`
- `customer_ownership_notification_rules`
- `customer_ownership_override_workflow` — EWE definition id

### 6.5 Eligibility resolver function

```sql
fn_evaluate_customer_ownership(_client_id uuid, _context jsonb)
RETURNS jsonb  -- { eligible: bool, status: 'eligible'|'not_eligible', reasons: [], decision_id: uuid }
```

Called from:
- `incentive-calculate-run` (before each line item)
- Referral join webhook / client create
- Commission claim submit
- Any future settlement RPC

---

## 7. Risk Analysis

| Risk | Impact | Mitigation |
|------|--------|------------|
| False positive blocks legitimate new referral | High | Configurable rules; override workflow; test vectors per scenario |
| False negative pays existing customer | Critical | Conservative defaults; audit all releases |
| Performance on large incentive runs | Medium | Batch eligibility cache per client_id per run |
| Retroactive clawback | High | Constitution applies forward; document policy for historical payouts |
| Manager role confusion | Medium | Explicit deny list in SoD config; DB enforce on override RPC |
| Multiple modules bypass gate | Critical | Single RPC gate; edge functions must call it — no direct line-item inserts |

---

## 8. UAT Checklist (post-implementation)

### Eligibility gate

- [ ] Existing client with prior verified payment → incentive line **not created**
- [ ] New client → eligible → settlement proceeds
- [ ] Client with active commission agreement → referral incentive blocked
- [ ] Continuing student (same client_id, new program) → blocked unless override

### Override workflow

- [ ] Counselor cannot approve override (UI + API + DB)
- [ ] Manager cannot approve override
- [ ] Partner cannot approve override
- [ ] Super Admin / Finance Admin can **request** override with mandatory reason
- [ ] Second finance approver can approve (SoD if configured)
- [ ] No direct edit of settlement amount to bypass gate

### Audit

- [ ] Every override creates immutable `customer_ownership_decisions` row
- [ ] Business Event ID populated and linked in FOE
- [ ] Supporting documents attached and immutable

### Dashboard

- [ ] Executive view shows override approved/rejected
- [ ] Referral blocked alert visible
- [ ] Duplicate referral / ownership conflict alerts

### Fraud scenarios

- [ ] Existing student submitted as new referral → auto blocked
- [ ] Duplicate referral same email/phone → blocked
- [ ] Two partners claim same client → conflict detected

### Regression

- [ ] Money In / Money Out workflows unchanged
- [ ] Incentive runs for genuinely new clients unchanged
- [ ] Application duplicate override still works independently

---

## 9. Relationship to Phase D (Money Going Out)

Customer ownership protection is **orthogonal** to AP vendor bills but may intersect when:

- Partner/referral fees post through AP (`PARTNER` expense category)
- Incentive payouts link to `accounting_ap_bills` / `incentive_payouts`

**Rule:** Phase D payment orchestration must call Customer Attribution Engine before any **referral/partner/incentive** settlement line — not before ordinary vendor utilities/rent.

---

## 10. Recommended implementation sequence

1. **Constitution doc** in repo (done) + config seed  
2. **`fn_evaluate_customer_ownership`** + decision audit table  
3. **`customerAttributionEngine.ts`** + unit tests with frozen test vectors  
4. **Gate `incentive-calculate-run`** (highest volume path)  
5. **Override workflow** via EWE + finance queue  
6. **Referral portal + commission paths**  
7. **Executive dashboard alerts**  
8. **Fraud heuristics** (duplicate referral, multi-party claim)

---

**Awaiting explicit approval to implement.**  
**Do not proceed without constitutional sign-off on eligibility rules and override roles.**
