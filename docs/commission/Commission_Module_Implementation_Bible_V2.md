# Commission & Revenue Management — Implementation Bible V2

| Field | Detail |
|-------|--------|
| **Document type** | Implementation specification (build-from) |
| **Internal module name** | **Commission & Revenue Management** (UI label: *Commission*) |
| **Version** | **v2.0 — 30 June 2026** |
| **Supersedes** | Implementation Bible v1.0 (`Commission module claude files/Commission_Module_Implementation_Bible.txt`) |
| **Primary consumer** | Cursor / AI-assisted implementation; secondary: human engineers |
| **Governs** | Commission & Revenue Management build Phases 3–6 (post AS-IS Phases 1–2B) |
| **Business SSOT** | [Commission Business Requirements Addendum V1.1](./COMMISSION_BUSINESS_REQUIREMENTS_ADDENDUM_V1.1.md) — **FROZEN** |
| **Guiding principle** | REUSE → EXTEND → CREATE |
| **Status** | **APPROVED & FROZEN** — Business Architecture V2.0; implementation may continue |

---

## V2.0 Changelog (from v1.0)

| Change | Section | Description |
|--------|---------|-------------|
| **Merged** | Appendix A | Full incorporation of Business Requirements Addendum V1.1 (§1–§10) |
| **Added** | §1.4 | Commission Business Domain Model (Business SSOT) — from Addendum §9 |
| **Added** | §1.5 | ERP Commission Glossary — from Addendum §10 |
| **Extended** | §2 | Crosswalk: Addendum business rules (BR-*) align with non-negotiable rules (NN-*) |
| **Added** | §8.5 | Phase 3B / Phase 4 business capability extensions (P0/P1 from Addendum) |
| **Updated** | §12 | Phase 3 resume gate; business capability track sequencing |
| **Added** | §1.6–§1.7 | Student business lifecycle + Referral partner lifecycle (Addendum §1.6a, §1.11) |
| **Added** | §17 | Phase 3 resume gate — **APPROVED 2026-06-30** |
| **Renamed** | — | Internal module: **Commission & Revenue Management** (UI unchanged) |

**Unchanged from v1.0:** §0, §3–§7, §8.1–§8.4 (feature specs F3.1–F6.2), §9–§16 — canonical text remains in v1.0 archive unless marked **[V2]** below.

---

## How to use V2

1. **Business meaning** → Addendum V1.1 (§9 entities, §10 glossary, §1 business rules) is SSOT.  
2. **Build order & technical specs** → This Bible (§8, §12).  
3. **AS-IS baseline** → Technical Inventory + Enterprise Review (unchanged).  
4. **Implementation may continue** per §12 — Business Architecture V2.0 frozen 2026-06-30.

---

## Contents

| § | Title | V2 change |
|---|-------|-----------|
| 0 | Purpose, Scope & How Cursor Must Use This Document | — (see v1.0) |
| 1 | SSOT Principles | **+ §1.4, §1.5** |
| 2 | Non-Negotiable Business Rules | **+ crosswalk** |
| 3–7 | Database, Currency, Finance, Rules Engine, Payee Model | — (see v1.0) |
| 8 | Feature Specifications (Phase 3–6) | **+ §8.5** |
| 9–16 | Workflows, UI, Coding, Migration, UAT, Edge Cases, Performance, Rollback | §12 updated in §12 below |
| A | Business Requirements Addendum V1.1 (incorporated) | **NEW** |
| 17 | Phase 3 Resume Gate | **NEW** |

*Full v1.0 section text: `Commission module claude files/Commission_Module_Implementation_Bible.txt`*

---

## §1.4 Commission Business Domain Model (Business SSOT) [V2 NEW]

**Canonical source:** Addendum V1.1 §9 (frozen). Summarized here for implementers; entity definitions in Addendum prevail on conflict.

### Entity layers

