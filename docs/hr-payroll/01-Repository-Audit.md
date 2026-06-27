# 01 — Repository Audit

**Project:** Future Link ERP v2 — HR & Payroll Phase 1  
**Date:** 2026-06-24  
**Status:** Architecture freeze — analysis only (no implementation)  
**Audience:** ERP Solution Architect

---

## 1. Purpose

This document inventories the **existing** HR & Payroll implementation within the production ERP codebase. It confirms what is already built, where it lives, and how it connects to Core, CRM, and Finance.

**Rule:** Enhance the existing module at `src/hr-payroll/` and `supabase/migrations/*hr_payroll*`. Do **not** create a parallel HR system.

---

## 2. Repository Layout

| Area | Path | Role |
|------|------|------|
| HR module (UI) | `src/hr-payroll/` | 169 files — pages, components, hooks, lib, context |
| HR migrations | `supabase/migrations/20260717*` … `20260730*` (57+ files) | Schema, RLS, RPCs, triggers |
| HR QA | `qa/hr-payroll/` | 22 Vitest suites (engine, RBAC, contract) |
| HR docs | `docs/guides/HRPAYROLL MODULE/`, `docs/hr-payroll/` | Specs, UAT, roadmap |
| System map | `docs/SYSTEM_ARCHITECTURE.md` §5 | Approved module overview |
| Approved roadmap | `docs/guides/HRPAYROLL MODULE/IMPLEMENTATION_ROADMAP.md` | Locked master-data decisions |
| CRM masters UI | `src/pages/Masters.tsx`, `src/components/masters/` | Branches, departments, designations |
| CRM users | `src/pages/Users.tsx`, `profiles`, `user_roles` | Identity & CRM RBAC |
| Accounting payroll | `src/accounting/pages/payroll/`, `accounting_payroll_*` tables | Finance handoff (read-only for HR Phase 1) |
| Performance incentives | `incentive_*` tables, `fn_pull_incentives` | Bonus/incentive source |

**Entry route:** `/hr/*` mounted in `src/App.tsx` via `HrPayrollRoutes`.

---

## 3. Core Domain

### 3.1 Authentication

| Item | Location | Notes |
|------|----------|-------|
| Supabase Auth | `auth.users` | Single session for entire ERP |
| Profile bootstrap | `public.profiles` + `handle_new_user()` trigger | `20260429104225_*.sql` |
| HR ESS link | `employees.staff_id` → `auth.users.id` | Nullable until HR links employee |
| ESS bootstrap RPC | `fn_ensure_my_employee_profile` | Creates/links employee on first ESS visit |
| Portal auth (separate) | `src/pages/portal/PortalAuth.tsx` | Client portal — **not** HR ESS |

**Architecture validation:** ✅ Reuse CRM Supabase session. No separate HR login.

### 3.2 User Tables (CRM)

| Table | Purpose | HR usage |
|-------|---------|----------|
| `profiles` | `id`, `full_name`, `email`, `department_id`, `designation_id` | CRM user display; synced to `employees` via triggers |
| `user_roles` | CRM `app_role` enum (`admin`, `counselor`, …) | Org membership; separate from HR roles |
| `user_module_permissions` | Module gate (`hr_payroll`, etc.) | Controls who can open `/hr` at all |

### 3.3 HR RBAC (in-module)

| Table | Purpose |
|-------|---------|
| `role_assignments` | Maps `staff_id` → HR role + optional `scope_branch_id` |
| `role_permissions` | Per-role flags: `can_view`, `can_apply`, `can_approve`, `can_override`, `can_export`, `can_configure`, `can_manage_emp` + `screens` JSONB |
| `hr_crm_role_map` | CRM role → default HR role mapping |

**Roles:** Super Admin, Admin, HR Manager, HR Executive, Manager, Employee  
**Frontend:** `HrPayrollProvider` + `defaultAccess.ts` + DB `role_permissions`  
**RLS helpers:** `current_hr_role()`, `has_perm()`, `is_hr()`, `manages_employee()`

### 3.4 Branches

| Item | Location |
|------|----------|
| Table | `public.branches` (CRM-owned) |
| HR FK | `employees.branch_id`, `holidays.branch_id`, `accounting_payouts.branch_id` |
| UI | `/masters?section=__branches` — linked from `/hr/config/branches` |
| RLS | CRM policies only — HR does **not** duplicate branch table |

