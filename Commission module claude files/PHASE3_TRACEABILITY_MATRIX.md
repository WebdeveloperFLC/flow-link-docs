# Phase 3 Traceability Matrix — Commission Module

**Status:** Living document — update after every Phase 3 PR or migration merge.  
**Governance:** Implementation Bible §8.1 (F3.4 → F3.3 → F3.1 → F3.2). Frozen architecture docs are not modified; discrepancies → RFC.  
**Approved decisions (2026-06-30):** Sequence F3.4→F3.3→F3.1→F3.2; migrate all `ClaimsPanel` direct writes to RPCs; table `upi_commission_financial_events`; Phase 4 approval bypass via `approval_required = false`; Commission proceeds independently of Finance.

**Legend — Status:** `NS` Not Started · `IP` In Progress · `DN` Done · `BLK` Blocked · `N/A` Not applicable this phase

---

## 1. Step 0 — Preparation

| ID | Bible / Plan item | Migrations | RPCs / Functions | UI | Tests | UAT / Regression | Status | Notes |
|----|-------------------|------------|------------------|-----|-------|------------------|--------|-------|
| S0.1 | Config / feature flags (`approval_required`, event publishing flags) | `20261030120000_commission_phase3_step0_config.sql` | `commission_config_bool()`, `commission_config_text()` | — | — | — | DN | Seeds `approval_required=false` |
| S0.2 | RLS policy baseline snapshot | — (doc) | — | — | — | — | DN | `docs/commission/PHASE3_RLS_BASELINE.md` |
| S0.3 | Supabase types regeneration plan | — | — | — | — | — | NS | Run after each migration batch |
| S0.4 | RFC resolution log (D-01…D-06) | — | — | — | — | — | DN | Decisions captured in readiness report |
| S0.5 | Traceability matrix (this doc) | — | — | — | — | — | DN | Maintain through Phase 3 |

---

## 2. F3.4 — RLS Remediation on Financial Tables

| ID | Acceptance criterion | Migrations | RPCs / Functions | UI | Tests | UAT / Regression | Status | Notes |
|----|---------------------|------------|------------------|-----|-------|------------------|--------|-------|
| F3.4.1 | Replace permissive `FOR ALL` / legacy `auth_all` on financial tables | `20261030120100_commission_phase3_f34_rls_remediation.sql` | `commission_institution_country_iso()`, `accounting_user_scoped_institution()`, `can_view_commission_financial()`, `can_manage_commission_financial()`, `commission_receipt_scope_institution_id()` | — | Manual SQL in baseline doc §Verification | Phase 1–2B UAT | IP | Migration written; UAT pending |
| F3.4.2 | Entity / country scope for accounting users | same | same | — | same | 2A-12 counselor view | IP | Entity scope via `accounting_entities.country` until F5.2 |
| F3.4.3 | Split SELECT vs INSERT/UPDATE/DELETE (view ≠ mutate) | same | — | — | same | Claims workflows | IP | Fixes receipt `FOR ALL` gap |
| F3.4.4 | Counselor view unchanged (`v_client_commission_status`) | — | — | `ClientCommissionStatusPanel.tsx` | — | PF-2, 2A-12 | NS | Verify post-migration |
| F3.4.5 | Non-privileged user cannot read/write financial rows directly | same | — | — | Security matrix queries | — | IP | Plain `authenticated` denied |

**Tables in scope (F3.4):**

| Table | Scope key | Prior policy pattern |
|-------|-----------|----------------------|
| `upi_commission_students` | `institution_id` | Confidential split (20260604140000) |
| `upi_commission_invoices` | `institution_id` | Confidential split |
| `upi_claim_cycles` | `institution_id` | Confidential split |
| `upi_invoice_line_items` | via `upi_commission_invoices` | Confidential split |
| `upi_invoices` | `institution_id` | Confidential split |
| `upi_billing_profiles` | `institution_id` | `FOR ALL` confidential |
| `upi_commission_eligibility_configs` | `institution_id` | `FOR ALL` confidential |
| `upi_commission_snapshots` | `institution_id` | Select/insert split |
| `upi_commission_transfer_events` | via source student | `FOR ALL` confidential |
| `upi_commission_remittance_batches` | `institution_id` | `FOR ALL` confidential |
| `upi_commission_receipts` | `COALESCE(context_institution_id, institution_id)` | `FOR ALL` confidential |
| `upi_commission_receipt_*` | via receipt / invoice / student | `FOR ALL` confidential |
| `upi_commission_aggregator_invoices` | via aggregator lines | `FOR ALL` confidential |
| `upi_commission_aggregator_invoice_lines` | `institution_id` | `FOR ALL` confidential |

---

## 3. F3.3 — Append-Only Audit Log

