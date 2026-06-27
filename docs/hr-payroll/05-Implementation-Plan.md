# 05 — Implementation Plan

**Project:** Future Link ERP v2 — HR & Payroll Phase 1  
**Date:** 2026-06-24  
**Prerequisite:** Architect sign-off on `01`–`04` audit documents  
**Rule:** No epic begins until prior epic migrations are deployed and UAT-passed where marked blocking

Epics align with `docs/guides/HRPAYROLL MODULE/IMPLEMENTATION_ROADMAP.md` Phases 1–8, extended for ERP v2 requirements (loans, advances, TDS, notifications, F&F).

---

## Step 7 — Risk Register

Consolidated risks for architect review. Mitigations are referenced in epics below.

### Breaking Changes

| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| Modifying `fn_compute_payroll` breaks TV02 golden vector | Medium | **Critical** | Extend via new params/branches only; run `qa/hr-payroll/engine-vectors.test.ts` on every engine migration |
| `formula_mode` cutover (legacy → earned) changes net pay | Medium | **High** | Keep `formula_mode = legacy` default per Phase C spec; explicit org-level cutover approval |
| Branch RLS enforcement hides records from scoped HR users | High | Medium | UAT matrix for scoped vs unscoped roles before prod deploy |
| Leave eligibility matrix changes block existing leave types | Medium | Medium | Grandfather balances; migration backfill rules |
| Editing deployed migrations in place | Low | **Critical** | **BLOCKED** — forward migrations only |

### Migration Risks

| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| 57+ existing HR migrations out of sync with Lovable/Supabase prod | Medium | **High** | Deploy checklist: `docs/LOVABLE_PUBLISH_CHECKLIST.md`; verify with `module-contract.test.ts` |
| New tables (loans, TDS) require RLS before any UI exposure | High | **High** | E0 before E7/E6; RLS in same migration as CREATE |
| SECURITY DEFINER RPC signature changes break client | Medium | Medium | Add overloads or optional params; never drop old signatures in one release |
| Snapshot table RLS migration locks out legitimate HR reads | Low | Medium | Test with all 6 HR roles before deploy |
| Demo org bootstrap policies (`00000000-…-f1`) applied to prod | Low | **Critical** | Confirm prod `org_id` ≠ demo UUID |

### Performance Risks

| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| Full-cycle `fn_rebuild_cycle_lines` on large headcount | Medium | Medium | Batch rebuild in UI; consider employee filter (already partial in Verify) |
| Dashboard loads all `payroll_lines` for cycle | Medium | Low | Paginate dashboard table; aggregate RPC if headcount > 500 |
| `audit_log` unbounded growth | High | Medium | Archive policy (Phase 2); index already on `(org_id, created_at desc)` |
| Attendance month bulk update triggers per-row derive | Medium | Medium | Existing bulk hook; avoid N+1 RPC from client |
| Report exports without date/branch filter | Low | Medium | Enforce filter bar defaults in `ReportFilterBar` |

### Security Risks

| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| Snapshot/revision tables without org RLS | **Confirmed** | **High** | Epic E0 — priority P0 |
| `scope_branch_id` stored but not enforced | **Confirmed** | **High** | Epic E0 |
| Salary visible to all HR roles (no field-level mask) | Confirmed | Medium | Phase 2; Manager already blocked from payroll screens |
| Bank/PAN in employee row visible to `manage_emp` | Confirmed | Medium | Document access policy; optional encryption Phase 2 |
| Client-side payroll math drift from DB | Low | **Critical** | **BLOCKED** — display helpers only; SSOT remains Postgres |
| Authenticated direct GRANT on snapshot tables | Confirmed | High | Replace GRANT-only with org-scoped RLS |

### Dependency Risks

| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| HR notifications require `notifications-dispatch` edge function | High | Medium | Epic E10 — coordinate template with platform team early |
| Performance Hub incentive pull depends on `incentive_payouts` schema | Medium | Medium | `fn_pull_incentives` already exists; verify view contract before cycle lock |
| Accounting GL posting owned by Finance module | Confirmed | Low | HR exports via `fn_export_accounting_batch` only — do not modify Accounting |
| CRM master changes (departments/designations) break HR FKs | Low | Medium | Soft-delete pattern on masters; HR shows inactive FK gracefully |
| Supabase pg_cron unavailable for leave accrual schedule | Medium | Low | Manual accrual RPC + document ops runbook until cron confirmed |
| Lovable publish lag on migration-heavy epics | Medium | Medium | Owner publish + hard refresh after each epic ship |

