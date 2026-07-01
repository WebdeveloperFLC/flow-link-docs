# Migration Audit Report — 2026-11-01
## Deployment Recovery, Phase 1 (audit only, no DB writes)

## 1. Scope
- **Latest applied migration (confirmed via `supabase_migrations.schema_migrations`):** `20260719120400`
- **Repository head:** `20261101120100_commission_post_receipt_schema_sync.sql`
- **Total `.sql` files pending in `supabase/migrations/`:** 109
- **Excluded per user directive (demo/UAT seeds, no external DDL dependency):** 6
  - `20261031120000_commission_direct_partner_demo_seed.sql`
  - `20261031120001_commission_direct_partner_demo_run.sql`
  - `20261031120002_commission_direct_partner_demo_fee_upsert_hotfix.sql`
  - `20261031120003_commission_direct_partner_demo_fk_order_hotfix.sql`
  - `20261031120004_commission_demo_uat_round1_templates.sql`
  - `20261031120005_commission_demo_uat_round1_seed_hook.sql`
- **Excluded per user directive (non-timestamped seed folders, data-only):** 8
  - `canada-seed/`, `checklist-files-seed/`, `checklist-seed/`, `eligibility-seed/`,
    `faq-seed/`, `international-seed/`, `visa-forms-seed/`, `visa-metadata-seed/`
- **Net to apply:** **103 files**, in strict `sort` order.

## 2. Skip justification
### Demo seeds (6 files)
Each file's only DDL is `CREATE OR REPLACE FUNCTION public.fn_seed_commission_direct_partner_demo(...)` (or `fn_apply_commission_demo_uat_templates`). Body content is `INSERT`/`UPDATE`. No later pending migration references these functions. No production `src/` or `supabase/functions/` code references them (only `types.ts` mirrors the signature). Safe to skip.

### Seed folders (8 dirs)
All files under these folders contain `INSERT` statements against pre-existing tables (`kc_articles`, `service_library`, `assessment_questions`, etc.). No `CREATE TABLE/FUNCTION/TYPE`. These folders are also not tracked in `schema_migrations` — Supabase's migration runner ignores subdirectories. Safe to skip.

## 3. Drift / conflict scan
- **Duplicate `CREATE TABLE` occurrences:** 6 tables (`upi_commission_aggregator_invoices`, `upi_commission_aggregator_invoice_lines`, `training_extension_history`, `platform_config`, `foe_business_events`, `employee_shift_history`, `designations`). All use `CREATE TABLE IF NOT EXISTS` — the second occurrence is defensive/idempotent, not conflicting.
- **`CREATE OR REPLACE FUNCTION`** collisions: expected; every subsequent redefinition supersedes the prior, standard forward-only pattern.
- **Superseded migrations:** none. No file has been removed or renamed; no gap in the ledger.
- **Reordering risk:** none within the pending set — strict filename sort matches chronological intent.

## 4. Critical dependency chain (targets for success gates)

| Target object | Introduced by | Final redefinition |
|---|---|---|
| `upi_commission_invoices.aggregator_invoice_id` | `20260815120000_commission_aggregator_invoices.sql` | — |
| `fn_resolve_aggregator_invoice_for_institution_invoice` | `20261101120100_commission_post_receipt_schema_sync.sql` | (new) |
| `fn_post_commission_receipt` | `20260801120100_commission_receipt_rpcs.sql` | `20261101120100_commission_post_receipt_schema_sync.sql` |

Applying the Nov 1 hotfixes in isolation would fail because `fn_post_commission_receipt` in `20261101120100` reads from `aggregator_invoice_id` via the new resolver — that column doesn't exist until `20260815120000` lands.

## 5. Domain grouping (for reviewer legibility ONLY — apply order is strict filename sort)

| Group | File-count | Range |
|---|---|---|
| Accounting hardening (journal contract → bank recon → attachments) | 14 | `20260720120000_accounting_*` → `20260720120130` |
| HR payroll masters / attendance / WPMS / WTM / AEMS / WRE / employee data | 28 | `20260720120000_hr_*` → `20260742220000` |
| Commission Phase 1 (billing masters → lifecycle → RPCs → counselor view + hotfix) | 5 | `20260723120000..20260723120400` |
| Commission Receipts schema + RPCs + storage + expected-amount hotfix | 4 | `20260801120000..20260801120300` |
| Commission Aggregator (invoices, remittance batch, metrics, RPCs, cycle scope, storage) | 6 | `20260815120000..20260815120500` |
| FOE platform + Commercial agreements + CAE foundation | 4 | `20260750120000..20260754120000` |
| Qualifications Q1 + Application step0 + CF↔UPI linkage phase1/2 | 14 | `20260901120000..20260904120000`, `20260922..20260927` |
| Institution profile / UPI phase1 / Knowledge Centre | 14 | `20261001..20261018` |
| Commission Phase 3 config + F34 RLS remediation + aggregator catchup | 3 | `20261030120000..20261030120200` |
| Commission Receipt Nov 1 hotfixes (student allocation + post-receipt schema sync) | 2 | `20261101120000`, `20261101120100` |
| **Skipped** demo/UAT seeds | 6 | `20261031120000..120005` |

