# Commission Module — Business Domain Validation Report

**Document type:** Business sign-off validation (architecture only — no implementation)  
**Date:** 30 June 2026  
**Status:** Final draft for business review  
**Phase 3:** Paused before F3.3 per business validation directive  
**Principle:** REUSE → EXTEND → CREATE (no redesign of completed work)

---

## Executive Summary

This report validates whether the **current Commission Module architecture** (Phases 1–2B delivered, Phase 3 Step 0 + F3.4 RLS in progress) supports **Future Link's real operational workflows** — not a generic commission system.

**Sources reviewed:**

| Source | Role |
|--------|------|
| ERP Bible TOC (Part 6 §34–43, P-04 Universal Revenue) | Target architecture & extension seams |
| Commission Technical Inventory | AS-IS inventory |
| Commission Enterprise Review | ERP-readiness gaps |
| Commission Implementation Bible | Phased roadmap & compatibility rules |
| Current codebase & migrations (`20260516*`–`20261030*`) | Ground truth |

**Overall verdict:** The **foundation is sound and extensible**, but **most institution-operational workflows are only partially supported or not yet built**. The gaps are **missing business capabilities** (configuration entities, submission engine, tuition decomposition, override fabric, automation) — not a wrong core architecture.

### Summary Scorecard

| # | Validation Area | Status |
|---|-----------------|--------|
| 1 | Institution Configuration | 🟡 Partially Supported |
| 2 | Institution Submission Templates | ❌ Not Supported |
| 3 | Academic Structure | 🟡 Partially Supported |
| 4 | Tuition Structure | ❌ Not Supported |
| 5 | Fee & Commission Matrix | 🟡 Partially Supported |
| 6 | Claim Draft | 🟡 Partially Supported |
| 7 | Student Commission Journey | 🟡 Partially Supported |
| 8 | Submission Lifecycle | ❌ Not Supported |
| 9 | Financial Verification Checkpoint | 🟡 Partially Supported |
| 10 | Financial Reconciliation | 🟡 Partially Supported |
| 11 | Billing (scope boundary) | ✅ Fully Supported |
| 12 | Aggregator Business Model | 🟡 Partially Supported |
| 13 | B2B Partner Business Model | 🟡 Partially Supported (architecture seam) |
| 14 | Revenue Flow (multi-payee) | 🟡 Partially Supported |
| 15 | Business Overrides | ❌ Not Supported |
| 16 | Claim Automation Engine | ❌ Not Supported |
| 17 | Previous Odoo Specimen Capability | ❌ Not Supported |
| 18 | Universal Configuration | 🟡 Partially Supported |
| — | Revenue & Settlement Platform Evolution | 🟡 Partially Supported (foundation OK) |

**Counts:** ✅ 1 · 🟡 12 · ❌ 5

---

## Validation Method

For each requirement area:

1. Checked **schema** (`upi_commission_*`, `upi_billing_profiles`, `upi_claim_cycles`, Phase 2B aggregator tables).
2. Checked **RPCs & lifecycle** (`commission_phase1_rpcs`, receipt/aggregator migrations).
3. Checked **UI** (`ClaimsPanel`, `BillingProfilesPanel`, `claimsExport.ts`, aggregator workbench).
4. Cross-referenced **Bible / Inventory / Enterprise Review** for planned vs delivered.

Classification:

- **✅ Fully Supported** — Business workflow operable today without hard-coded assumptions blocking the institution.
- **🟡 Partially Supported** — Foundation or subset exists; critical operational pieces missing.
- **❌ Not Supported** — No adequate schema, workflow, or configuration path today.

---

## 1. Institution Configuration

**Status: 🟡 Partially Supported**

### What exists today

| Requirement | AS-IS evidence |
|-------------|----------------|
| Billing contact / address / currency / tax reg / remittance | `upi_billing_profiles` + `BillingProfilesPanel.tsx` |
| Commercial terms | `upi_commissions`, `upi_commission_rules`, `upi_agreement_versions` |
| Student eligibility triggers | `upi_commission_eligibility_configs` (deposit, visa, enrolled, etc.) |
| Hold / defer reasons | `upi_commission_hold_reasons` (11 codes incl. visa refusal) |
| Partnership routing | `upi_partnership_routes`, `upi_aggregators` |

### Gaps

