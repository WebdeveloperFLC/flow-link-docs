# 02 — Database Audit

**Project:** Future Link ERP v2 — HR & Payroll Phase 1  
**Date:** 2026-06-24  
**Status:** Analysis only — no migrations written

---

## 1. Scope

All HR/Payroll tables in `supabase/migrations/*hr_payroll*` (57+ files) plus CRM shared masters and finance bridge tables referenced by HR.

Migration anchor: `20260717120000_hr_payroll_schema.sql`

---

## 2. Existing Tables — HR Core (20 base + extensions)

### 2.1 Organization & Policy

| Table | Purpose | Key FKs | Indexes | RLS |
|-------|---------|---------|---------|-----|
| `companies` | Legal payroll entities | `org_id` | — | ✅ ref_read/write |
| `shifts` | Shift master (login, grace, break, OT) | `org_id` | — | ✅ |
| `holidays` | Holiday calendar by branch/tags | `branch_id` → `branches`, `org_id` | — | ✅ |
| `policies` | Versioned JSON rules by domain | `org_id` | `idx_hr_policies_org` | ✅ |

### 2.2 Employee Master

| Table | Purpose | Key FKs | Indexes | RLS |
|-------|---------|---------|---------|-----|
| `employees` | Employee master (salary, statutory, lifecycle) | `company_id`, `branch_id`, `shift_id`, `department_id`, `designation_id`, `employee_category_id`, `reporting_mgr_id` (self), `staff_id` → auth | `idx_hr_employees_org`, `idx_hr_employees_branch`, trgm name; unique `(org_id, emp_code)` | ✅ emp_select/write |
| `employee_documents` | HR document registry | `employee_id` | `idx_hr_employee_documents_emp` | ✅ |
| `employee_assets` | Issued assets (laptop, SIM, etc.) | `employee_id` | `idx_employee_assets_emp`, status | ✅ |
| `salary_revision_history` | Salary change audit | `employee_id` | `idx_salary_revision_emp` | ❌ **No RLS** — GRANT only |
| `employee_shift_history` | Shift assignment timeline | `employee_id`, `shift_id` | `idx_employee_shift_history_emp_dates` | ✅ |

### 2.3 Time & Attendance

| Table | Purpose | Key FKs | Indexes | RLS |
|-------|---------|---------|---------|-----|
| `attendance` | Daily punch register | `employee_id`; unique `(employee_id, work_date)` | `idx_hr_attendance_org_date`, emp+date | ✅ |
| `compoff_requests` | Comp-off credit requests | `employee_id` | — | ✅ |
| `late_exemptions` | Late coming exemption requests | `employee_id` | — | ✅ |
| `mispunch_requests` | Mispunch regularization | `employee_id` | — | ✅ |

**Triggers:** `attendance_derive`, `attendance_locked_guard`, `*_init_approvals`, `*_locked_guard`

### 2.4 Leave & Approvals

| Table | Purpose | Key FKs | Indexes | RLS |
|-------|---------|---------|---------|-----|
| `leave_requests` | Leave applications | `employee_id`, optional `document_id` | `idx_hr_leave_requests_emp` | ✅ |
| `leave_balances` | Entitlement/accrual/taken | `employee_id`; unique `(employee_id, policy_year, type)` | — | ✅ |
| `approvals` | Multi-stage approval trail | Polymorphic `(entity_type, entity_id)` | `idx_hr_approvals_entity` | ✅ |

### 2.5 Training

| Table | Purpose | Key FKs | Indexes | RLS |
|-------|---------|---------|---------|-----|
| `training_records` | Training assignments | `employee_id` | — | ✅ |
| `training_extension_history` | Extension audit | `training_id` | `idx_training_extension_history_training` | ✅ |

### 2.6 Payroll

| Table | Purpose | Key FKs | Indexes | RLS |
|-------|---------|---------|---------|-----|
| `payroll_cycles` | Payroll run header | `org_id`; unique `(org_id, start_date, end_date)` | — | ✅ HR only |
| `payroll_lines` | Per-employee calculation | `cycle_id`, `employee_id`; unique pair | `idx_hr_payroll_lines_cycle` | ✅ HR + ESS self |
| `salary_slips` | Payslip artifact metadata | `payroll_line_id`, `employee_id`, `cycle_id` | `idx_hr_salary_slips_emp` | ✅ |
| `payroll_cycle_snapshots` | Policy snapshot at process/lock | `cycle_id` | `idx_payroll_cycle_snapshots_cycle` | ❌ **No RLS** |
| `payroll_line_snapshots` | Immutable line JSON at lock | `cycle_id`, `employee_id` | `idx_payroll_line_snapshots_stage` | ❌ **No RLS** |
| `payroll_freeze_exceptions` | Blocked edits during locked cycle | `cycle_id`, `employee_id` | `idx_payroll_freeze_exceptions_org` | ✅ |

### 2.7 RBAC & Audit