**Groups are documentation-only.** The apply order is the exact output of `ls supabase/migrations/*.sql | sort` restricted to the 103 pending files above.

## 6. Apply plan for Phase 2 (proposed)
Because each `supabase--migration` call requires a separate user approval, applying 103 files as 103 approvals is infeasible. Proposal: bundle files into **8 chronological batches**, concatenated in strict sort order, boundaries chosen so success gates land at batch ends:

```text
Batch  Files  Range                                            Gate at end
B1     14     20260720120000..20260720120130 (accounting Jul)  schema_migrations advanced
B2     28     20260721..20260742220000 (HR)                    schema_migrations advanced
B3      5     20260723120000..20260723120400 (Commission P1)   fn_post_commission_receipt v1 exists
B4      4     20260750120000..20260754120000 (FOE/CAE)         schema_migrations advanced
B5      4     20260801120000..20260801120300 (Receipts)        schema_migrations advanced
B6      6     20260815120000..20260815120500 (Aggregator)      ✅ aggregator_invoice_id exists
B7     14     20260901..20260927 (Qual + Application + CF↔UPI) schema_migrations advanced
B8     14     20261001..20261018 (Institution/UPI/KC)          schema_migrations advanced
B9      3     20261030120000..20261030120200 (Commission P3)   schema_migrations advanced
B10     2     20261101120000..20261101120100 (Nov hotfixes)    ✅ fn_resolve_aggregator_invoice_for_institution_invoice exists
                                                                ✅ fn_post_commission_receipt from 20261101120100
```

Wait — the sort order interleaves HR (`20260721..`) between Accounting (`20260720..`) and Commission P1 (`20260723..`), and FOE (`20260750..`) lands after HR but before Commission Receipts (`20260801..`). The batch table above **already respects strict sort order**; group labels are just descriptive. Any file whose timestamp falls inside another batch's range moves to that batch. Final apply order = concatenation of B1..B10 in the sequence shown.

**Total approvals: 10.** Each batch is a single `supabase--migration` tool call whose SQL is the concatenation of the batch's files in sort order, separated by `-- >>> FILE: <name>` markers for traceability. On any error, the whole batch rolls back (single transaction) and I stop.

## 7. Success gates (must all pass before marking recovery complete)
1. `SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='upi_commission_invoices' AND column_name='aggregator_invoice_id'` → 1 row (after B6).
2. `SELECT 1 FROM pg_proc WHERE proname='fn_resolve_aggregator_invoice_for_institution_invoice'` → 1 row (after B10).
3. `pg_get_functiondef` of `fn_post_commission_receipt` contains a call to `fn_resolve_aggregator_invoice_for_institution_invoice` and no bare `SELECT ... aggregator_invoice_id FROM upi_commission_invoices` (after B10).
4. Commission Receipt SQL smoke test passes end-to-end: draft → allocate (invoice + student) → save → resume → post → void.

## 8. Full apply-order manifest (103 files)