### 3.5 Departments

| Item | Location |
|------|----------|
| Table | `public.departments` — `20260519024118_*.sql` |
| HR FK | `employees.department_id`, `profiles.department_id` |
| UI | `/masters?section=__departments` |
| Sync triggers | `trg_employees_department_sync`, `trg_profiles_department_sync` |

### 3.6 Designations

| Item | Location |
|------|----------|
| Table | `public.designations` — `20260721120000_hr_payroll_crm_masters_foundation.sql` |
| HR FK | `employees.designation_id`, `profiles.designation_id` |
| UI | `/masters?section=__designations` |
| Sync triggers | `trg_employees_designation_sync`, `trg_profiles_designation_sync` |

---

## 4. HR Domain Inventory

### 4.1 Employee

| Layer | Artifacts |
|-------|-----------|
| Table | `employees` (+ 30+ extended columns across migrations) |
| Related | `employee_documents`, `employee_assets`, `salary_revision_history`, `employee_shift_history` |
| Category | `hr_employee_categories` |
| Pages | `HrEmployeesPage`, `EmployeeFormModal`, `EmployeeDetailModal`, Emp360 suite |
| Hooks | `useHrEmployees`, `useEmployeeAssets`, `useSalaryRevisions`, `useEmployeeShiftHistory` |
| CRM import | `CrmImportModal`, `fn_import_crm_staff_as_employee`, `fn_link_employee_staff` |

### 4.2 Attendance

| Layer | Artifacts |
|-------|-----------|
| Table | `attendance` |
| Exceptions | `compoff_requests`, `late_exemptions`, `mispunch_requests` |
| Engine RPCs | `fn_record_punch`, `fn_start_attendance_day`, `fn_derive_status`, weekly-off/holiday apply |
| Triggers | `attendance_derive`, `attendance_locked_guard` |
| Pages | `HrAttendancePage`, comp-off/late/mispunch sub-routes, `PunchStation`, `HrImportPage` |
| Hooks | `useHrAttendance`, `useHrAttendanceBulk`, `useAttendanceActions` |

### 4.3 Leave

| Layer | Artifacts |
|-------|-----------|
| Tables | `leave_requests`, `leave_balances`, `approvals` |
| Engine | `fn_process_leave_decision`, `fn_detect_sandwich_for_leave`, `fn_accrue_leave_balances` |
| Trigger | `leave_apply_policy`, `leave_init_approvals`, `leave_locked_guard` |
| Pages | `HrLeavePage`, `LeaveSummaryPanel` |
| Policy TS | `leavePolicy.ts` (partial duplicate of DB — known tech debt) |

### 4.4 Holiday

| Layer | Artifacts |
|-------|-----------|
| Table | `holidays` (branch + `applicable_tags`) |
| RPC | `fn_apply_holidays_for_date` |
| Page | `HrHolidaysPage` (operational + config master mode) |
| Hook | `useHrHolidays` |

### 4.5 Documents

| Layer | Artifacts |
|-------|-----------|
| Tables | `employee_documents`, `hr_document_types` |
| Storage | Supabase bucket `hr-docs` |
| Pages | `HrDocumentsPage`, `HrDocumentTypesPage`, `EmployeeDocumentsPanel`, Emp360 documents |
| Hooks | `useHrDocumentTypes` |

### 4.6 ESS (Employee Self-Service)

| Layer | Artifacts |
|-------|-----------|
| Page | `HrEssPage` — punch, leave apply, balances, payslip print, documents |
| RLS | Self-access via `current_employee_id()` |
| RPC | `fn_ensure_my_employee_profile`, `fn_record_punch`, `fn_set_ess_unavailable` |

### 4.7 Training (adjacent HR)

| Layer | Artifacts |
|-------|-----------|
| Tables | `training_records`, `training_extension_history` |
| Pages | `HrTrainingPage`, Emp360 training tab |
| Workflow | Extension + completion approval RPCs |

### 4.8 Shifts

| Layer | Artifacts |
|-------|-----------|
| Table | `shifts`, `employee_shift_history` |
| RPC | `fn_employee_shift_at` |
| Pages | `HrShiftsPage`, shift section in `EmployeeFormModal` |

---

