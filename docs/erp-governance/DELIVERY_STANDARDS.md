# ERP Delivery Standards

**Document type:** Platform-wide implementation handbook  
**Version:** 1.0  
**Date:** 30 June 2026  
**Applies to:** All ERP modules — Commission & Revenue Management, Performance Hub, HR Payroll, Finance, Admissions, Institutions, and future modules  
**Principle:** Frozen **business requirements** enable confident **delivery** — not delivery paralysis.

---

## Purpose

This document defines how Future Link ERP modules move from frozen architecture to production. Every module follows the same discipline after its business architecture is frozen.

**Reference modules (architecture frozen):**

| Module | Freeze declaration |
|--------|-------------------|
| Performance Hub | Architecture complete and frozen |
| Commission & Revenue Management | [Business Architecture V2.0](../commission/COMMISSION_BUSINESS_ARCHITECTURE_V2_FROZEN.md) |

---

## Critical distinction: what is frozen vs what is not

### Business requirements are frozen

After architecture freeze, **business behaviour** is defined in frozen requirements and Implementation Bible. Changing **what the system must do** requires an **ERP Change Request (RFC)**.

Examples requiring RFC:

- New lifecycle stage or business rule  
- New financial amount type or reconciliation rule  
- New actor or revenue model behaviour  
- Changing override, submission, or eligibility semantics  

### The freeze does NOT block engineering improvement

**Do not use “business architecture frozen” as a reason to reject:**

| Category | Examples | RFC required? |
|----------|----------|---------------|
| **UI/UX improvements** | Layout, labels (non-semantic), wizards, empty states, responsive fixes | **No** |
| **Performance optimizations** | Query indexes, pagination, lazy load, batch jobs | **No** |
| **Bug fixes** | Incorrect calculations vs frozen spec, broken workflows, data corruption | **No** (fix to match spec) |
| **Refactoring** | Extract components, RPC consolidation, deduplicate logic | **No** |
| **Component reuse** | Shared primitives, design system alignment | **No** |
| **Code quality** | Types, lint, naming, dead code removal | **No** |
| **Test coverage** | Unit, integration, UAT automation | **No** |
| **Security improvements** | RLS hardening, permission fixes, audit gaps | **No** |

If a change ** alters business behaviour** beyond the frozen spec → **RFC**.  
If a change **implements** the frozen spec better, faster, or more safely → **proceed**.

---

## Module delivery lifecycle (platform standard)

Every module should complete this sequence **before** sustained implementation:

```
1. Business discovery
2. Technical inventory (AS-IS)
3. Enterprise review (TO-BE gaps)
4. Implementation Bible
5. Business validation
6. Architecture freeze          ← business requirements locked
7. Implementation               ← THIS HANDBOOK governs from here
8. UAT
9. Production
```

After step 6, mindset shifts entirely to **delivery, validation, and iterative UAT** — not reopening architecture in every PR.

---

## Feature delivery loop (mandatory)

Do **not** stack features without validation. Use this loop for every feature:

```
Feature
  ↓
Demo
  ↓
Review
  ↓
UAT
  ↓
Approve
  ↓
Next Feature
```

| Step | Owner | Outcome |
|------|-------|---------|
| **Feature** | Engineering | Implementation against frozen spec + Bible |
| **Demo** | Engineering | Runnable demo with realistic data |
| **Review** | Domain expert / product owner | Catches business misunderstandings early |
| **UAT** | Business users | Checklist pass against frozen scenarios |
| **Approve** | Sponsor | Feature marked DONE; certificate issued |
| **Next Feature** | Engineering | Only after prior feature approved |

---

## Definition of Ready (DoR)

A feature may **start** implementation only when:

| # | Criterion |
|---|-----------|
| 1 | Business requirement exists in **frozen** module docs (Addendum / Bible / ERP Part) |
| 2 | Feature ID mapped in module **Traceability Matrix** |
| 3 | REUSE → EXTEND → CREATE decision recorded |
| 4 | Dependencies (migrations, RPCs, prior features) identified |
| 5 | Demo/UAT scenario drafted |
| 6 | No open RFC blocking the feature |

---

## Definition of Done (DoD)

A feature is **DONE** only when **all eight** gates pass. Not before.

```
Feature → [8 gates] → DONE
```

### 1. Business

- [ ] Matches frozen Business Architecture / Addendum  
- [ ] No behaviour beyond spec without RFC  
- [ ] Domain expert demo review completed  

### 2. Technical

- [ ] Matches module Implementation Bible  
- [ ] REUSE → EXTEND → CREATE documented in PR  
- [ ] RPC-mediated writes for financial/mutable data (where applicable)  

### 3. Database

- [ ] Migration reviewed (additive, forward-only, one concern)  
- [ ] Rollback strategy considered (feature flags, additive reversibility)  
- [ ] No SSOT violations (business rules not UI-only; Finance boundary respected)  
- [ ] Types regenerated after schema change  

### 4. Security

- [ ] RLS policies verified (including negative tests)  
- [ ] Permissions verified per role matrix  
- [ ] Confidential data scoping preserved (e.g. counselor views)  

### 5. UI

- [ ] Responsive (mobile + desktop breakpoints)  
- [ ] Empty states  
- [ ] Loading states  
- [ ] Error handling (actionable messages, no silent failures)  

### 6. Automation

- [ ] Notifications (where workflow requires)  
- [ ] Audit trail (where financial or approval mutation)  
- [ ] Events (where Finance or integration boundary applies)  

### 7. Testing

- [ ] Unit tests for business logic  
- [ ] Integration tests for RPC/workflow paths  
- [ ] UAT scenarios executed and signed off  

### 8. Documentation