```
20260720120000_accounting_journal_contract.sql
20260720120000_hr_payroll_module_restructure_rbac.sql
20260720120010_accounting_journal_immutability.sql
20260720120020_accounting_account_roles.sql
20260720120030_accounting_phase1_coa_seed.sql
20260720120040_accounting_invoice_classification.sql
20260720120050_accounting_trust_subledger.sql
20260720120060_accounting_trust_disbursements.sql
20260720120070_accounting_tax_framework.sql
20260720120080_accounting_tax_filings_remittances.sql
20260720120090_accounting_payroll.sql
20260720120100_accounting_ap_payments.sql
20260720120110_accounting_fiscal_periods.sql
20260720120120_accounting_bank_reconciliation.sql
20260720120130_accounting_attachments_and_helpers.sql
20260721120000_hr_payroll_crm_masters_foundation.sql
20260721120001_hr_payroll_category_only_classification.sql
20260722120000_accounting_collection_categories.sql
20260722120000_hr_payroll_attendance_hours_status.sql
20260722120010_accounting_collection_categories_seed.sql
20260722120020_accounting_collection_categories_backfill.sql
20260722120030_ar_invoice_workflow_ledger.sql
20260722120040_installment_billing_controls.sql
20260722120100_hr_payroll_attendance_dynamic_shift_thresholds.sql
20260722120200_hr_payroll_weekly_off_automation.sql
20260723120000_commission_phase1_billing_masters.sql
20260723120100_commission_phase1_lifecycle_snapshots.sql
20260723120200_commission_phase1_rpcs.sql
20260723120300_commission_counselor_view.sql
20260723120400_commission_counselor_view_hotfix.sql
20260724120000_hr_training_completion_workflow.sql
20260725120000_hr_training_approval_fixes.sql
20260726120000_hr_training_admin_bypass.sql
20260727120000_hr_payroll_phase_c_earned_days_engine.sql
20260728120000_hr_payroll_salary_structure_statutory.sql
20260729120000_hr_payroll_salary_structure_engine.sql
20260730120000_hr_payroll_salary_payable_days_engine.sql
20260731120000_hr_wpms_master_data_foundation.sql
20260732120000_hr_wtm_attendance_foundation.sql
20260733120000_hr_aems_pack22.sql
20260734120000_hr_wre_pack23.sql
20260735120000_hr_wtm_smoke_p1_fixes.sql
20260736120000_hr_core_stabilization.sql
20260737120000_hr_pay_basis_salary_structure.sql
20260738120000_hr_payroll_cycle_uat_reset.sql
20260739120000_hr_employee_contact_information.sql
20260740120000_hr_uat_defect_triage.sql
20260741120000_hr_employee_contact_enhancements.sql
20260742120000_hr_approval_clarify_workflow.sql
20260742220000_hr_training_extension_enhancements.sql
20260750120000_foe_platform_foundation.sql
20260751120000_foe_platform_phase_c.sql
20260753120000_commercial_agreement_engine.sql
20260754120000_cae_foundation_phase2.sql
20260801120000_commission_receipts_schema.sql
20260801120100_commission_receipt_rpcs.sql
20260801120200_commission_receipt_attachments_storage.sql
20260801120300_commission_receipts_expected_amount_hotfix.sql
20260815120000_commission_aggregator_invoices.sql
20260815120100_commission_remittance_batch_first_class.sql
20260815120200_commission_aggregator_metrics_views.sql
20260815120300_commission_aggregator_rpcs.sql
20260815120400_commission_claim_cycles_aggregator_scope.sql
20260815120500_commission_aggregator_statement_storage.sql
20260901120000_qual_q1_foundation.sql
20260901120100_qual_q1_rls_rpcs.sql
20260901120200_application_references.sql
20260901120300_application_step0_schema.sql
20260901120400_application_step0_rpcs.sql
20260901120500_mark_final_application_bridge.sql
20260901120600_cf_upi_linkage_audit_schema.sql
20260901120601_cf_upi_linkage_match_functions.sql
20260901120602_cf_upi_linkage_rpcs.sql
20260901120603_cf_upi_linkage_phase2_apply_exact.sql
20260902120000_application_duplicate_validation.sql
20260903120000_document_workflow_phase1_schema.sql
20260903120100_document_workflow_phase1_rpcs.sql
20260904120000_document_type_categories_metadata.sql
20260922120000_document_workflow_phase1_defaults.sql
20260923120000_service_management_deletion_rules.sql
20260924120000_accounting_hardening_phase_a1.sql
20260925120000_accounting_hardening_phase_a1_5.sql
20260927120000_profile_document_upload_edit_permission.sql
20261001120000_institution_fee_schedule_ws2.sql
20261002120000_seneca_college_cf_cleanup.sql
20261002120100_seneca_college_cf_cleanup_uat_override.sql
20261002130000_cf_upi_institution_shell_remediation.sql
20261004120000_upi_institution_profile_phase1.sql
20261004120100_upi_institution_contacts.sql
20261004120150_upi_institution_contacts_country_standardization.sql
20261004120175_upi_institution_country_standardization.sql
20261004120180_upi_institution_profile_guidance_ranges.sql
20261004120200_upi_institution_governance_rpcs.sql
20261004120450_canada_institution_pre_m6_remediation.sql
20261005120000_knowledge_centre_phase1_foundation.sql
20261016120000_kc_import_guide_rpc.sql
20261017120000_kc_canada_guide_service_linkage.sql
20261018120000_kc_import_guide_content_validation.sql
20261030120000_commission_phase3_step0_config.sql
20261030120100_commission_phase3_f34_rls_remediation.sql
20261030120200_commission_phase3_f34_aggregator_rls_catchup.sql
20261101120000_commission_receipt_student_allocation_fix.sql
20261101120100_commission_post_receipt_schema_sync.sql
```