## 5. Payroll Domain Inventory

### 5.1 Payroll Engine (database-first)

| Item | Location |
|------|----------|
| Core compute | `fn_compute_payroll` — **single source of truth** (Excel-parity) |
| Line build | `fn_build_payroll_line`, `fn_rebuild_cycle_lines` |
| Rollup | `fn_rollup_inputs`, `fn_rollup_inputs_earned`, `fn_rollup_inputs_legacy` |
| Earned days | Phase C engine — `docs/HR_PAYROLL_PHASE_C_LOCKED_SPEC.md` |
| Salary structure | `fn_resolve_employee_salary_structure`, `fn_employee_salary_structure_enabled` |
| Payable days | `fn_compute_salary_payable_days` |
| Canada | `fn_canada_income_tax`, CPP/EI via policy JSON |
| India statutory | PF, ESIC, PT in engine; TDS = flat `other_deductions` path |
| Lifecycle | `fn_process_payroll_cycle` → approve → lock → paid → reopen |
| Snapshots | `fn_capture_payroll_snapshots`, `payroll_line_snapshots`, `payroll_cycle_snapshots` |
| Incentives | `fn_pull_incentives` from Performance Hub |
| Export | `fn_export_payroll_register`, `fn_export_accounting_batch` |

**Critical rule (approved):** Client **must not** re-implement payroll maths. TS helpers (`payrollEngineLogic.ts`, `earnedDaysResolver.ts`) are for display/QA parity only.

### 5.2 Payroll Tables

| Table | Purpose |
|-------|---------|
| `payroll_cycles` | Cycle header (acts as payroll run) |
| `payroll_lines` | Per-employee per-cycle calculation + snapshots |
| `salary_slips` | Generated slip metadata + storage path |
| `salary_revision_history` | Audit of salary changes |
| `companies` | Legal entity for multi-company payroll |
| `policies` | Versioned JSON config per domain |

### 5.3 Salary / CTC / Components

| Concern | Current state |
|---------|---------------|
| CTC fields on employee | `monthly_gross`, `basic`, `hra`, `conveyance`, `special_allow`, `incentive`, `bonus`, `salary_package`, `other_allowances` |
| Salary structure flag | `salary_structure_enabled` — engine splits CTC when on |
| Component masters | **No tables** — fixed columns + policy JSON |
| Daily rate | Computed: `monthly_gross ÷ payroll_cycle_days` (stored on `payroll_lines.daily_rate`) |
| Payslip | `lib/salarySlip.ts` — browser print; embedded in ESS, Verify, Emp360 |
| UI placeholders | `/hr/config/salary-components`, `earnings`, `deductions` — Coming soon |

### 5.4 Payroll Pages

| Route | Page | Purpose |
|-------|------|---------|
| `/hr/payroll/process` | `HrCalculatorPage` | Process/rebuild cycle |
| `/hr/payroll/verify` | `HrVerifyPage` | Verification, lock, overrides, batch slips |
| `/hr/payroll/register` | `HrSalaryRegisterPage` | Current cycle register |
| `/hr/payroll/history` | `HrPayrollHistoryPage` | Past cycles |
| `/hr/config/payroll-cycle` | `HrConfigPage` tab | Cycle policy |

### 5.5 Payroll Services (frontend)

| File | Purpose |
|------|---------|
| `lib/hrApi.ts` | RPC wrapper layer |
| `lib/payrollExport.ts` | Register CSV/Excel export |
| `lib/payrollBreakdown.ts` | Line breakdown display |
| `lib/bankTransferExport.ts` | NEFT/EFT file builder (client-side) |
| `hooks/useHrPayroll.ts` | Cycle + lines data |

---

## 6. Finance Integration Points (read-only)

HR **exports to** Finance; Phase 1 must **not modify** Accounting module code.

| Integration | Direction | Mechanism |
|-------------|-----------|-----------|
| Payout batch | HR → Accounting | `accounting_payouts` table — `20260717120006_hr_payroll_integrations.sql` |
| GL payroll batches | HR → Accounting | `accounting_payroll_batches`, `accounting_payroll_lines`, `accounting_payroll_components` |
| Export RPC | HR | `fn_export_accounting_batch(cycle_id)` |
| Accounting UI | Finance | `/accounting/payroll`, `/accounting/payroll/:id` |
| Posting logic | Finance | `src/accounting/lib/payrollPosting.ts` |
| Trigger point | On lock/paid | HR emits; Accounting accrues/pays via own store |