---

## Epic Overview

| Epic | Name | Complexity | Depends on |
|------|------|------------|------------|
| E0 | Security & RLS Hardening | M | — |
| E1 | Configuration SSOT & Placeholders | L | E0 |
| E2 | Shift Engine Cleanup | M | E1 |
| E3 | Leave Policy & Accrual | L | E1 |
| E4 | Attendance Exceptions & Evidence | M | E0 |
| E5 | Payroll Engine Extensions | XL | E2, E3 |
| E6 | India Statutory (TDS, LWF, Config UI) | XL | E1, E5 |
| E7 | Loan & Salary Advance | L | E5 |
| E8 | Consultant & Daily Salary Pay Modes | M | E5 |
| E9 | Final Settlement | L | E5, E7 |
| E10 | Notifications & Approval Automation | L | E1 |
| E11 | Freeze Exception & Admin Workflows | M | E0 |
| E12 | Reports & Disbursement | M | E5, E6, E7 |
| E13 | UX Polish & Orphan Cleanup | S | E1–E12 |
| E14 | QA, UAT & Documentation | M | All |

**Complexity:** S = 1–3 days, M = 1–2 weeks, L = 2–4 weeks, XL = 4+ weeks (team-dependent)

---

## Epic E0 — Security & RLS Hardening

### Objective
Close database security gaps before new features add sensitive data.

### Database changes
- New migration: RLS on `salary_revision_history`, `payroll_line_snapshots`, `payroll_cycle_snapshots`, `hr_crm_role_map`
- New migration: Enforce `role_assignments.scope_branch_id` in `emp_select`, `att_select`, `leave_select`, `line_select` predicates
- Verify demo org bootstrap policies (`20260717120008`) excluded from production org

### Files to modify
- `supabase/migrations/` — **new forward migrations only**
- `qa/hr-payroll/access-rbac.test.ts` — branch scope cases

### Components
- None (DB-only)

### Estimated complexity
**M** (1 week)

### Dependencies
None — **blocking for all other epics**

### Risks
- Branch scope may hide records from HR Exec users incorrectly — requires UAT matrix

---

## Epic E1 — Configuration SSOT & Placeholders

### Objective
Wire "Coming soon" config sections to `policies` table; eliminate TS/DB duplication.

### Database changes
- Seed policy domains: `pf`, `esic`, `lwf`, `tds`, `salary_components` (JSON schema)
- Extend `companies` if org-settings needs columns (legal name, payroll defaults)

### Files to modify
- `src/hr-payroll/pages/HrConfigPage.tsx` — remove `DEFAULT_CONFIG`; load/save policies only
- `src/hr-payroll/pages/HrConfigPolicyRoute.tsx` — route placeholders to real tabs
- `src/hr-payroll/lib/moduleStructure.ts` — remove `comingSoon` flags as wired
- `src/hr-payroll/pages/HrConfigHubPage.tsx`
- `supabase/migrations/` — policy seeds + any RPC helpers

### Components
- **EXTEND** `LateSlabGridEditor` pattern for PF/TDS slab editors
- **NEW** `OrgSettingsPanel` (companies CRUD)

### Estimated complexity
**L** (2–3 weeks)

### Dependencies
E0

### Aligns with roadmap
Phase 1 — Configuration centralization

---

## Epic E2 — Shift Engine Cleanup

### Objective
Remove hardcoded shift time fallbacks; all attendance from `fn_employee_shift_at`.

### Database changes
- Replace `COALESCE(sh.login_time, '10:00')` in `fn_derive_status`, `fn_record_punch`, rollup functions
- Migration updates to functions in `20260717120035`, `20260717120040` successors

### Files to modify
- `supabase/migrations/` — function replacements
- `qa/hr-payroll/shift-hours.test.ts`, `punch-session.test.ts`

### Components
- **EXTEND** `ShiftHistoryTable` on Emp360 summary tab
- **EXTEND** `EmployeeFormModal` — require reason on shift change (already partial)

### Estimated complexity
**M** (1–2 weeks)

### Dependencies
E1 (shift policy in SSOT)

### Aligns with roadmap
Phase 2 — Shift architecture cleanup

---

## Epic E3 — Leave Policy & Accrual

### Objective
Category-accurate accrual; employment type matrix; earned leave if approved.

### Database changes
- **NEW** `hr_employment_types` + `employees.employment_type_id`
- **NEW** `hr_leave_policy_rules` or extended `policies` domain `leave_eligibility`
- **EXTEND** `fn_accrue_leave_balances` — filter `leave_accrual_eligible`
- **EXTEND** `fn_is_leave_eligible` — matrix lookup
- Optional: pg_cron or edge scheduled accrual (document manual trigger if cron unavailable)

