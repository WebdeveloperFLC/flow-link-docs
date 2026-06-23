# Lovable Publish — Master migration checklist

**Use this after every `npm run ship`.** Approve **every** migration that still shows as pending in Lovable Publish — not only the file from the latest ship.

**Workflow:** Lovable → Sync from GitHub → Publish → tick each row below → refresh app.

---

## Performance Hub (5C–6B)

See `scripts/ship.sh` output or [`INCENTIVE_PHASE5W_DEPLOY.md`](./INCENTIVE_PHASE5W_DEPLOY.md) for the full Performance Hub chain.

Key gates:

| Block | First migration | Notes |
|-------|-----------------|-------|
| Approvals / promos | `20260619120000` | Run 5C before 5D |
| Period lock | `20260622120000` | Before payout UAT |
| Intelligence 5Q–5X | `20260703120000`–`20260710120000` | Cross-sell, A/B, margin, propensity |
| Director read-only | `20260711120000` then `20260711120001` | Enum first |

**Demo seed (UAT):** `20260716120000`–`20260716120007` (Performance Hub demo pack).

---

## CMS additive (2P + 3A–3D)

| Order | Migration | Route / feature |
|------:|-----------|-----------------|
| 1 | `20260718120004_incentive_cms_phase2p_payout_threshold.sql` | Plan payout threshold + carry |
| 2 | `20260718120000_incentive_cms_phase3a_combination_engine.sql` | `/performance/combinations` |
| 3 | `20260718120001_incentive_cms_phase3b_offer_eligibility.sql` | `/performance/offers/eligibility` |
| 4 | `20260718120002_incentive_cms_phase3c_commercial_profitability.sql` | `/performance/profitability`, `/performance/reports` |
| 5 | `20260718120003_incentive_cms_phase3d_autoapply_policy.sql` | `/performance/crm-integration` |

Deploy detail: `INCENTIVE_CMS_PHASE2P_DEPLOY.md` … `PHASE3D_DEPLOY.md`.

**CMS UI sign-off:** [`INCENTIVE_CMS_BATCH_UAT.md`](./INCENTIVE_CMS_BATCH_UAT.md) (screens 01–29).

---

## HR Payroll (00–22)

| Order | Migration | Purpose |
|------:|-----------|---------|
| 1 | `20260717120000_hr_payroll_schema.sql` | Tables, enums |
| 2 | `20260717120001_hr_payroll_rls.sql` | RLS |
| 3 | `20260717120002_hr_payroll_functions.sql` | Payroll engine |
| 4 | `20260717120003_hr_payroll_seed_demo.sql` | Baseline demo |
| 5 | `20260717120005_hr_payroll_workflows.sql` | Lock / override |
| 6 | `20260717120006_hr_payroll_integrations.sql` | Incentive + accounting |
| 7 | `20260717120007_hr_payroll_full_demo_seed.sql` | Full demo enrich |
| 8 | `20260717120008_hr_payroll_demo_rls_bootstrap.sql` | Demo org read bootstrap |
| 9 | `20260717120009_hr_payroll_crm_team_integration.sql` | CRM Team & Roles |
| 10 | `20260717120010_hr_payroll_storage.sql` | `hr-docs` bucket |
| 11 | `20260717120011_hr_payroll_leave_workflow.sql` | Leave + sandwich |
| 12 | `20260717120012_hr_payroll_policy_engine_approvals.sql` | Policy engine + approvals |
| 13 | `20260717120013_hr_payroll_lock_export_punch.sql` | Lock snapshot + export |
| 14 | `20260717120014_hr_payroll_overtime_pay.sql` | OT roll-up |
| 15 | `20260717120015_hr_payroll_punch_work_date.sql` | Punch work_date |
| 16 | `20260717120016_hr_payroll_ess_self_profile.sql` | ESS self profile |
| 17 | `20260717120017_hr_payroll_testing_changes.sql` | PT + holidays + OT merge |
| 18 | `20260717120018_hr_payroll_add_up_requirements.sql` | Phase 2A profile, doc verify, lifecycle columns |
| 19 | `20260717120019_hr_payroll_lifecycle_salary_revision.sql` | Process→Approve→Lock→Paid RPCs |
| 20 | `20260717120020_hr_payroll_canada_engine.sql` | Canada CPP/EI + lock snapshots |
| 21 | `20260717120021_hr_payroll_uat_isha_link.sql` | Link FL-1042 to free CRM admin (ESS UAT) |
| 22 | `20260717120022_hr_payroll_phase2c_rbac_snapshots.sql` | CRM RBAC bridge, Canada brackets, process/lock snapshots |

Setup: [`guides/hr-payroll-uat-guide.md`](./guides/hr-payroll-uat-guide.md)  
**HR sign-off:** [`hr-payroll/HR_PAYROLL_UAT.md`](./hr-payroll/HR_PAYROLL_UAT.md) (Sections A–I)

**Pre-UAT gate:** `npm run test:hr-payroll`

---

## Accounting A1.5 prerequisites (bridge + trust)

**Required before A1.5 service-removal UAT.** Full detail: [`guides/ACCOUNTING_A1_5_PREREQ_DEPLOY.md`](./guides/ACCOUNTING_A1_5_PREREQ_DEPLOY.md).

| Order | Migration | Purpose |
|------:|-----------|---------|
| 1 | `20260515054022_ba101861-e3aa-40a8-b074-a115182a2db9.sql` | `accounting_users` (if missing) |
| 2 | `20260516060234_26d3217e-8e4e-41f7-8f82-d354fd8e77f0.sql` | `is_accounting_user()` |
| 3 | `20260517224518_41184534-749f-4f1b-a6f7-537adc676c93.sql` | `accounting_coa` |
| 4 | `20260517224545_03c8dd52-bb78-487d-8378-a82dc661fc37.sql` | `accounting_journals` |
| 5 | `20260720120000_accounting_journal_contract.sql` | Journal contract columns |
| 6 | `20260720120040_accounting_invoice_classification.sql` | **`accounting_crm_invoice_bridge`** |
| 7 | `20260720120050_accounting_trust_subledger.sql` | **`accounting_trust_entries`** |

**Pre-flight:** `to_regclass('public.accounting_crm_invoice_bridge')` must be non-null after Publish.

**Already deployed (do not republish):** `20260924120000_accounting_hardening_phase_a1.sql`, `20260925120000_accounting_hardening_phase_a1_5.sql`.

---

## Edge functions (Lovable Publish)

Redeploy when ship touches:

- `incentive-calculate-run`
- `offers-lifecycle-tick`
- `offer-ai-studio` (if offers AI changed)

---

## After all migrations approved

| Module | Test pack |
|--------|-----------|
| Performance Hub intelligence | `INCENTIVE_PHASE5_BATCH_UAT.md` |
| CMS prototype | `INCENTIVE_CMS_BATCH_UAT.md` |
| HR Payroll | `HR_PAYROLL_UAT.md` |

**Period for Performance Hub / CMS demo:** `2026-06` on hub bar.