**Contract reference:** `docs/guides/HRPAYROLL MODULE/HR PAYROLL ALL CLAUDE FILES/04_crm_integration_spec.md` §3

---

## 7. CRM Integration Points (employee references only)

| Concern | Mechanism |
|---------|-----------|
| Employee identity | `employees.staff_id` → `profiles.id` / `auth.users.id` |
| Master data | Branches, departments, designations — CRM tables, HR FKs only |
| Module access | `user_module_permissions` gates `/hr` entry |
| HR role sync | `fn_sync_hr_role_from_crm`, `fn_sync_all_crm_hr_roles` |
| Team panel | `HrTeamPanel`, `fn_list_crm_staff` |
| Staff import | Pull model (recommended) — `CrmImportModal` |
| Staff deactivate | Should set `employees.status` — partial (manual deactivate exists) |
| Performance Hub | `fn_pull_incentives` → `payroll_lines.incentive/bonus` |
| Profiles sync | Department/designation triggers keep CRM + HR aligned |

**Do not:** Create `hr_branches`, `hr_departments`, or merge CRM document types with `hr_document_types`.

---

## 8. Approved Architecture Validation

Source: `IMPLEMENTATION_ROADMAP.md`, `SYSTEM_ARCHITECTURE.md`, `04_crm_integration_spec.md`

| Domain | Validated against repo | Status |
|--------|------------------------|--------|
| Employee | `employees` + CRM FKs + Emp360 | ✅ Aligned |
| Attendance | Shift-driven engine in SQL | ✅ Aligned (shift fallback cleanup pending) |
| Leave | Category-based eligibility | ⚠️ Partial — employment-type matrix not built |
| Payroll | DB engine SSOT | ✅ Aligned |
| ESS | `/hr/me` + RLS self-access | ✅ Aligned |
| Administration | Config hub + RBAC | ⚠️ 14 config placeholders unwired |
| Master data | CRM shared + HR categories | ✅ Aligned |
| Policy readiness | `policies` table exists | ⚠️ TS constants still duplicate DB |
| Workflow readiness | `approvals` + RPCs | ✅ Core flows work; notifications missing |
| Notification readiness | Placeholder only | ❌ Not ready |
| Audit readiness | `audit_log` + snapshots | ⚠️ Partial — snapshot tables lack RLS |

---

## 9. Backend Architecture Summary

| Pattern | Detail |
|---------|--------|
| Data access | Supabase client — `.from()` + `.rpc()` |
| Business logic | PostgreSQL SECURITY DEFINER functions |
| Edge functions | **None** for HR (documented expectation unfulfilled) |
| Triggers | Attendance derive, leave policy, approval init, payroll freeze guards |
| Tests | `qa/hr-payroll/module-contract.test.ts` — canonical migration + RPC list |

---

## 10. Key Files Reference

| Concern | Primary files |
|---------|---------------|
| Routes | `src/hr-payroll/HrPayrollRoutes.tsx` |
| Nav / config structure | `src/hr-payroll/lib/moduleStructure.ts`, `lib/nav.ts`, `lib/constants.ts` |
| Access control | `src/hr-payroll/context/HrPayrollProvider.tsx`, `lib/defaultAccess.ts` |
| API layer | `src/hr-payroll/lib/hrApi.ts` |
| Schema anchor | `supabase/migrations/20260717120000_hr_payroll_schema.sql` |
| RLS anchor | `supabase/migrations/20260717120001_hr_payroll_rls.sql` |
| CRM foundation | `supabase/migrations/20260721120000_hr_payroll_crm_masters_foundation.sql` |

---

## 11. Conclusion

The repository contains a **production-grade HR & Payroll module** that is correctly embedded in the ERP. Architecture decisions (CRM-shared masters, DB payroll engine, layered RBAC, accounting handoff) are **implemented and must be preserved**.

Phase 1 implementation work should **extend** this module per `IMPLEMENTATION_ROADMAP.md` — not replace it.

**Next documents:** `02-Database-Audit.md`, `03-UI-Audit.md`, `04-Gap-Analysis.md`, `05-Implementation-Plan.md`