1. **Configuration** — Institution Config, Templates, Matrix, Eligibility, Tax  
2. **Commercial** — Agreement, Commission Plan, Rule, Fee & Commission Matrix  
3. **Student & Earning** — Student Commission Record, Tuition Breakdown, Lifecycle  
4. **Claim & Submission** — Claim Cycle, Claim Draft, Submission Package, Submission Snapshot  
5. **Financial** — Invoice, Receipt, Allocation, Credit/Debit, Reconciliation  
6. **Revenue & Settlement** *(future)* — Earning, Payee, Settlement, Partner Payout  

### Core entities (Direct Partner — operational scope)

| Entity | Role |
|--------|------|
| Institution | Partner paying commission |
| Claim Cycle / Claim Draft | Working claim container |
| Student Commission Record | Three-axis lifecycle per student |
| Tuition Fee Breakdown | Decomposed fees — **not** single tuition field |
| Submission Snapshot | Immutable financial record at submit |
| Commission Invoice / Receipt | Billing and payment |
| Business Override | Governed exception with audit |

### Key business relationships

- **Tuition Breakdown → Commission Amounts:** Commission % on **Commissionable Tuition** only (Addendum BR-T02).  
- **Claim Draft → Submission Snapshot:** Submit freezes figures; no post-submit edit (Addendum BR-U04, BR-C05).  
- **Billing Profile ↛ Claim:** Billing stores identity/remittance only (Addendum BR-B01, BR-U05).  
- **One claim ≠ one institution** when aggregator model applies (Addendum BR-U06).

Full entity catalog, ER diagram, and SSOT hierarchy: **Addendum V1.1 §9**.

---

## §1.5 ERP Commission Glossary [V2 NEW]

**Canonical source:** Addendum V1.1 §10 (frozen) — 70+ terms alphabetically defined.

Implementers must use glossary terms consistently in UI labels, RPC names, documentation, and tests. Key distinctions:

| Term | Must not conflate with |
|------|------------------------|
| Commissionable Tuition | Gross tuition, net tuition paid, published tuition |
| Submitted Amount | ERP Calculated Amount, Institution Approved Amount |
| Claim Draft | Submission Snapshot (draft is mutable; snapshot is not) |
| Billing Profile | Claim generation or submission templates |
| Business Override | Silent field edit or recalc without audit |

Full glossary: **Addendum V1.1 §10**.

---

## §1.6 Student Business Lifecycle [V2 NEW]

**Canonical source:** Addendum V1.1 §1.6a, §2.10 (frozen).

```
Lead → Application Submitted → Offer Issued → Admission Accepted
  → Enrollment → Study Started → Completed → Graduated
```

- Distinct from **commission lifecycle** events (Eligible, Submitted, Clawback, etc.) but feeds eligibility and explainability.  
- CRM/Admissions owns contact data; Commission & Revenue Management **consumes** stage transitions as **Lifecycle Events** (BR-SL01–SL05).  
- Withdrawal, Transfer, Visa Refused may branch from any post-Lead stage without erasing history.

---

## §1.7 Referral Partner Lifecycle [V2 NEW]

**Canonical source:** Addendum V1.1 §1.11, §2.11 (frozen). *Future Extension — P3.*

```
Referral → Approval → Settlement → Payment → Reconciliation
```

- Rules: BR-R01–R08.  
- Requires Phase 5 payee/earning EXTEND — no core redesign.  
- Referral fee explainability parallel to institution reconciliation (BR-FR01).

---

## §2. Non-Negotiable Business Rules — Addendum Crosswalk [V2 EXTENDED]

v1.0 §2 (NN-1 through NN-10) remains binding. Addendum V1.1 business rules **extend** them:

| Addendum ID | Business rule (summary) | Maps to / extends |
|-------------|-------------------------|-------------------|
| BR-U01 | Nothing hard-coded per institution | NN-6, §1 principle 7 (configuration in data) |
| BR-U02 | Tuition ≠ Commission Base | **New invariant** — implement in rules engine + fee breakdown |
| BR-U03 | History never overwritten | NN-2, NN-5 philosophy; F3.3 audit; F3.2 adjustments |
| BR-U04 | Submission snapshot immutability | Extends NN-2 beyond eligibility snapshots |
| BR-U05 | Billing does not own claims | Scope boundary — preserve AS-IS billing profile |
| BR-U06 | One claim ≠ one institution | Phase 2B aggregator EXTEND |
| BR-T01–T06 | Tuition decomposition | **New** — Phase 3B/4 capability |
| BR-C01–C06 | Claim draft + post-submit immutability | F4.1 approval; submission entity (new) |
| BR-S01–S08 | Lifecycle event preservation | F3.3 financial events + lifecycle event log |
| BR-SB01–SB05 | Submission lifecycle | Phase 4 automation + submission entity |
| BR-FV01–FV05 | Financial verification checkpoint | UI wizard + submission snapshot |
| BR-FR01–FR07 | Reconciliation triangulation | F3.2 credit/debit; receipt AS-IS |
| OV-P01–OV-A04 | Override framework | F4.1 approval + new override entity |
| AU-01–AU-19 | Automation / Odoo parity | Phase 4 F4.3 + new submission engine |

Full rule text: **Addendum V1.1 §1–§6**.

---

## §8.5 Business Capability Extensions (P0 / P1) [V2 NEW]

These capabilities implement frozen Addendum requirements. They **extend** v1.0 phases — no redesign of Phases 1–2B. Feature format follows §0.2 (Purpose, Business Rules, Implementation Sequence, Acceptance Criteria, Regression Requirements). Detailed specs to be expanded during implementation planning; **business rules are binding now**.

### F3B.1 Tuition fee breakdown & commissionable base (P0)

| Field | Content |
|-------|---------|
| **Purpose** | Enforce BR-U02, BR-T01–T06: commission calculates on explicit commissionable base, not raw tuition. |
| **Business Rules** | All Addendum BR-T*; Tuition Fee Breakdown entity (§1.4). |
| **Implementation Sequence** | EXTEND student/snapshot with breakdown fields or child row → EXTEND rule resolution to accept `commission_base` → UI fee editor on claim draft → parity tests vs legacy tuition-only path. |
| **Acceptance Criteria** | Same student with scholarship + non-commissionable fees produces different commissionable base vs gross tuition; commission % applies to base only. |
| **Regression** | Legacy rows with only `tuition_amount` migrate with documented default mapping; Phase 1–2B totals unchanged where breakdown not used. |

### F3B.2 Institution submission templates & specimens (P0)

| Field | Content |
|-------|---------|
| **Purpose** | Replace hard-coded CSV/export (Addendum CFG-ST*, AU-01–AU-03). |
| **Business Rules** | Multiple templates per institution; version history; column mapping; validation. |
| **Implementation Sequence** | CREATE template + specimen entities (reuse agreement-version pattern) → render pipeline (CSV/PDF/Excel/Word per template) → bind to claim cycle → remove hard-coded `claimsExport` column constants. |
| **Acceptance Criteria** | Two institutions produce different export schemas from configuration; template version effective-dated. |
| **Regression** | Existing generic export available as default template until institution configures. |

### F3B.3 Submission snapshot & financial verification (P0)

| Field | Content |
|-------|---------|
| **Purpose** | BR-U04, BR-FV*, BR-C05: immutable submit package with verification audit. |
| **Business Rules** | Pre-submit checklist; frozen ERP Calculated + Submitted amounts; verifier recorded. |
| **Implementation Sequence** | CREATE submission version + snapshot entities → verification wizard UI → submit RPC creates snapshot (no in-place student financial edit post-submit). |
| **Acceptance Criteria** | Post-submit edit of commission amount on snapshot blocked; resubmit creates version 2. |
| **Regression** | Draft claim editing unchanged before submit. |

### F3B.4 Business override framework (P0)

| Field | Content |
|-------|---------|
| **Purpose** | Addendum §4: mandatory Other/Override with audit and approval. |
| **Business Rules** | OV-P01–OV-A04; eight override categories. |
| **Implementation Sequence** | CREATE override entity → integrate F4.1 approval gates → UI override dialog on fee, commission, status, claim → migrate `amended_expected_amount` to override records. |
| **Acceptance Criteria** | Every override has reason + original/new value + actor; above-threshold requires approver ≠ initiator. |
| **Regression** | Existing hold/transfer RPCs unchanged; overrides additive. |