| Requirement | Status | Why | What's missing | Fix type |
|-------------|--------|-----|----------------|----------|
| Institution-specific **claim** requirements | 🟡 | Block reasons and eligibility configs cover subset (consent, tuition paid, enrollment) | Per-institution claim checklist, required fields, consent rules beyond global enums | **Configuration** + **Business Rules** + **UI** |
| **Submission** requirements | ❌ | No submission-requirements entity | Portal/email/format rules per institution | **New Entity** + **Configuration** |
| **Invoice** requirements | 🟡 | Invoice generation exists; defaults hardcoded | Institution-specific invoice layout, tax lines, numbering rules | **Configuration** + **UI** + **Database** |
| **Tax** requirements | ❌ | Tax reg number stored; no tax computation | Institution tax profiles, GST/HST rules, exempt categories | **New Entity** + **Business Rules** (Phase 4+ per Enterprise Review) |
| **Portal** requirements | ❌ | Not modeled | Portal URLs, credentials refs, submission endpoints | **Future Extension** |
| **Email** requirements | ❌ | Not modeled | Recipient lists, templates, attachment rules per institution | **New Entity** + **Workflow** |
| Independent per institution | 🟡 | Institution-scoped tables exist | **Hardcoded FLC agency** in `upi_commission_invoices` defaults and `claimsExport.ts` (`FLC_AGENCY` constant, fixed CSV columns) | **Configuration** — move to org/legal-entity master |

**Nothing should be hard coded:** **Violated today** for agency identity, CSV export schema, and invoice footer text in UI.

---

## 2. Institution Submission Templates

**Status: ❌ Not Supported**

### What exists today

- Generic **CSV export** with **fixed 20 columns** (`src/institutions/lib/claimsExport.ts`).
- **Print-to-PDF** via browser print on claim/invoice DOM.
- Document kind `invoice_template` referenced in letter generation — **not** an institution submission-template engine tied to claims.

### Gaps

| Capability | Status | What's missing | Fix type |
|------------|--------|----------------|----------|
| Multiple templates per institution (Fall/Winter, Domestic/International) | ❌ | Template entity with institution + intake + audience scope | **New Entity** + **Database** |
| Format support (Excel, Word, PDF, CSV, Portal, API) | ❌ | Template format registry + render pipeline | **New Module** (Submission Engine) |
| Institution-specific columns, order, labels, totals, header/footer | ❌ | Column mapping config per template | **Configuration** + **UI** |
| Validation rules & instructions per template | ❌ | Template metadata + pre-submit validator | **Business Rules** + **Workflow** |
| Version history | ❌ | Template versioning (pattern exists on agreements/eligibility — not on submissions) | **New Entity** (reuse agreement-version pattern) |

**Bible alignment:** ERP §39 covers CSV/PDF export AS-IS; multi-format template engine is a **Future Extension Point** (§39.23) — not yet specified in Implementation Bible phases 1–3.

---

## 3. Academic Structure

**Status: 🟡 Partially Supported**

### What exists today

- Student fields: `intake_term`, `intake_month`, `intake_year`, `program_level`.
- Commission period master `upi_commission_periods` with codes including `semester_1`, `semester_2`, `year_1`, `custom`.

### Gaps

| Requirement | Status | Why | What's missing | Fix type |
|-------------|--------|-----|----------------|----------|
| Semester / Term / Trimester / Quarter | 🟡 | Period master is global, not institution-scoped | Institution academic-structure config mapping terminology | **Configuration** + **Database** |
| Institution-specific terminology | ❌ | Labels seeded globally ("Semester 1") | Per-institution label override for period codes | **Configuration** |
| Nothing assumes "Semester" | 🟡 Violated | Seed data and UI copy use semester-centric codes | Institution-configurable period vocabulary | **Configuration** + **UI** |

**Extension path:** Extend `upi_commission_periods` with institution overrides (or junction table) — **no redesign** of student row required.

---

## 4. Tuition Structure

**Status: ❌ Not Supported**

### What exists today

On `upi_commission_students`:

```
tuition_amount, tuition_currency, tuition_paid_amount, tuition_paid_date
commission_amount, commission_rate_applied
expected_amount, amended_expected_amount  (receipt-era)
```

Commission calculation (Inventory §519): **base = tuition × (base_rate_percent / 100)**.