### Files to modify
- `src/hr-payroll/lib/leavePolicy.ts` — dedupe to call shared resolver / thin client validation
- `src/hr-payroll/pages/HrLeavePage.tsx`
- `src/hr-payroll/pages/HrConfigPage.tsx` — leave types + accrual tabs
- `src/hr-payroll/components/employees/EmployeeFormModal.tsx` — employment type field
- `qa/hr-payroll/leavePolicy.test.ts`

### Components
- **NEW** `LeaveEligibilityMatrixEditor`
- **EXTEND** `LeaveSummaryPanel`

### Estimated complexity
**L** (3–4 weeks)

### Dependencies
E1

### Aligns with roadmap
Phases 3–4 — Rule engine + leave eligibility

---

## Epic E4 — Attendance Exceptions & Photo Evidence

### Objective
Photo upload for mispunch/late evidence; promote CSV import to nav.

### Database changes
- **EXTEND** `mispunch_requests`, `late_exemptions` — `evidence_storage_path` column
- Storage policy for `hr-docs/evidence/` prefix

### Files to modify
- `src/hr-payroll/pages/HrMispunchPage.tsx`, `HrLatePage.tsx`
- `src/hr-payroll/lib/hrStorage.ts`
- `src/hr-payroll/lib/nav.ts` — add import route to config section
- `src/hr-payroll/pages/HrImportPage.tsx`

### Components
- **NEW** `EvidenceUploadField` (reuse `UploadZone` pattern from CRM docs if compatible)
- **EXTEND** `ApprovalTrail` — show evidence link

### Estimated complexity
**M** (1–2 weeks)

### Dependencies
E0

---

## Epic E5 — Payroll Engine Extensions

### Objective
Category payroll gate, consultant/daily hooks prep, arrears workflow documentation, formula cutover controls.

### Database changes
- **EXTEND** `fn_build_payroll_line` — honor `hr_employee_categories.payroll_rules_apply`
- **EXTEND** `fn_compute_payroll` — hook points for loan/advance deductions (no-op until E7)
- Document `formula_mode` cutover process (legacy → earned)

### Files to modify
- `supabase/migrations/` — function updates
- `src/hr-payroll/pages/HrVerifyPage.tsx` — formula mode indicator
- `src/hr-payroll/lib/payrollBreakdown.ts`
- `qa/hr-payroll/engine-vectors.test.ts`, `payableDaysEngine.test.ts`

### Components
- **EXTEND** `PayrollBreakdownPanel` — show formula mode + category gate
- **EXTEND** `HrCalculatorPage`

### Estimated complexity
**XL** (3–4 weeks)

### Dependencies
E2, E3

### Aligns with roadmap
Phase 6 — Payroll engine cleanup

---

## Epic E6 — India Statutory (TDS, LWF, Config UI)

### Objective
Real India TDS path; LWF calculation; wire PF/ESIC/PT/TDS config tabs.

### Database changes
- **NEW** `tax_declarations` (employee, FY, regime, sections JSON)
- **NEW** RPC `fn_compute_india_tds(gross, declarations, policy)`
- **EXTEND** `fn_compute_payroll` — India TDS branch
- **EXTEND** LWF calculation from policy
- Policy seeds for PF/ESIC/LWF/TDS domains

### Files to modify
- `src/hr-payroll/pages/HrConfigPage.tsx` — statutory tabs
- `src/hr-payroll/components/employees/EmployeeFormModal.tsx` — country-gated statutory UI
- `docs/HR_PAYROLL_POLICY_AUDIT.md` — update post-implementation

### Components
- **NEW** `TaxDeclarationForm` (ESS + HR admin)
- **NEW** `StatutorySlabEditor` (reuse slab grid pattern)
- **EXTEND** `salarySlip.ts` — TDS/LWF lines

### Estimated complexity
**XL** (4+ weeks)

### Dependencies
E1, E5

### Risks
- Finance/compliance sign-off on rates and rounding (`06_statutory_v1_scope.md`)

---

## Epic E7 — Loan & Salary Advance

### Objective
Employee loans and salary advances with payroll EMI/recovery deduction.

### Database changes
- **NEW** `employee_loans`, `loan_repayments`
- **NEW** `salary_advances`, `advance_recoveries`
- **EXTEND** `fn_compute_payroll` — subtract active recoveries
- RLS policies mirroring employee scope