### F3B.5 Reconciliation triangulation (P0)

| Field | Content |
|-------|---------|
| **Purpose** | BR-FR01: store ERP Calculated, Submitted, Institution Approved, Received, Outstanding distinctly. |
| **Business Rules** | Institution Modified captures institution figures separately from submitted. |
| **Implementation Sequence** | EXTEND claim line / submission snapshot with parallel amount columns → UI variance display → link to F3.2 adjustments when variance resolved. |
| **Acceptance Criteria** | Three-way variance visible per student line after institution response. |
| **Regression** | `amount_received` / `amount_outstanding` receipt behavior unchanged. |

### F4B.1 Submission lifecycle & tracking (P1)

| Field | Content |
|-------|---------|
| **Purpose** | BR-SB01–SB05: portal/email/manual channel tracking with references. |
| **Business Rules** | Full submission state machine; portal/institution reference numbers. |
| **Implementation Sequence** | EXTEND submission entity with lifecycle states → tracking UI → email/portal config from institution profile. |
| **Acceptance Criteria** | Submission history shows all state transitions with actor and timestamp. |

### F4B.2 Claim automation & Odoo parity (P1)

| Field | Content |
|-------|---------|
| **Purpose** | Addendum §6, AU-05–AU-16: one-click package, draft email, scheduled send. |
| **Business Rules** | User review before send (AU-14); specimens drive output. |
| **Implementation Sequence** | Orchestration RPC: recalc → generate from specimens → assemble package → draft email via F4.3 notifications → optional scheduler. |
| **Acceptance Criteria** | One action from finalized cycle produces draft package + draft email; scheduled send fires on due date. |

### F4B.3 Academic structure & universal config (P2)

| Field | Content |
|-------|---------|
| **Purpose** | BR-A*, CFG-A*, CFG-U*: institution terminology; remove hard-coded agency/period labels. |
| **Implementation Sequence** | Institution period label overrides → legal entity master for agency identity → extensible lookup tables for enums. |

*Aggregator (P1), B2B/Referral (P3): see Addendum §5 — implemented via existing Phase 2B + Phase 5 payee/earning EXTEND; no new business entities required.*

---

## §12. Migration Sequence & Implementation Order [V2 UPDATED]

### Phase 3 resume gate

**Do not start or continue Phase 3 implementation until Implementation Bible V2 is approved** (§17).

### Technical track (v1.0 order — unchanged)

| Step | Feature | Gate |
|------|---------|------|
| 1 | F3.4 RLS remediation | Complete formal UAT close |
| 2 | F3.3 Audit log / financial events | Supports lifecycle preservation (BR-S01) |
| 3 | F3.1 Financial-event publishing | Finance boundary |
| 4 | F3.2 Adjustments / credit / debit notes | Immutable corrections |

### Business capability track (V2 — interleave after Step 1 or parallel per business priority)

| Step | Feature | Priority | Depends on |
|------|---------|----------|------------|
| B1 | F3B.1 Tuition breakdown | P0 | — |
| B2 | F3B.2 Submission templates | P0 | — |
| B3 | F3B.3 Submission snapshot + verification | P0 | B1, B2 |
| B4 | F3B.4 Override framework | P0 | F3.3 audit |
| B5 | F3B.5 Reconciliation triangulation | P0 | B3 |
| B6 | F4.1 Approval engine | — | B4 |
| B7 | F4B.2 Claim automation | P1 | B2, B3, F4.3 |
| B8 | F4B.1 Submission lifecycle | P1 | B3 |
| B9 | F4B.3 Academic/universal config | P2 | — |

**Recommended sequencing:** Complete F3.4 UAT close → business approves V2 → implement P0 track (B1–B5) in parallel with or immediately before F3.3–F3.2 technical track, per business decision. P0 business capabilities are **not optional** for Direct Partner operational sign-off.