Eligibility trigger includes `tuition_paid_date OR tuition_paid_amount > 0`.

### Required decomposition (not present)

| Field | Present |
|-------|---------|
| Published Tuition | ❌ |
| Gross Tuition | ❌ (conflated with `tuition_amount`) |
| Scholarship | ❌ |
| Discount | ❌ |
| Non Commissionable Fees | ❌ |
| Net Tuition Paid | 🟡 (`tuition_paid_amount` only) |
| Commissionable Tuition | ❌ |
| Institution Approved Commission Base | ❌ |
| Commission % | ✅ (`commission_rate_applied`) |
| Calculated Commission | ✅ (`commission_amount`) |
| Approved Commission | 🟡 (no institution-approval amount separate from calculated) |
| Paid Commission | 🟡 (`payment_status` + receipt allocations) |

**Critical rule violated:** *"ERP must never assume Tuition = Commission Base."*  
**Today it does** — engine and schema treat `tuition_amount` as calculation input.

| Fix type | Notes |
|----------|-------|
| **New Entity** or **Database** extension | Tuition fee breakdown row or JSONB fee_structure on student/snapshot |
| **Business Rules** | Rule engine must accept `commission_base` not raw tuition |
| **UI** | Fee editor on claim draft |
| **Workflow** | Institution-approved base as distinct approval step |

**Bible alignment:** Implementation Bible §7 payee/earning model separates earning from payee but **does not yet decompose tuition** — this is a **business requirement gap** to add to frozen requirements before Phase 3 continues.

---

## 5. Fee & Commission Matrix

**Status: 🟡 Partially Supported**

### What exists today

`upi_commission_rules` scope dimensions:

- `scope_country`, `scope_campus`, `scope_program_category`, `scope_program_code`, `scope_intake`
- Linked to `upi_commissions` with `effective_from` / agreement versioning
- `precedence_rank` for rule resolution
- Currency per student row (`tuition_currency`, `invoice_currency`, `receipt_currency`)

### Matrix dimension coverage

| Dimension | Supported |
|-----------|-----------|
| Country | ✅ |
| Institution | ✅ (via commission → institution) |
| Campus | ✅ |
| Program | ✅ |
| Level | 🟡 (`program_level` on student; not rule scope column) |
| Intake | ✅ |
| Agreement | ✅ (`agreement_version_id`) |
| Effective Date | ✅ |
| Currency | ✅ |
| Historical Preservation | 🟡 (snapshots immutable; rule version history partial) |
| Fee Override | 🟡 (`amended_expected_amount`) |
| Commission Override | 🟡 (manual recalc; no override audit entity) |
| Future revisions | 🟡 (publish/supersede on configs; no matrix UI) |

| Gap | Fix type |
|-----|----------|
| No first-class **Fee & Commission Matrix** UI/entity | **UI** + **Configuration** |
| Level not in rule scope | **Database** extension (column) |
| Override without audit trail | **New Entity** (see §15) |
| Point-in-time matrix reconstruction beyond snapshots | **Future Extension** (Enterprise Review §240) |

---

## 6. Claim Draft

**Status: 🟡 Partially Supported**

### What exists today

| Draft capability | AS-IS |
|------------------|-------|
| Add student | ✅ Manual / transfer RPC |
| Remove student | 🟡 (cycle reassignment / carry forward) |
| Exclude student | 🟡 (`block_reason`, eligibility blocked) |
| Hold student | ✅ `hold_status`, hold RPCs |
| Edit tuition | 🟡 Direct field edit possible; no governed fee editor |
| Edit commissionable tuition | ❌ Field does not exist |
| Edit commission | 🟡 Recalc + `amended_expected_amount` |
| Edit notes | ✅ `block_notes`, metadata |
| Preview | ✅ CSV download + print invoice/claim |
| Validate | 🟡 Eligibility evaluator RPC |
| Internal review | ❌ No review queue / reviewer role workflow |
| Manager approval | ❌ No approval fabric (Enterprise Review gap) |
| Immutable after submission | ❌ Submit updates live rows; no submission snapshot |

### Post-submission immutability gap

`claim_status` transitions include `submitted`, `approved`, `rejected`, but:

- No **`upi_commission_submissions`** (or equivalent) frozen package.
- Invoice and student rows remain mutable after submit (except snapshot trigger on specific events).
- **Financial verification snapshot** (§9) cannot be guaranteed.

| Missing | Fix type |
|---------|----------|
| Working-document claim cycle with governed edits | **Workflow** + **UI** |
| Manager approval before submit | **Workflow** + **Database** (approval tables — Enterprise Review) |
| Submission immutability | **New Entity** (submission snapshot) + **Business Rules** |

---

## 7. Student Commission Journey

**Status: 🟡 Partially Supported**

### Lifecycle axes (strong foundation)

Three-axis model on `upi_commission_students`:

- `eligibility_status`
- `claim_status` — `not_ready | ready | submitted | approved | rejected | carried_forward`
- `payment_status`

Immutable **`upi_commission_snapshots`** on key transitions.  
**`upi_commission_transfer_events`** for transfer history.

### Event coverage vs business list

| Event | Status | Notes |
|-------|--------|-------|
| Eligible | ✅ | `eligibility_status = eligible` |
| Submitted | ✅ | `claim_status = submitted` |
| Approved | ✅ | `claim_status = approved` |
| Rejected | ✅ | |
| Withdrawn | 🟡 | `enrollment_status = withdrawn`; not dedicated commission event |
| Deferred | 🟡 | `enrollment_status = deferred` |
| Outstanding Tuition | 🟡 | Hold reason `tuition_pending` |
| Visa Refused | 🟡 | Hold reason `visa_refusal`; no auto-cancel workflow |
| Program Changed | ❌ | No event entity |
| Campus Changed | ❌ | Field editable; no preserved event |
| Internal Transfer | 🟡 | Transfer RPC + events table |
| Transfer to another institution | 🟡 | Transfer types in RPC |
| Transfer through Future Link | 🟡 | Partial in transfer RPC |
| Transfer outside Future Link | 🟡 | Partial |
| Commission Cancelled | 🟡 | `eligibility_status = cancelled` |
| Commission Clawback | ❌ | Columns `clawback_amount`, `clawback_status` — **logic Not Found** (Inventory) |
| Commission Reassigned | ❌ | No reassignment event |

**History preservation:** Snapshots + transfer events = **partial**. Many lifecycle events would **overwrite** row state without an append-only event log.

| Missing | Fix type |
|---------|----------|
| Append-only **commission lifecycle event log** (beyond snapshots) | **New Entity** (`upi_commission_financial_events` planned F3.3 — not yet built) |
| Clawback workflow | **Business Rules** + **Workflow** + **UI** |
| Program/campus change events | **New Entity** or extend transfer events |

---

## 8. Submission Lifecycle

**Status: ❌ Not Supported**

### Required lifecycle

`Draft → Generated → Reviewed → Approved → Portal Submitted → Email Submitted → Institution Received → Institution Approved/Modified/Rejected` + version + references + history.

### AS-IS

- Claim cycle status on `upi_claim_cycles` (basic).
- Student-level `claim_status` (subset).
- `submitted_by_agency_date`, `validated_by_institution_date`, `institution_validation_notes` on student row.
- No submission package entity, no portal/email tracking, no submission version chain.

| Missing | Fix type |
|---------|----------|
| Submission state machine | **New Entity** + **Workflow** |
| Portal / institution reference numbers | **Database** |
| Submission version history | **New Entity** (immutable versions) |
| Institution modified vs approved distinction | **Business Rules** + **UI** |

---

## 9. Financial Verification Checkpoint

**Status: 🟡 Partially Supported**

### Required checkpoint chain (pre-submit)

```
Student → Program → Institution → Academic Structure → Fee Structure →
Commissionable Tuition → Commission → Taxes → Submission Template →
Supporting Documents → Final Claim
```

### AS-IS

- Eligibility evaluation checks subset (consent, tuition paid, enrollment, hold).
- Recalc before submit.
- Invoice generation optional before export.
- **No structured verification wizard** enforcing full chain.
- **No immutable submission snapshot** after verification.

| Gap | Fix type |
|-----|----------|
| Ordered verification checklist per institution | **Configuration** + **UI** (wizard) |
| Frozen submission snapshot | **New Entity** + **Business Rules** |
| Tax verification step | **Future Extension** (tax engine not built) |
| Template verification step | **Blocked by §2** (no templates) |

