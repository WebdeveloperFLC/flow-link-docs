# Direct Institution Claim Workflow — UX Redesign (Business-First)

**Status:** UAT Round 1 ready (UX only — no RFC)  
**Frozen:** Business Architecture V2.0, Implementation Bible, entity model, calculations, SSOT  
**Governance:** [ERP Delivery Standards](../erp-governance/DELIVERY_STANDARDS.md)

---

## Purpose

Make the Direct Institution Partner workflow match how a **commission department** works daily. The backend is correct; the UI previously reflected a developer mental model (student-first). It now reflects **claim-first**.

**One screen = one business question.**

| Area | Business question |
|------|-------------------|
| Claims | Can I submit this institution's claim today? |
| Payments | What commission payments have we received and what is still outstanding? |
| Billing | How should this institution be billed? (configuration — not daily workflow) |
| Agreements | What commercial terms apply? |
| Eligibility | Which students are ready for claim submission? |

---

## Primary business object: Claim

```
Claim (cycle)
  → Students
  → Verification
  → Validation (mandatory checkpoint)
  → Submission package
  → Institution review / approval
  → Invoice (if applicable)
  → Commission payment received
  → Reconciliation
```

Students belong to a claim; the claim summary dashboard answers finance questions in ~10 seconds.

---

## Claim summary dashboard (implemented)

Per claim cycle, surface:

- Institution · Claim cycle · Claim status
- Submission method & template (from institution/billing metadata)
- Students included / pending / blocked / on hold
- Expected commission · Institution approved · Received · Outstanding
- Submission due date · Billing profile
- Last snapshot · Last validation · Submission readiness

---

## Student verification grid (implemented)

Columns derive from **existing** fields + `metadata` JSON (no schema change):

| Column | Source |
|--------|--------|
| Gross tuition | `tuition_amount` |
| Scholarship | `metadata.scholarship_amount` |
| Commissionable tuition | paid amount or gross − scholarship |
| Commission % | `commission_rate_applied` |
| Expected commission | `expected_amount` / `commission_amount` |
| Institution approved | `approved_amount` |
| Academic status | `enrollment_status` |
| Eligibility / Claim / Financial | three-axis + payment_status |
| Hold | `hold_reason` + label |
| Override | `amended_expected_amount` present |
| Business notes | `institution_validation_notes`, `hold_notes`, metadata |

Inline edits (interactive UAT): tuition, scholarship (metadata), approved amount, academic period code.

---

## Four status categories (implemented)

Badges are **separated**, not merged:

1. **Academic** — enrollment_status mapped to business labels  
2. **Eligibility** — eligibility_status  
3. **Claim** — claim_status  
4. **Financial** — payment_status + invoice linkage  

---

## Claim workflow strip (implemented)

Visual pipeline (existing actions wired):

1. Recalculate  
2. **Validate claim** (mandatory before submit)  
3. Preview submission  
4. Freeze snapshot (via Mark Eligible per student / existing RPC)  
5. Generate submission package  
6. Submit claim  
7. Institution review → approval (display + notes)  
8. Generate invoice  
9. Record commission payment  
10. Reconciliation  

---

## Submission package (UI concept)

Not a new entity — a **bundle** of existing artefacts:

- Institution CSV (existing export)  
- Print / PDF (existing)  
- Invoice (if generated)  
- Student schedule  
- Supporting notes  
- Email preview (template from metadata)  
- Portal reference (metadata)  
- Submission timestamp (student `submitted_by_agency_date`)

Institution-specific templates read from `upi_institutions.metadata.claim_submission_template` or billing profile metadata — configurable per institution without schema migration.

---

## Terminology (UI only)

| Internal (DB) | Business UI |
|---------------|-------------|
| Receipt | Commission payment / Received payment |
| Receipt wizard | Record commission payment |

---

## Demo data interactivity

All seeded scenarios remain editable in UI:

- Tuition, scholarship (metadata), approved amount  
- Holds, transfers, deferrals via existing lifecycle dialogs  
- Submission validation and package generation on live data  

See [DIRECT_INSTITUTION_DEMO_WALKTHROUGH.md](./DIRECT_INSTITUTION_DEMO_WALKTHROUGH.md).

---

## Out of scope (requires RFC or later phase)

- New database tables for submission packages  
- Commission engine changes  
- New business rules or lifecycle stages  
- Aggregator / B2B / referral workflows (F3.3+ after UAT)  

---

## UAT acceptance (finance manager)

When opening Claims for a direct institution, user can answer **YES** to:

- Can I submit this claim today?  
- What is preventing submission?  
- What amount should we receive?  
- What did we submit / what did the institution approve?  
- What has been paid / outstanding?  
- Can I explain every number (with snapshot + validation panel)?  

---

## Implementation files

| File | Role |
|------|------|
| `src/institutions/lib/claimBusinessView.ts` | Business derivations from existing rows |
| `src/institutions/components/claims/*` | Claim-centric UI components |
| `src/institutions/components/ClaimsPanel.tsx` | Integrated claim workspace |
| `src/institutions/components/CommissionReceiptsPanel.tsx` | Payment terminology |