Steps 5–13 from v1.0 (F4.1–F6.2) follow after Phase 3 backbone + P0 business capabilities.

---

## Appendix A — Business Requirements Addendum V1.1 (Incorporated) [V2 NEW]

The following document is **incorporated by reference** and forms part of this Bible's business specification:

**[Commission Business Requirements Addendum V1.1](./COMMISSION_BUSINESS_REQUIREMENTS_ADDENDUM_V1.1.md)** — **FROZEN**

| Addendum section | Binding content |
|------------------|-----------------|
| §1 Business Rules | BR-* identifiers — all P0/P1 rules mandatory |
| §2 Operational Scenarios | UAT and acceptance scenario source |
| §3 Configuration Requirements | CFG-* — institution independence |
| §4 Override Framework | OV-* — cross-cutting |
| §5 Revenue Flow | Models A–E; Direct Partner scope |
| §6 Automation Requirements | AU-* — Odoo parity |
| §7 Priority & Phasing | P0–P3 prioritization |
| §9 Business Domain Model | Entity SSOT |
| §10 ERP Commission Glossary | Terminology SSOT |

Changes to Addendum content after freeze require **ERP RFC** and Bible version bump (v2.1+).

---

## §17. Phase 3 Resume Gate & Approval [V2 — APPROVED]

### Approval record

| Field | Value |
|-------|-------|
| **Business Architecture** | V2.0 **FROZEN** |
| **Addendum V1.1** | **FROZEN** |
| **Implementation Bible V2** | **APPROVED & FROZEN** |
| **Architecture Certification** | Accepted 2026-06-30 |
| **Approved by** | Business owner / Commission sponsor |
| **Approval date** | 2026-06-30 |
| **Phase 3** | **May continue** per §12 |

### Conditions met

1. ✅ Business Requirements Addendum V1.1 — frozen (final: student + referral lifecycles).  
2. ✅ Implementation Bible V2 — approved.  
3. ⏳ F3.4 — formal completion certificate (UI smoke + security UAT) — complete before F3.3.  
4. ✅ P0 business capabilities (F3B.1–F3B.5) — scheduled in Bible V2 §8.5 / §12.

### Governance

- **No further business requirement changes** without ERP RFC.  
- **Delivery phase:** implement against frozen docs; shift from architecture to UAT-driven delivery.  
- **Delivery discipline:** [ERP Delivery Standards](../erp-governance/DELIVERY_STANDARDS.md) — DoD, feature loop, RFC vs engineering improvements

```
V2 APPROVED: [x] Yes  Date: 2026-06-30
BUSINESS ARCHITECTURE V2.0 FROZEN: [x] Yes  Date: 2026-06-30
PHASE 3 IMPLEMENTATION: [x] Authorized  Date: 2026-06-30
```

---

## v1.0 Reference (§0–§16 unchanged text)

Sections §0 (Purpose), §3 (Database Standards), §4 (Currency & FX), §5 (Finance Alignment), §6 (Rules Engine), §7 (Payee & Earning Model), §8.1–§8.4 (F3.1–F6.2 feature specs), §9 (Workflow Diagrams), §10 (UI Standards), §11 (Coding Standards), §13 (Acceptance Criteria), §14 (Edge Cases), §15 (Performance), §16 (Rollback) retain **full v1.0 specification text** in:

`Commission module claude files/Commission_Module_Implementation_Bible.txt`

V2 does not invalidate v1.0 technical content — it **extends** it with business requirements, domain model, glossary, Phase 3B capabilities, and resume governance.

---

**End of Implementation Bible v2.0 (FROZEN).**  
Build package = AS-IS Technical Inventory + Enterprise Review + **Addendum V1.1 (frozen)** + **this document (frozen)**.  
Implement per §12; never violate §2 + Addendum BR-*; treat Finance as SSOT per §5.  
**Business Architecture V2.0 frozen 2026-06-30 — delivery phase authorized.**