**Enterprise Review:** Adjustment entity + re-snapshot path needed for corrections **after** immutable submit — also not built.

---

## 10. Financial Reconciliation

**Status: 🟡 Partially Supported**

### Parallel amount storage

| Amount type | AS-IS column / mechanism |
|-------------|--------------------------|
| ERP Calculated | `commission_amount`, `expected_amount` |
| Submitted | ❌ No distinct column |
| Institution Approved | ❌ No distinct column (`validated_by_institution_date` only) |
| Amount Received | ✅ `amount_received` (invoice, student, aggregator lines) |
| Outstanding | ✅ `amount_outstanding` |
| Short / Over payment | 🟡 Derivable; not explicit status |
| Partial payments | ✅ Receipt workflow + allocations |
| Multiple receipts | ✅ `upi_commission_receipts` + allocation tables |
| Credit notes | ❌ Planned Phase 4 (Enterprise Review) |
| Debit notes | ❌ Planned Phase 4 |
| Clawbacks | ❌ Columns only |
| Net revenue | ❌ No net revenue roll-up |

Receipt lifecycle **draft → ready → posted → void** with immutability on post is **strong** (✅).

| Missing | Fix type |
|---------|----------|
| Submitted vs institution-approved vs ERP-calculated **triangulation** | **Database** + **UI** |
| Credit/debit note entities | **New Entity** (Phase 4) |
| Clawback posting | **Business Rules** + **Workflow** |

---

## 11. Billing

**Status: ✅ Fully Supported**

### Validation result

Billing profiles correctly scoped to:

- Billing contact, address, phone, email  
- Currency (invoice + receipt defaults)  
- Tax registration number  
- Payment terms, remittance instructions  
- Optional aggregator link  

**Billing does NOT own claim generation** — claims/invoices live in commission tables and `ClaimsPanel`. ✅

This matches business requirement §11 and Bible §36.

---

## 12. Aggregator Business Model

**Status: 🟡 Partially Supported**

### Required model

```
One Aggregator → Many Countries → Many Institutions → Many Students →
One Claim → One Invoice → One Receipt → Allocation back to every student
```

**Must NOT assume:** One Claim = One Institution.

### AS-IS (Phase 2B)

| Component | Status |
|-----------|--------|
| `upi_aggregators` | ✅ |
| `upi_commission_aggregator_invoices` + `_invoice_lines` | ✅ |
| Remittance batches + statements | ✅ |
| Aggregator workbench UI | ✅ |
| Claim cycle aggregator scope | ✅ (`upi_claim_cycles.aggregator_id`) |
| Multi-institution lines on one aggregator invoice | ✅ |

### Gaps

| Gap | Why | Fix type |
|-----|-----|----------|
| Phase 1 **per-institution claim cycles** still primary path | Two parallel models | **Workflow** unification — extend aggregator path |
| "One claim" spanning institutions | Aggregator invoice ≠ unified claim submission entity | **New Entity** or **extend** claim cycle for aggregator scope |
| Full allocation-back trace on one receipt | Partial via invoice + student allocations | **Business Rules** + **UI** |
| Phase 2B may be unpublished on some DBs | Migration guard pattern in F3.4 | **Configuration** / publish |

**Architecture does not block** aggregator model — Phase 2B proves the seam (Enterprise Review: "template for parent-child orgs").

---

## 13. B2B Partner Business Model

**Status: 🟡 Partially Supported (architecture seam only — future implementation)**

### Required chain

```
Institution → Aggregator (optional) → Future Link → B2B Partner → Settlement → Payment → Reconciliation
```

### AS-IS

- `upi_partnership_routes` — routing metadata ✅
- Payee / earning / allocation model — **Phase 5** (Bible §7, §418) — **not built**
- B2B partner entity, settlement, partner payment — **not built**

### Architecture readiness

| Seam | Ready? |
|------|--------|
| Partnership routes | ✅ |
| Billing profile per route | ✅ |
| Multi-payee allocation tables | ❌ (designed, not migrated) |
| Settlement without schema redesign | ✅ (Bible compatibility guarantee) |

**Verdict:** Correct to defer implementation; **foundation will support** B2B when Phase 5 payee/earning lands. Not operable today.

| Missing (future) | Fix type |
|----------------|----------|
| B2B partner master + settlement | **Future Extension** (Phase 5) |
| Partner reconciliation UI | **Future Extension** |

