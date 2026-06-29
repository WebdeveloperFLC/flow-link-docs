# FLEOS Sprint 4 — CAE Foundation Phase 2 Deliverable

**Status:** Implementation complete (local) · **NOT committed / NOT published**  
**Awaiting:** Architecture review before Settlement Engine phase

---

## 1. Files Modified

| File | Change |
|------|--------|
| `src/platform/cae/types.ts` | Extended — party, agreement, version, fraud, lifecycle types |
| `src/platform/cae/defaultCommercialAgreementConfig.ts` | Extended — party types, agreement types, cycles, existing customer rules, fraud checks, priority stack |
| `src/platform/cae/customerOwnershipRules.ts` | Integrated config-driven existing customer rules + fraud framework |
| `src/platform/cae/commercialAgreementEngine.ts` | Extended snapshot loading, agreement version resolution, fraud in audit |
| `src/platform/index.ts` | New CAE exports |

## 2. Files Created

| File | Purpose |
|------|---------|
| `supabase/migrations/20260754120000_cae_foundation_phase2.sql` | Universal registry tables + config seed + RLS |
| `src/platform/cae/financialPartyRegistry.ts` | Party registry + legacy adapters (client, counselor, institution, aggregator, vendor) |
| `src/platform/cae/commercialAgreementRegistry.ts` | Agreement/template CRUD, versioning, party linking |
| `src/platform/cae/agreementLifecycleService.ts` | Lifecycle transitions + EWE workflow on submit |
| `src/platform/cae/fraudDetectionService.ts` | Fraud detection framework (9 checks, config-driven) |
| `src/platform/cae/existingCustomerRules.ts` | Configurable existing-customer rule evaluation |
| `src/platform/cae/agreementPriority.ts` | Constitutional priority stack enforcement |
| `src/platform/cae/adapters/adapterStrategy.ts` | Legacy module → template mapping |
| `src/platform/platform.cae.phase2.test.ts` | 10 unit tests |
| `docs/fleos/SPRINT_4_CAE_PHASE2_DELIVERABLE.md` | This document |

---

## 3. New Tables

| Table | Purpose |
|-------|---------|
| `financial_parties` | Universal party registry (party_type = metadata only) |
| `commercial_agreement_templates` | Reusable config-driven templates |
| `commercial_agreements` | Agreement header + lifecycle status + adapter linkage |
| `commercial_agreement_versions` | Immutable contract terms (version 1, 2, 3…) |
| `commercial_agreement_parties` | Many-to-many party ↔ agreement |

**Extended (531):**

- `cae_eligibility_decisions` — + `financial_party_id`, `agreement_id`, `agreement_version_id`
- `cae_override_requests` — FK to `commercial_agreements`, + `agreement_version_id`

**RPC:** `fn_cae_resolve_agreement_version(agreement_id, as_of)`

---

## 4. New Services

| Service | API highlights |
|---------|----------------|
| `financialPartyRegistry` | `resolveOrCreateFinancialParty`, `resolveClientAsFinancialParty`, bridge helpers |
| `commercialAgreementRegistry` | `createAgreementFromTemplate`, `createAgreementVersion`, `linkPartyToAgreement`, `getAgreementByAdapter` |
| `agreementLifecycleService` | `transitionAgreementStatus`, `activateAgreementVersion`, `canTransitionAgreement` |
| `fraudDetectionService` | `evaluateFraudChecks` (pure, config-driven) |
| `existingCustomerRules` | `evaluateExistingCustomerRules` (pure, config-driven) |
| `agreementPriority` | `ownershipPrecedesAgreement`, `getPriorityStack` |

---

## 5. Existing Services Reused

| Service | Usage |
|---------|-------|
| EWE (`workflowEngine`, `persistWorkflowInstance`) | Agreement approval + ownership override workflows |
| FOE (`businessEventService`) | All registry mutations + eligibility decisions |
| Work Queue (`workQueueEngine`) | Pending agreement approval + override inbox |
| Platform Config (`platform_config`) | `commercial_agreement_config` expanded seed |
| SoD Engine | Ready for override approver ≠ requester (existing) |
| Transaction Lock Engine | Ready for settlement lock (future) |
| Notification Router | Ready for executive alerts (future) |
| Finance KPI Service | Ready for blocked-settlement KPIs (future) |
| CAE 531 | Extended — not replaced |

---

## 6. Adapter Strategy

Legacy modules **remain authoritative until migrated**:

| Legacy module | Adapter source | Template | Party bridge |
|---------------|----------------|----------|--------------|
| `clients` | `clients` | — | `resolveClientAsFinancialParty` |
| `profiles` | `profiles` | — | `resolveCounselorAsFinancialParty` |
| `upi_institutions` | `upi_institutions` | `university_commission` | `resolveInstitutionAsFinancialParty` |
| `upi_aggregators` | `upi_aggregators` | `aggregator_commission` | `resolveAggregatorAsFinancialParty` |
| `upi_agreements` | `upi_agreements` | `university_commission` | `getAgreementByAdapter()` |
| `incentive_plans` | `incentive_plans` | `incentive` | Future batch migration |
| `accounting_vendors` | `accounting_vendors` | `vendor_contract` | `resolveVendorAsFinancialParty` |

**Pattern:** `createAgreementFromTemplate({ adapterSourceModule, adapterSourceRecordId })` creates CAE row without touching legacy table.

---

## 7. Risk Analysis

| Risk | Severity | Mitigation |
|------|----------|------------|
| Migration 541 depends on 531 tables | Medium | Apply in order; 541 uses `IF NOT EXISTS` / `ADD COLUMN IF NOT EXISTS` |
| Config seed overwrites 531 `commercial_agreement_config` | Low | `ON CONFLICT DO UPDATE` merges expanded JSON; review in Lovable |
| Duplicate agreement detection uses party lookup | Low | Requires `financial_parties` populated; improves as adapters run |
| No UI for agreement management yet | Medium | Phase 2 is foundation-only; finance queue section TBD |
| Incentive run still calculates inline | Expected | Deferred to Settlement Engine phase |
| Version immutability trigger blocks edits | Low | By design; only draft versions editable |

---

## 8. UAT Checklist

### Migration (after publish approval)

- [ ] `financial_parties` created with RLS
- [ ] `commercial_agreement_templates` seeded (11 templates)
- [ ] `commercial_agreements` + versions + parties created
- [ ] `fn_cae_resolve_agreement_version` returns version for active agreement
- [ ] `platform_config.commercial_agreement_config` contains partyTypes, fraudChecks, existingCustomerRules

### Party registry

- [ ] `resolveClientAsFinancialParty(clientId)` creates idempotent row
- [ ] Second call returns same party (unique source_module + source_record_id)

### Agreement lifecycle

- [ ] Create agreement from `referral_agreement` template → status `draft`
- [ ] `transitionAgreementStatus(draft → submitted)` enqueues finance queue item
- [ ] Create version → activate → prior active version marked `superseded`
- [ ] Attempt UPDATE on active version → blocked by trigger

### Ownership + fraud (no settlement calc)

- [ ] Existing client with verified payment → `NOT ELIGIBLE`
- [ ] Self-referral signal → fraud reason in decision
- [ ] Override request → pending status blocks settlement gate
- [ ] Super Admin approve → `override_approved`

### Constitutional precedence

- [ ] Ownership evaluation runs before `resolveAgreementForSettlement`
- [ ] Blocked ownership never resolves agreement version

---

## 9. Proposed Migration

**File:** `supabase/migrations/20260754120000_cae_foundation_phase2.sql`

**Publish order:**

1. `20260750120000_foe_platform_foundation.sql` (if not applied)
2. `20260751120000_foe_platform_phase_c.sql` (if not applied)
3. `20260753120000_commercial_agreement_engine.sql` (applied)
4. **`20260754120000_cae_foundation_phase2.sql`** ← new

---

## 10. Items Deferred to Settlement Engine

| Item | Reason |
|------|--------|
| Settlement amount calculation | Explicitly out of Phase 2 scope |
| Settlement orchestrator pipeline | Awaits architecture review |
| Incentive/commission/referral calc adapters | Wrap existing engines behind Settlement Engine |
| Statement generation (referral, commission, freelancer…) | Requires calculated settlements |
| Dashboards (pending/blocked/upcoming) | Requires settlement runs + KPI wiring |
| Portal referral CAE gate | Requires settlement path integration |
| Legacy UPI/incentive batch migration to CAE | Adapter strategy defined; migration job deferred |
| Treasury / accounting posting from settlements | FOE handoff in Settlement Engine phase |
| Payroll / vendor payments | Out of Sprint 4 scope |

---

## Architecture flow (implemented)

```
Business Event
    ↓
Commercial Agreement Engine
    ├── Priority: Constitution → Ownership → Agreement
    ├── Ownership Evaluation (config-driven existing customer rules)
    ├── Fraud Detection (9 checks, framework only)
    ├── Eligibility Decision (cae_eligibility_decisions)
    └── Agreement Version Resolution (when eligible + agreementId)
    ↓
Settlement Calculation  ← DEFERRED
    ↓
EWE → FOE → Accounting  ← DEFERRED
```

---

## Tests

```
npm run test -- src/platform/platform.cae.test.ts src/platform/platform.cae.phase2.test.ts
```

**Result:** 17/17 passing