### Files to modify
- `src/hr-payroll/lib/hrApi.ts` — CRUD RPCs
- `src/hr-payroll/lib/types.ts`
- `src/hr-payroll/pages/HrEmployeesPage.tsx` or new sub-route
- `src/hr-payroll/components/employees/EmployeeFormModal.tsx` — loans tab
- Emp360 — **NEW** payroll sub-tab or section for loan history

### Components
- **NEW** `LoanFormModal`, `AdvanceFormModal`, `LoanScheduleTable`
- **EXTEND** `PayrollBreakdownPanel` — loan/advance deductions

### Estimated complexity
**L** (2–3 weeks)

### Dependencies
E5 (engine hook)

---

## Epic E8 — Consultant & Daily Salary Pay Modes

### Objective
Support consultant daily-rate and daily-wage employees without breaking monthly payroll engine.

### Database changes
- **EXTEND** `hr_employee_categories` — `pay_mode` enum (`monthly`, `daily`, `consultant`)
- **EXTEND** `employees` — `daily_rate_override`, `consultant_rate`
- **EXTEND** `fn_compute_payroll` — daily mode branch

### Files to modify
- `src/hr-payroll/pages/HrEmployeeCategoriesPage.tsx`
- `src/hr-payroll/components/employees/EmployeeFormModal.tsx`
- `qa/hr-payroll/salaryStructure.test.ts` — daily mode vectors

### Components
- **EXTEND** employee form pay section — conditional fields by pay mode

### Estimated complexity
**M** (1–2 weeks)

### Dependencies
E5

---

## Epic E9 — Final Settlement (F&F)

### Objective
Exit settlement run: leave encashment, notice recovery, loan balance, final payslip.

### Database changes
- **NEW** `final_settlement_runs`, `final_settlement_lines`
- **NEW** RPC `fn_compute_final_settlement(employee_id, exit_date)`
- Link to `employees.status` transition

### Files to modify
- `src/hr-payroll/lib/hrApi.ts`
- `src/hr-payroll/pages/HrEmployeesPage.tsx` — "Process F&F" action
- Emp360 — settlement summary

### Components
- **NEW** `FinalSettlementWizard`
- **EXTEND** `salarySlip.ts` — F&F template

### Estimated complexity
**L** (2–3 weeks)

### Dependencies
E5, E7 (loan balance), E3 (leave encashment)

---

## Epic E10 — Notifications & Approval Automation

### Objective
HR notification rules for approvals, payroll deadlines, document expiry.

### Database changes
- **NEW** `hr_notification_rules`, `hr_notification_log`
- **EXTEND** triggers on `leave_requests`, `approvals`, `payroll_cycles` — enqueue notifications
- Integrate with existing `supabase/functions/notifications-dispatch` (read-only extension request to platform team)

### Files to modify
- `src/hr-payroll/pages/HrConfigPolicyRoute.tsx` — wire notifications tab
- **NEW** `src/hr-payroll/pages/HrNotificationsConfigPage.tsx`
- `src/hr-payroll/context/HrPayrollProvider.tsx` — in-app notification badge (optional)

### Components
- **NEW** `NotificationRuleEditor`
- **EXTEND** `HrDashboardPage` — pending aging alerts

### Estimated complexity
**L** (2–3 weeks)

### Dependencies
E1

### Dependency risk
Requires `notifications-dispatch` edge function template for HR events — coordinate with platform team

---

## Epic E11 — Freeze Exception & Admin Workflows

### Objective
UI to resolve `payroll_freeze_exceptions`; inline approval actions.

### Database changes
- **NEW** RPC `fn_resolve_freeze_exception(id, resolution)`
- Optional status transitions on exception table

### Files to modify
- `src/hr-payroll/pages/HrApprovalsPage.tsx` — new tab
- `src/hr-payroll/pages/HrDashboardPage.tsx` — freeze exception count
- `src/hr-payroll/lib/nav.ts` — pending count includes freeze

### Components
- **NEW** `FreezeExceptionPanel`
- **EXTEND** `HrApprovalsPage` — inline approve without navigation

### Estimated complexity
**M** (1–2 weeks)

### Dependencies
E0

### Aligns with roadmap
Phase 7 — Approval Center actions

---

## Epic E12 — Reports & Disbursement

### Objective
Statutory registers, bank file promotion, new operational reports.

### Database changes
- **NEW** RPCs or views: `v_pf_register`, `v_esic_register`, `v_tds_register` (read from locked lines)
- Optional materialized view for headcount