| Table | Purpose | Key FKs | Indexes | RLS |
|-------|---------|---------|---------|-----|
| `role_permissions` | HR permission matrix | `org_id`; unique `(org_id, role)` | — | ✅ |
| `role_assignments` | User → HR role + branch scope | `staff_id`, optional `scope_branch_id` → `branches` | unique `(org_id, staff_id)` | ✅ |
| `hr_crm_role_map` | CRM → HR role defaults | Composite PK | — | ❌ **No RLS** |
| `audit_log` | HR configuration/action log | `org_id` | `idx_hr_audit_log_org` | ✅ read HR; insert only |

### 2.8 HR Reference Masters

| Table | Purpose | Key FKs | Indexes | RLS |
|-------|---------|---------|---------|-----|
| `hr_document_types` | HR doc type master | `org_id`; unique `(org_id, code)` | `idx_hr_document_types_org` | ✅ |
| `hr_employee_categories` | Leave/accrual/payroll rule groups | `org_id` | `idx_hr_employee_categories_org` | ✅ |

---

## 3. CRM Shared Tables (used by HR — do not duplicate)

| Table | Migration | HR relationship | Modify policy |
|-------|-----------|-----------------|---------------|
| `public.branches` | CRM migrations | `employees.branch_id`, `holidays.branch_id` | **EXTEND via FK only** — never create `hr_branches` |
| `public.departments` | `20260519024118_*.sql` | `employees.department_id`, `profiles.department_id` | **EXTEND via FK only** |
| `public.designations` | `20260721120000_*.sql` | `employees.designation_id`, `profiles.designation_id` | **EXTEND via FK only** — shared with Users |
| `public.profiles` | `20260429104225_*.sql` | `employees.staff_id` link | **Do not replace** — sync via triggers |
| `public.user_roles` | CRM | Module entry separate from HR roles | **Do not modify for HR** |
| `user_module_permissions` | CRM | `hr_payroll` gate | Read only for HR |

---

## 4. Finance Bridge Tables (integration — do not modify in HR Phase 1)

| Table | Purpose | HR writes? |
|-------|---------|------------|
| `accounting_payouts` | Per-employee payout export on lock | ✅ via `fn_export_accounting_batch` |
| `accounting_payroll_batches` | GL accrual/payment batch | ❌ Accounting module owns |
| `accounting_payroll_lines` | Batch employee lines | ❌ |
| `accounting_payroll_components` | GL posting legs | ❌ |

---

## 5. Storage (not tables)

| Bucket | Migration | Purpose |
|--------|-----------|---------|
| `hr-docs` | `20260717120010_hr_payroll_storage.sql` | Employee document files |

---

## 6. Key Relationships (ERD summary)

```
companies ──< employees >── branches (CRM)
departments (CRM) ──< employees
designations (CRM) ──< employees
hr_employee_categories ──< employees
shifts ──< employees ──< employee_shift_history

employees ──< attendance (unique per work_date)
employees ──< leave_requests ──< approvals
employees ──< leave_balances
employees ──< compoff_requests | late_exemptions | mispunch_requests
employees ──< training_records
employees ──< employee_documents | employee_assets
employees ──< payroll_lines >── payroll_cycles
payroll_lines ──< salary_slips

role_assignments.staff_id ── auth.users.id
employees.staff_id ── auth.users.id
```

---

## 7. RPC Functions (~90)

Grouped for architect review. Full contract list: `qa/hr-payroll/module-contract.test.ts`.

| Domain | Key RPCs |
|--------|----------|
| RLS helpers | `current_hr_role`, `has_perm`, `is_hr`, `manages_employee`, `current_employee_id` |
| Payroll engine | `fn_compute_payroll`, `fn_build_payroll_line`, `fn_rebuild_cycle_lines`, `fn_rollup_inputs_*`, `fn_compute_salary_payable_days`, `fn_resolve_employee_salary_structure` |
| Cycle workflow | `fn_process_payroll_cycle`, `fn_approve_payroll_cycle`, `fn_lock_payroll_cycle`, `fn_mark_payroll_paid`, `fn_reopen_payroll_cycle`, `fn_capture_payroll_snapshots` |
| Attendance | `fn_record_punch`, `fn_start_attendance_day`, `fn_derive_status`, `fn_apply_weekly_offs_*`, `fn_apply_holidays_for_date` |
| Leave | `fn_process_leave_decision`, `fn_detect_sandwich_for_leave`, `fn_accrue_leave_balances`, `fn_validate_leave_*` |
| Approvals | `fn_process_approval_decision`, `fn_init_entity_approvals`, `fn_can_approve_stage` |
| CRM | `fn_sync_hr_role_from_crm`, `fn_import_crm_staff_as_employee`, `fn_link_employee_staff`, `fn_ensure_my_employee_profile` |
| Export | `fn_export_payroll_register`, `fn_export_accounting_batch`, `fn_pull_incentives` |
| Canada | `fn_canada_income_tax` |
| Training | `fn_extend_training`, `fn_request_training_completion`, `fn_finalize_training_on_approve` |

---

## 8. Potential Duplicates (must avoid in Phase 1)