---

## 14. Revenue Flow

**Status: 🟡 Partially Supported**

### Required multi-hop flow

```
Institution → Aggregator → Future Link → B2B Partner → Referral Partner → Future Extension
```

### AS-IS

| Hop | Status |
|-----|--------|
| Institution → Future Link | ✅ Operational (direct partner path) |
| Aggregator → Future Link | 🟡 Phase 2B |
| Future Link → B2B Partner | ❌ |
| Referral Partner | ❌ |
| Future Extension | 🟡 P-04 plug-in contract documented |

**ERP P-04** ("Universal Revenue & Payout Architecture") is a **placeholder chapter** but explicitly states: *Commission Module IS this engine today; future modules plug in via same model.*

No redesign required — **sequenced extension** per Bible Phases 5–6.

---

## 15. Business Overrides

**Status: ❌ Not Supported**

### Required pattern (every financial workflow)

- Other / Override option when no predefined choice exists  
- Mandatory explanation, optional attachment  
- Approval workflow  
- Audit: original value, new value, reason, user, date/time  
- **Nothing overwrites history**

### AS-IS partial substitutes

| Mechanism | Limitation |
|-----------|------------|
| `amended_expected_amount` | No reason/approver/audit entity |
| `block_reason = 'other'` + notes | Not financial override |
| Manual recalc | Overwrites `commission_amount`; snapshot may capture point-in-time |
| Hold / transfer RPCs | Event-specific, not generic override |

**No generic `upi_commission_overrides` (or equivalent)** with approval chain.

| Missing | Fix type |
|---------|----------|
| Override entity + approval workflow | **New Entity** + **Workflow** + **UI** |
| Mandatory audit trail on financial mutations | **New Entity** (audit log — Enterprise Review §125) |
| "Other" override on fee, commission, tuition, status, claim, submission, payment | **Business Rules** + **UI** |

This is a **cross-cutting business requirement** affecting §4, §5, §6, §9, §10.

---

## 16. Claim Automation Engine

**Status: ❌ Not Supported**

### Required capabilities

| Capability | Status |
|------------|--------|
| Institution claim specimens | ❌ |
| Invoice specimens | ❌ |
| One-click claim generation | ❌ (manual recalc + export) |
| Automatic invoice generation | 🟡 (button-triggered, not rules-driven) |
| Automatic student listing | ✅ (cycle membership) |
| Supporting documents package | ❌ |
| Submission package assembly | ❌ |
| Email template + draft email | ❌ |
| Scheduled email | ❌ |
| Automatic attachments | ❌ |
| Submission / delivery tracking | ❌ |
| Future portal / API automation | ❌ (no seam entity yet) |

| Missing | Fix type |
|---------|----------|
| Specimen + automation engine | **New Module** |
| Integration with notification engine (G-08 Bible) | **Future Extension** |
| Scheduled jobs | **Workflow** + infrastructure |

---

## 17. Previous Odoo Capability

**Status: ❌ Not Supported**

### Odoo capabilities referenced

1. Institution-specific invoice/claim **specimens**  
2. One-click generation after students finalized  
3. Auto: documents, attachments, email draft, recipients, save as draft  
4. Review then auto-send on due date  

### AS-IS mapping

| Odoo | New ERP |
|------|---------|
| Specimens | ❌ No equivalent |
| One-click package | ❌ Separate recalc, invoice, CSV, print |
| Draft email + scheduled send | ❌ |
| Due-date automation | 🟡 `due_date` on invoice only |

**Architecture can support** these via §2 Submission Templates + §16 Automation Engine — **not built**.

| Fix type | **New Module** (Submission & Automation) — document in Bible Phase 4+ before build |

---

## 18. Universal Configuration

**Status: 🟡 Partially Supported**

### Configurable today

- Commission rules (scoped, effective-dated)  
- Eligibility configs (versioned, publish/supersede)  
- Hold reasons (master table)  
- Billing profiles  
- Partnership routes  
- Commission periods (global master)  
- Phase 3 `upi_commission_config` (module flags incl. `approval_required`)

### Hardcoded / not institution-configurable