### Files to modify
- `src/hr-payroll/lib/moduleStructure.ts` — add report definitions
- `src/hr-payroll/pages/HrReportsPage.tsx`
- **NEW** report pages (PF, ESIC, TDS, loans, F&F, freeze audit)
- `src/hr-payroll/lib/bankTransferExport.ts` — harden formats
- `src/hr-payroll/pages/HrVerifyPage.tsx` — bank export button prominence

### Components
- **REUSE** `ReportFilterBar`, `HrReportShell`, `HrReportTable`

### Estimated complexity
**M** (2 weeks)

### Dependencies
E5, E6, E7, E9

### Aligns with roadmap
Phase 8 — Reports & analytics

---

## Epic E13 — UX Polish & Orphan Cleanup

### Objective
Remove dead code; country-gate statutory UI; simplify Verify page.

### Files to modify
- Delete or archive: `HrPlaceholderPage.tsx`, `HrPayrollCyclePage.tsx`
- `EmployeeFormModal.tsx` — country gating (per `HR_PAYROLL_POLICY_AUDIT.md`)
- `HrVerifyPage.tsx` — guided stepper (optional)
- `HrEmployeesPage.tsx` — filter bar (match Emp360 pattern)

### Estimated complexity
**S** (1 week)

### Dependencies
E1–E12 (cleanup last)

---

## Epic E14 — QA, UAT & Documentation

### Objective
Complete UAT checklist; engine regression; architect sign-off package.

### Files to modify
- `qa/hr-payroll/*` — new tests per epic
- `docs/hr-payroll/HR_PAYROLL_UAT_PROGRESS.csv` — fill test results
- `docs/hr-payroll/HR_PAYROLL_DEFECT_TRACKER.csv`
- Update `IMPLEMENTATION_ROADMAP.md` status columns

### Estimated complexity
**M** (ongoing per epic + 1 week final)

### Dependencies
All epics

### Golden anchors
- TV02 (Isha payroll vector) must pass after every engine epic
- `module-contract.test.ts` must pass in CI

---

## Suggested Execution Order

```
E0 (Security)
  └─► E1 (Config SSOT)
        ├─► E2 (Shifts)
        ├─► E3 (Leave)
        ├─► E4 (Evidence)
        └─► E10 (Notifications)
              │
E2 + E3 ──► E5 (Engine)
              ├─► E6 (India statutory)
              ├─► E7 (Loans/advances)
              ├─► E8 (Consultant/daily)
              └─► E9 (F&F)
                    │
              E5–E9 ──► E12 (Reports)
E0 ──► E11 (Freeze UI)
E1–E12 ──► E13 (Polish)
All ──► E14 (UAT)
```

---

## Cross-Cutting Rules (all epics)

1. **No new HR module** — all UI in `src/hr-payroll/`
2. **No replacement of `fn_compute_payroll`** — extend with new parameters/branches
3. **No Accounting code changes** — HR exports only
4. **No CRM master duplication** — FK to `branches`, `departments`, `designations`
5. **Forward migrations only** — never edit deployed migration files
6. **Ship pattern** — each epic: migration → RPC → hook → UI → QA test → UAT row

---

## Out of Scope (Phase 1 — defer to Phase 2 ERP)

| Feature | Reason |
|---------|--------|
| Recruitment ATS | Not in IMPLEMENTATION_ROADMAP Phases 1–8 |
| Performance appraisals | Separate module |
| Biometric hardware integration | Phase 2 per attendance options doc |
| Organization chart | New feature — not in current roadmap |
| Mobile native ESS app | Web ESS extend only |
| Form 16 / T4 PDF generation | Depends on E6 maturity + compliance review |

---

## Architect Review Checklist

- [ ] Epic order approved
- [ ] E0 branch scope behavior confirmed
- [ ] TDS scope confirmed (E6) vs finance ownership
- [ ] Loan/advance business rules document required before E7
- [ ] F&F calculation rules document required before E9
- [ ] Notification delivery channel confirmed (email vs in-app vs Slack)
- [ ] Earned-days formula cutover date (`formula_mode`) approved
- [ ] Consultant/daily pay rules approved (E8)

---

## Document Index

| # | Document |
|---|----------|
| 01 | `01-Repository-Audit.md` |
| 02 | `02-Database-Audit.md` |
| 03 | `03-UI-Audit.md` |
| 04 | `04-Gap-Analysis.md` |
| 05 | `05-Implementation-Plan.md` (this file) |

**Status:** Ready for ERP Solution Architect review. **No implementation authorized until sign-off.**