- [ ] Traceability Matrix updated  
- [ ] Completion Certificate issued (module `PHASE_COMPLETION_CERTIFICATES/` or equivalent)  

**Only when every applicable checkbox is satisfied:** mark feature **DONE**.

---

## Architecture freeze policy

| Aspect | Policy |
|--------|--------|
| **What freezes** | Business entities, lifecycles, rules, workflows, configuration requirements |
| **What does not freeze** | Code structure, UI polish, performance, security hardening, tests |
| **Change mechanism** | ERP RFC → Bible version bump → re-freeze if approved |
| **Implementation** | Must implement frozen spec; may improve how without RFC |

Frozen architecture means **requirements stability**, not **code immobility**.

---

## Business freeze policy

| Rule | Detail |
|------|--------|
| **After freeze** | No new business requirements in implementation PRs |
| **RFC required for** | New rules, entities, lifecycles, financial semantics, actor behaviour |
| **RFC not required for** | Engineering improvements listed in “Critical distinction” above |
| **Bug vs RFC** | Bug = implementation diverged from frozen spec → **fix without RFC** |
| **Enhancement vs RFC** | Enhancement = new business capability → **RFC** |

---

## RFC process (ERP Change Request)

### When to open an RFC

- New or changed business rule  
- New lifecycle stage or actor behaviour  
- New financial field or reconciliation meaning  
- Scope expansion (new module integration affecting business semantics)  

### RFC minimum content

1. **Problem** — why frozen spec is insufficient  
2. **Proposed change** — rules, entities, workflows (business language)  
3. **Impact** — modules, migrations, UAT, regression  
4. **Decision** — approve / defer / reject  
5. **Doc update** — which frozen docs change (Addendum, Bible version)  

### RFC outcomes

| Outcome | Action |
|---------|--------|
| **Approved** | Update frozen docs → version bump → implement |
| **Deferred** | Backlog; no implementation |
| **Rejected** | Implement within existing spec |

RFC template location: `docs/erp-governance/` (extend when first RFC is filed).

---

## Coding standards

Platform defaults (module Bibles may add constraints):

| Area | Standard |
|------|----------|
| **Write path** | Business/financial mutations via RPC where module Bible requires |
| **SSOT** | Database + RPC for rules; UI reflects state, never leads it |
| **Types** | Regenerate Supabase types after migrations; avoid `as any` on financial tables |
| **Determinism** | TS preview calculators mirror SQL RPCs where module defines both |
| **Migrations** | Forward-only, additive, timestamped, one concern per file |
| **Feature flags** | New behaviour behind config where Bible specifies rollback |
| **PR discipline** | REUSE/EXTEND/CREATE stated; regression tests listed |
| **Design system** | shadcn/ui + module workspace patterns; no parallel component libraries |
| **Internal naming** | Use module internal names in docs (e.g. Commission & Revenue Management); preserve user-facing UI labels |

Module-specific coding standards remain in each **Implementation Bible** (e.g. §10–§11 Commission Bible V2).

---

## Testing standards

| Layer | Requirement |
|-------|-------------|
| **Unit** | Business logic, calculators, pure functions |
| **Integration** | RPC contracts, RLS, state transitions |
| **Security** | Role-based access SQL scripts where module provides them |
| **Regression** | Prior phase UAT subset must pass after each feature |
| **Parity** | Back-fill / migration parity gates per Bible (e.g. payee model) |

Tests prove **implementation matches frozen spec** — not a substitute for UAT.

---

## UAT standards

| Requirement | Detail |
|-------------|--------|
| **Scenarios** | Derived from frozen operational scenarios (Addendum §2 or equivalent) |
| **Data** | Realistic demo/mock data — not empty shells |
| **Walkthrough** | End-to-end actor journey (e.g. counselor + finance paths) |
| **Sign-off** | Named approver; failures block DONE |
| **Artifacts** | Checklist + completion certificate per feature/phase |

**Feature delivery loop:** Demo → Review → UAT → Approve before next feature.

---

## Release standards

| Step | Requirement |
|------|-------------|
| **Git** | `npm run ship` or equivalent; main + Lovable sync branch |
| **Migrations** | Lovable Publish; owner approves pending migrations |
| **Verify** | Push hash verified before claiming deployed |
| **Checklist** | Module publish checklist (e.g. `docs/LOVABLE_PUBLISH_CHECKLIST.md`) |
| **Communication** | Owner actions: Publish → hard refresh |
| **Rollback** | Feature flags first; no destructive migration rollback on financial data |

---

## Commission & Revenue Management — current delivery priority

Architecture is complete. **Delivery sequence** (domain expert recommendation):

| Order | Action | Rationale |
|-------|--------|-----------|
| **1** | **Close F3.4 properly** | UI smoke + security UAT + completion certificate |
| **2** | **Usable UI with realistic demo data** | Walkthrough reveals gaps before more backend |
| **3** | **End-to-end Direct Institution workflow** | Counselor + finance paths with frozen scenarios |
| **4** | **Then F3.3** | Backend investment after UX/workflow validated |

Do **not** jump to F3.3 before F3.4 close and Direct Institution walkthrough.

---

## Document control

| Version | Date | Change |
|---------|------|--------|
| 1.0 | 2026-06-30 | Initial platform delivery handbook |

**Maintained by:** Engineering + domain sponsor  
**Changes to this handbook:** Platform RFC or explicit owner approval (meta-governance — not module business RFC)

---

## Quick reference card

```
FROZEN  = business requirements (RFC to change)
NOT FROZEN = UI, perf, bugs, refactor, tests, security fixes

FEATURE DONE = Business + Technical + DB + Security + UI
               + Automation + Testing + Documentation

LOOP = Feature → Demo → Review → UAT → Approve → Next
```

*Shift mindset: architecture complete → deliver, validate, iterate.*