| ID | Acceptance criterion | Migrations | RPCs / Functions | UI | Tests | UAT / Regression | Status | Notes |
|----|---------------------|------------|------------------|-----|-------|------------------|--------|-------|
| F3.3.1 | `upi_commission_audit_log` append-only | Planned: `*_commission_phase3_f33_audit_log.sql` | — | — | Trigger test | — | NS | Block UPDATE/DELETE |
| F3.3.2 | Every mutating financial RPC writes audit row | same + extend existing RPC migrations | All Phase 1–2B mutating RPCs + new claim RPCs | — | RPC unit / integration | — | NS | Before/after jsonb |
| F3.3.3 | Read-only audit timeline | — | `fn_list_commission_audit()` (planned) | Receipt / invoice detail panel (planned) | — | — | NS | |
| F3.3.4 | `ClaimsPanel` RPC migration emits audit | Claims RPC migration | `fn_recalc_commission_student`, `fn_submit_claim`, `fn_generate_invoice`, etc. | `ClaimsPanel.tsx` | — | Phase 1 UAT | NS | Approved cross-cutting |

---

## 4. F3.1 — Financial-Event Publishing

| ID | Acceptance criterion | Migrations | RPCs / Functions | UI | Tests | UAT / Regression | Status | Notes |
|----|---------------------|------------|------------------|-----|-------|------------------|--------|-------|
| F3.1.1 | Create `upi_commission_financial_events` | Planned: `*_commission_phase3_f31_financial_events.sql` | — | — | Schema test | — | NS | Approved table name |
| F3.1.2 | Post receipt → one pending event | same | EXTEND `fn_post_commission_receipt` | Receipt detail status badge (planned) | Parity test | **UAT-3A** | NS | `accounting_journal_id` read-only |
| F3.1.3 | Void receipt → compensating event | same | EXTEND void RPC | same | Parity test | 2A UAT | NS | NN-5: no GL post |
| F3.1.4 | Reconciliation read view | same | `v_commission_financial_events` (planned) | — | — | — | NS | Finance parallel workstream |
| F3.1.5 | Config gate `financial_events_enabled` | uses S0.1 config | `commission_config_bool()` | — | — | — | NS | Default false until F3.1 cutover |

---

## 5. F3.2 — Adjustments, Credit Notes, Debit Notes

| ID | Acceptance criterion | Migrations | RPCs / Functions | UI | Tests | UAT / Regression | Status | Notes |
|----|---------------------|------------|------------------|-----|-------|------------------|--------|-------|
| F3.2.1 | Adjustment / credit / debit tables | Planned: `*_commission_phase3_f32_adjustments.sql` | — | — | — | — | NS | Additive only |
| F3.2.2 | Correction RPCs (no original edit) | same | `fn_raise_credit_note`, `fn_raise_debit_note`, `fn_raise_adjustment` | Invoice detail actions (planned) | Immutability tests | **UAT-3C** | NS | |
| F3.2.3 | Approval gate hook (bypass until Phase 4) | uses S0.1 `approval_required=false` | RPC checks config | — | Bypass test | — | NS | No schema redesign at F4 |
| F3.2.4 | Each correction emits financial event | F3.1 + F3.2 migrations | correction RPCs | — | Event count test | UAT-3C | NS | Depends F3.1 |

---

## 6. Cross-Cutting — ClaimsPanel RPC Migration (Phase 3)

| Direct write today (`ClaimsPanel.tsx`) | Target RPC | Audit (F3.3) | Status |
|----------------------------------------|------------|--------------|--------|
| Recalc student commission (`.update` on `upi_commission_students`) | `fn_recalc_commission_student` | Yes | NS |
| Move to next cycle | `fn_carry_forward_commission_student` | Yes | NS |
| Submit claim (batch `.update`) | `fn_submit_commission_claim` | Yes | NS |
| Generate invoice + line items + link students | `fn_generate_commission_invoice` | Yes | NS |

---

## 7. Regression & UAT Matrix

| Suite | When run | Status | Owner |
|-------|----------|--------|-------|
| `docs/guides/PHASE1_COMMISSION_UAT.md` | After F3.4, each subsequent step | NS | Commission |
| `docs/guides/PHASE2A_COMMISSION_UAT.md` | After F3.4+ | NS | Commission |
| `docs/guides/PHASE2B_COMMISSION_UAT.md` | After F3.4+ | NS | Commission |
| UAT-3A Post receipt → pending event | After F3.1 | NS | Commission |
| UAT-3B Block posted receipt edit | After F3.1 (existing trigger) | NS | Commission |
| UAT-3C Credit note | After F3.2 | NS | Commission |
| Unit: `commissionRuleResolver.test.ts` | Each PR | DN (baseline) | CI |
| Unit: `commissionEligibilityEvaluator.test.ts` | Each PR | DN (baseline) | CI |
| Unit: `commissionReceiptRules.test.ts` | Each PR | DN (baseline) | CI |

---

## 8. Change Log

| Date | Author | Change |
|------|--------|--------|
| 2026-06-30 | Cursor Agent | Initial matrix; Step 0 artifacts complete; F3.4 migration written (UAT pending) |