| Risk | Existing canonical | Do NOT create |
|------|-------------------|---------------|
| Branch master | `public.branches` | `hr_branches` |
| Department master | `public.departments` | `hr_departments` |
| Designation master | `public.designations` | `hr_designations` |
| CRM document types | `master_items.document_types` | Merge with `hr_document_types` |
| Payroll run | `payroll_cycles` | `payroll_runs` |
| User identity | `profiles` + `employees.staff_id` | Separate `hr_users` |
| Incentive/bonus | Performance Hub `incentive_payouts` | Duplicate commission tables in HR |
| Accounting payroll | `accounting_payroll_*` | Parallel HR GL tables |

---

## 9. Tables That Must Never Be Modified (schema-breaking)

These are **CRM/Core** tables. HR may add FKs **to** them but must not alter their ownership or duplicate them.

| Table | Reason |
|-------|--------|
| `public.branches` | CRM master — single source |
| `public.departments` | CRM master — shared with Users |
| `public.profiles` | Auth-linked identity |
| `auth.users` | Supabase auth |
| `public.user_roles` | CRM role model |
| `accounting_payroll_batches` | Finance owns GL lifecycle |
| `accounting_payroll_lines` | Finance owns |
| `accounting_payroll_components` | Finance owns |

### Engine functions — extend, do not replace

| Function | Reason |
|----------|--------|
| `fn_compute_payroll` | Excel-parity anchor — extend via params/modes only |
| `fn_apply_priority_matrix_c17` | Phase C locked spec |
| RLS helpers in `20260717120001` | Changing breaks all policies |

---

## 10. Tables That Should Be Extended (not replaced)

| Table | Extension needed |
|-------|-------------------|
| `employees` | Loan/advance flags, employment_type_id FK, consultant pay mode — **add columns** |
| `payroll_lines` | Component line items or loan deduction columns — **add columns / child table** |
| `policies` | New domains: `tds`, `pf`, `notifications`, `loans` — **insert rows** |
| `role_assignments` | Enforce `scope_branch_id` in RLS — **policy change only** |
| `leave_requests` | Photo evidence path — **add column** |
| `mispunch_requests` | `evidence` already exists — extend storage link |
| `companies` | Org settings UI fields — **add columns if needed** |
| `hr_employee_categories` | Consultant/daily-salary flags — **add columns** |
| `audit_log` | Broader action coverage — **use existing insert pattern** |

---

## 11. Missing Tables (approved requirements not yet modeled)

| Proposed table | Requirement | Priority |
|----------------|-------------|----------|
| `employee_loans` + `loan_repayments` | Loan EMI deduction | P0 |
| `salary_advances` + `advance_recoveries` | Salary advance | P0 |
| `payroll_component_definitions` | Salary component master | P1 |
| `payroll_line_components` | Flexible earnings/deductions per line | P1 |
| `hr_employment_types` | Employment type master | P1 |
| `hr_leave_types` | Configurable leave types | P1 |
| `hr_leave_policy_rules` | Category × type eligibility matrix | P1 |
| `tax_declarations` | India TDS declarations | P0 |
| `final_settlement_runs` + lines | F&F on exit | P0 |
| `hr_notification_rules` + `hr_notification_log` | Notification engine | P0 |
| `attendance_devices` + sync log | Biometric integration | P2 |
| `statutory_remittance_batches` | PF/ESIC/PT filing tracking | P1 |

**Note:** Consultant pay, daily salary, and bonus may initially be modeled by **extending** `employees` + `hr_employee_categories` + `payroll_lines` before new tables if architect prefers minimal schema churn.

---

## 12. Index & Performance Notes

| Observation | Risk | Recommendation |
|-------------|------|----------------|
| `leave_requests` filtered by org+status in UI | Seq scan at scale | Add `(org_id, status)` via employee join or denormalized `org_id` |
| `attendance` bulk month queries | Moderate | Existing emp+date index adequate for <5k employees |
| `payroll_lines` full cycle fetch | Dashboard loads all lines | Paginate in UI; index adequate |
| `audit_log` unbounded growth | Storage | Archive policy (P2) |
| SECURITY DEFINER RPCs | All payroll compute | Keep; client must not aggregate in JS |

---

## 13. Security Gaps (database layer)

| Gap | Severity | Tables affected |
|-----|----------|-----------------|
| No RLS on snapshot tables | **High** | `payroll_line_snapshots`, `payroll_cycle_snapshots` |
| No RLS on salary revision | **High** | `salary_revision_history` |
| `scope_branch_id` not in RLS predicates | **High** | All employee-scoped tables |
| Demo org bootstrap policies | **Medium** | `20260717120008` — must not apply to prod org |
| `service_role` bypass documented | **Low** | No HR edge functions today |

---

## 14. Migration Inventory

**57+ files** matching `*hr_payroll*` in `supabase/migrations/`.

Canonical required set validated by `qa/hr-payroll/module-contract.test.ts` (48 migrations listed).

**Do not squash or reorder** existing migrations in production. All Phase 1 changes = **new forward migrations only**.

---

## 15. Conclusion

The database layer is **mature and architecturally sound** for core payroll. Gaps are **additive**: loans, advances, F&F, TDS declarations, component masters, notification rules, and RLS hardening.

**Extend** `employees`, `policies`, `payroll_lines` before creating parallel structures. **Never duplicate** CRM masters or the payroll compute function.