| Item | Location |
|------|----------|
| FLC agency name, address, phone, email | `claimsExport.ts`, invoice defaults, `ClaimsPanel` print |
| CSV column set (20 fixed columns) | `claimsExport.ts` |
| CAD formatting assumption in export | `claimsExport.ts` |
| Global semester period labels | `upi_commission_periods` seed |
| Block reason enum (Postgres CHECK) | Schema migration required to extend |
| Enrollment status enum | Schema CHECK |

| Missing | Fix type |
|---------|----------|
| Institution rules registry | **Configuration** framework |
| Template / tax / academic terminology config | **New Entity** |
| Extensible enums without migration | **Configuration** pattern (JSONB or lookup tables) |

---

## Revenue & Settlement Platform Evolution

**Question:** Is the architecture sufficiently generic to evolve into a **Revenue & Settlement platform** while keeping implementation focused on **Direct Institution Partners** now?

**Status: 🟡 Partially Supported — foundation OK, platform layers not built**

### Evidence the foundation does NOT block future evolution

| Design element | Platform role |
|----------------|---------------|
| ERP **P-04** Universal Revenue model | Commission = Phase-1 implementation; payee/earning/settlement/payout defined |
| Bible **Phase 5** payee + earning allocations | Split, B2B, referral without schema redesign |
| **Immutable snapshots + posted receipts** | Correct financial instinct for settlement audit |
| **Partnership routes + aggregators** | Org hierarchy template |
| **Rule engine service-line agnostic** | Future visa/coaching/referral = new rule sets |
| **Currency roles** (earning / invoice / receipt / base) | Multi-currency settlement ready |
| **RPC-mediated writes + RLS** | Scales to multi-entity confidentiality |

### What would block evolution if not extended (not redesign)

1. Tuition = commission base assumption (§4)  
2. Single payee conflated with student row (Phase 5 split)  
3. No submission/settlement snapshot entities (§8, §9)  
4. No override/audit fabric (§15)  
5. No generic event log for revenue recognition (F3.3 planned)

**Conclusion:** Proceed with **Direct Institution Partners** in implementation scope. Document **platform extensions** as frozen business requirements + Bible phases — **do not expand build scope now**.

---

## Cross-Cutting Findings

### Strengths to preserve (Enterprise Review aligned)

1. Three-axis lifecycle + immutable snapshots  
2. Receipt draft → posted → void with allocation model  
3. SECURITY DEFINER RPC write path  
4. Institution workspace tab architecture  
5. Aggregator Phase 2B as org-hierarchy prototype  
6. Reserved seams: `accounting_journal_id`, clawback columns, partnership routes  

### Critical business requirement gaps (requirements — not implementation tasks here)

| Priority | Gap | Blocks business sign-off? |
|----------|-----|---------------------------|
| P0 | Tuition decomposition ≠ commission base | **Yes** |
| P0 | Institution submission templates + specimens | **Yes** |
| P0 | Submission snapshot immutability + verification checkpoint | **Yes** |
| P0 | Business override + audit entity | **Yes** |
| P1 | Full submission lifecycle + tracking | Yes for portal/email ops |
| P1 | Financial reconciliation triangulation (ERP / submitted / institution) | Yes for finance ops |
| P1 | Claim automation (Odoo parity) | Yes for operations efficiency |
| P2 | Academic terminology per institution | Moderate |
| P2 | Universal config (remove hardcoding) | Moderate |
| P3 | B2B / referral revenue flow | Future — architecture OK |

### Relationship to Phase 3 plan

| Phase 3 item | Relevance to validation |
|--------------|-------------------------|
| F3.4 RLS remediation | ✅ Security — does not close business gaps |
| F3.3 Financial events | 🟡 Would help §7 event preservation — **not a substitute** for submission/override/tuition models |
| F3.1 Approval bypass config | 🟡 Config flag only — not approval workflow |
| F3.2 ClaimsPanel RPC migration | ✅ Technical debt — does not add business capabilities |

**Pausing before F3.3 is appropriate** — business requirements must be frozen **above** incremental Phase 3 items.

---

## Gap Remediation Map (Extension Types Only)

No redesign proposed. Mapping gaps to **REUSE → EXTEND → CREATE**:

| Gap | REUSE | EXTEND | CREATE |
|-----|-------|--------|--------|
| Tuition structure | `upi_commission_students`, snapshots | Add fee breakdown columns/child table | — |
| Submission templates | Agreement version pattern | `upi_institution_documents` | Template engine module |
| Submission immutability | Snapshot trigger pattern | New submission snapshot table | — |
| Overrides | Hold/transfer RPC patterns | — | `upi_commission_overrides` + audit log |
| Lifecycle events | `upi_commission_transfer_events` | — | `upi_commission_financial_events` (F3.3) |
| Aggregator one-claim | Phase 2B aggregator invoice | Unify claim cycle scope | — |
| B2B / multi-payee | Partnership routes | Student row → earning | Phase 5 payee tables |
| Automation | Invoice gen RPC | Notification engine (G-08) | Specimen + scheduler module |
| Universal config | `upi_commission_config` | Org/legal entity master | Institution rules registry |

---

## FINAL RECOMMENDATION

### **B — Current architecture supports required workflows with extensions only. Update documentation. Then continue.**

#### Rationale

**Not A:** Five validation areas are ❌ Not Supported and twelve are 🟡. Direct Institution Partner operations today rely on hardcoded exports, tuition-as-base calculation, and manual claim assembly. Business cannot sign off on "fully supported."

**Not C:** Enterprise Review and Implementation Bible independently conclude the core is **"extend, not replace."** Institution workspace, rule engine, lifecycle RPCs, snapshots, receipts, and aggregator seams are sound. Gaps require **new entities and phased extensions** aligned with Bible Phases 4–6 and ERP P-04 — **not structural redesign or rewrite** of Phases 1–2B.

**Why B is correct:**

1. **Architecture is compatible** with Future Link's operational model when documented extensions are built in sequence.  
2. **Revenue & Settlement platform evolution** is feasible without blocking Direct Partner focus — Phase 5 payee/earning is the planned seam.  
3. **Business requirements must be frozen** with explicit extension specs before Phase 3 resumes — this report identifies *what* is missing at requirement level.  
4. **Odoo parity** (specimens, one-click, scheduled email) is a **new module** on existing foundations — not a reason to pause for redesign.

#### Required actions before Phase 3 resumes (documentation & governance — no code in this validation)

1. **Freeze business requirements** from this report's P0/P1 gaps as Commission Module BRD addendum.  
2. **Update Implementation Bible / ERP Part 6** with explicit entities: tuition decomposition, submission templates, submission snapshots, override fabric, reconciliation triangulation, automation module.  
3. **Sequence extensions** — propose Phase 3B or Phase 4 business-capability track **before** or **interleaved with** F3.3/F3.1/F3.2 per business priority (tuition + submission + overrides likely P0).  
4. **Complete F3.4 formal close** (UI smoke + security UAT) independently — security work remains valid.  
5. **RFC process** for any requirement change after business sign-off.

#### After sign-off

- Resume Phase 3 technical track (F3.3 → F3.1 → F3.2) **in parallel with or after** P0 business extension specs are approved — business to decide sequencing.  
- Do **not** implement P0 extensions without frozen requirements and Bible update.

---

## Appendix A — Key AS-IS Artifacts Referenced

| Artifact | Path |
|----------|------|
| Student commission schema | `supabase/migrations/20260516051211_*.sql` |
| Phase 1 billing / eligibility / periods | `supabase/migrations/20260723120000_*.sql` |
| Lifecycle + snapshots | `supabase/migrations/20260723120100_*.sql` |
| Receipts + reconciliation columns | `supabase/migrations/20260801120000_*.sql` |
| Aggregator invoices | `supabase/migrations/20260815120000_*.sql` |
| Phase 3 config | `supabase/migrations/20261030120000_*.sql` |
| CSV export (hardcoded) | `src/institutions/lib/claimsExport.ts` |
| Claims UI | `src/institutions/components/ClaimsPanel.tsx` |
| Billing UI | `src/institutions/components/BillingProfilesPanel.tsx` |

## Appendix B — Document Control

| Version | Date | Author | Change |
|---------|------|--------|--------|
| 1.0 | 2026-06-30 | Cursor Agent (Business Validation) | Initial business domain validation |

**Next reviewer:** Business owner / Commission module sponsor  
**Upon approval:** Business requirements frozen; changes via ERP RFC only.

---

*This validation performed no code changes, no migrations, and no redesign. Implementation remains paused before F3.3 pending business sign-off on this report.*
