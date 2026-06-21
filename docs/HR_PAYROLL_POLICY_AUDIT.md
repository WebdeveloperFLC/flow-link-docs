# HR Payroll Structure & Policy Enhancement — Audit Report

**Date:** 2026-06-19  
**Scope:** Review only — no payroll formula changes implemented.  
**Purpose:** Baseline for country-specific statutory compliance, employment-type leave policies, and configuration-driven payroll structure.

---

## Executive Summary

| Area | Status | Gap |
|------|--------|-----|
| Leave eligibility (Category + Employment Type) | Partial | DB uses **category only**; legacy `eligible_employment_types` policy orphaned; no per-leave-type matrix |
| Earned Leave | Not implemented | Only Casual, Sick, Unpaid exist |
| Statutory UI (India vs Canada) | Not country-gated | All India fields shown for every employee |
| Payroll engine country split | Implemented | Canada uses `pf_employee`/`esic_employee` columns for CPP/EI; LWF not calculated |
| Configuration-driven policies | Partial | Late slabs + mispunch + leave entitlements in `policies`; many TS constants duplicate DB |
| Employee filters | Partial | Reports/Emp360/Attendance have masters; Employee Master, Leave, Late, Mispunch lack full filter bars |
| Employment Type master | Missing | Legacy `employment_type` text column; no UI field; conflated with category in filters |

---

## 1. Leave Policy Audit

### 1.1 Current Logic

#### Frontend (`src/hr-payroll/lib/leavePolicy.ts`)

| Function / constant | Behavior |
|---------------------|----------|
| `isLeaveEligible()` | Requires `hr_employee_categories.leave_eligible`; blocks category code `probation`; `work_hours >= 8`; `status === 'On Probation'`; probation end (explicit or DOJ + 90 days). **Does not read `employment_type`.** |
| `PAID_APPLY_LEAVE_TYPES` | Hardcoded `["Casual Leave", "Sick Leave"]` — **no Earned Leave** |
| `MONTHLY_PAID_LEAVE_CAP` | Hardcoded `1.5` |
| `LEAVE_ENTITLED` / `LEAVE_ENTITLED_5DAY` / `LEAVE_ENTITLED_5DAY_NIGHT` | Hardcoded annual entitlements (12+6, 7+3, 7+3+annual 10) |
| `LEAVE_ACCRUAL` | Hardcoded casual 1.0 / sick 0.5 per month (TS only; accrual RPC does not import these) |
| `validateLeaveNotice()` | Hardcoded 7 / 30 / 3-day threshold |
| `validateSickLeaveRules()` | Hardcoded 2-hour notice; cert after 1 sick day/month |
| `resolveLeaveApplication()` | Paid leave gated by `isLeaveEligible()`, balances, monthly cap, notice, sick rules |
| `leaveEntitlementsForEmployee()` | Work week + night shift only — not category/employment type |

#### Database (latest authoritative: `20260721120001_hr_payroll_category_only_classification.sql`)

| Function | Behavior |
|----------|----------|
| `fn_is_leave_eligible(p_employee)` | **Replaced** employment-type check with `hr_employee_categories.leave_eligible` + probation gates (same as TS, minus explicit `probation` category code block in SQL — only `c.code = 'probation'`). **Does not use `employment_type` or `eligible_employment_types`.** |
| `fn_leave_entitlement_for_employee()` | Work week + 5-day night EST; reads `policies` domain `leave` keys (`six_day_casual`, etc.) |
| `fn_accrue_leave_balances()` | Monthly +1.0 Casual / +0.5 Sick for **all** non-terminated employees. **Does not filter `leave_accrual_eligible`.** |
| `fn_validate_leave_notice()` | Hardcoded 7 / 30 / 3 in migration 35 — **does not read policy JSON** (unlike entitlements) |
| `fn_validate_sick_leave_rules()` | Policy-aware sick notice hours + cert threshold via `fn_leave_policy_config` |

#### Orphaned / superseded logic (`20260717120035_hr_payroll_policy_rules_engine.sql`)

- Policy seed still includes `"eligible_employment_types": ["Full time - Permanent"]`.
- Original `fn_is_leave_eligible` checked `employment_type` against that JSON array.
- **Superseded** by category-only function in `20260721120001` — config key is **dead** for eligibility.

#### Employee categories (`hr_employee_categories` seed)

| Code | Label | leave_eligible | leave_accrual_eligible |
|------|-------|----------------|------------------------|
| permanent | Permanent | true | true |
| probation | Probation | false | false |
| contract | Contract | false | false |
| consultant | Consultant | false | false |
| intern | Intern | false | false |
| part_time | Part Time | false | false |
| india_staff | India Staff | true | true |
| canada_staff | Canada Staff | true | true |

- Single boolean per category — **no per-leave-type matrix** (Casual / Sick / Earned × Yes / Limited / No).
- Categories overlap conceptually with requested Employment Types but also include Consultant, India Staff, Canada Staff (org slices, not employment types).

#### Leave types in schema

- Enum / records: **Casual Leave**, **Sick Leave**, **Unpaid Leave** only.
- **Earned Leave does not exist** in balances, requests, or policy UI.

#### Config UI (`HrConfigPage.tsx` Leave tab)

- Editable: entitlements (6-day/5-day/night), monthly cap, notice, sick rules, probation leave text, carry-forward.
- **Not editable:** `eligible_employment_types`, category×type matrix, per-type eligibility.
- `moduleStructure.ts` marks **Leave Types** and **Leave Accrual** hubs as `comingSoon`.

### 1.2 Required Changes (vs spec)

| Requirement | Current | Needed |
|-------------|---------|--------|
| Eligibility by **Employee Category + Employment Type** | Category boolean only | Matrix or rule rows keyed by `(category_id, employment_type_id, leave_type)` with values `yes` / `limited` / `no` |
| Employment types: Permanent, Probation, Contract, Intern, Part-Time, Temporary | Legacy text values (`Full time - Permanent`, etc.); no master; no form field | `hr_employment_types` master + `employees.employment_type_id`; seed six types |
| Example: Probation → Sick Yes, Casual Limited, Earned No | Probation category = fully ineligible | Per-type rules independent of single boolean |
| Earned Leave | Not in system | Add leave type + balance + policy columns if product confirms |
| Accrual eligibility | Ignores `leave_accrual_eligible` | Filter accrual RPC + TS by category flag **and** matrix |
| Approval rules | Same `fn_is_leave_eligible` gate | Extend triggers (`trg_leave_*`) to matrix |
| TS ↔ DB parity | Divergent eligibility sources | Single resolver used by UI, RPC, triggers |

### 1.3 Target Policy Matrix (spec example)

| Employment Type | Casual Leave | Sick Leave | Earned Leave |
|-----------------|--------------|------------|--------------|
| Permanent | Yes | Yes | Yes |
| Probation | Limited | Yes | No |
| Contract | No | No | No |
| Intern | No | No | No |

**Recommended storage:** `hr_leave_policy_rules` table or `policies` domain `leave_eligibility` JSON:

```json
{
  "rules": [
    { "employment_type_code": "permanent", "employee_category_code": null, "leave_type": "Casual Leave", "eligibility": "yes" },
    { "employment_type_code": "probation", "leave_type": "Casual Leave", "eligibility": "limited", "monthly_cap": 0.5 }
  ]
}
```

Category-specific overrides: non-null `employee_category_id` takes precedence over employment-type-only row.

### 1.4 Files Impacted (implementation phase)

| Layer | Files |
|-------|-------|
| Migrations | New migration for employment types + leave matrix; replace `fn_is_leave_eligible`, `fn_accrue_leave_balances`, leave request triggers |
| TS policy | `src/hr-payroll/lib/leavePolicy.ts`, `qa/hr-payroll/leavePolicy.test.ts` |
| Config | `HrConfigPage.tsx`, `moduleStructure.ts`, `HrConfigPolicyRoute.tsx` |
| Employee | `EmployeeFormModal.tsx` (employment type field), `HrEmployeeCategoriesPage.tsx` |
| Leave UX | `HrLeavePage.tsx`, `useHrRequests` hooks |
| Types | `src/hr-payroll/lib/types.ts`, `src/integrations/supabase/types.ts` |
| Holidays | `fn_apply_holidays_for_date` (category tags today — may need employment type tags) |

---

## 2. Statutory Audit (Employee Master)

### 2.1 Residence / country field

| Field | Location | Notes |
|-------|----------|-------|
| `payroll_country` | `employees` (`IN` / `CA`) | Drives payroll engine branch; shown on Employment tab |
| `nationality` | `employees` | Free text on Basic tab — **not used for statutory gating** |
| `residence_country` | **Does not exist** | Spec says "Residence Country = India" — **clarify:** use `payroll_country` or add `residence_country` |

**Recommendation:** Gate statutory UI on `payroll_country` (already aligned with payroll entity region in `EmployeeFormModal`). Optionally sync from CRM nationality with explicit override.

### 2.2 Existing Fields (`employees` + form)

| Field | DB | India UI (`EmployeeFormModal` statutory tab) | Canada need |
|-------|-----|---------------------------------------------|-------------|
| `has_pf_account` / `pf_applicable` | Yes | Shown (all countries) | Should hide |
| `pf_number`, `uan` | Yes | Shown | Should hide |
| `has_esic_account` / `esic_applicable` | Yes | Shown | Should hide |
| `esic_number` | Yes | Shown | Should hide |
| `pt_applicable` | Yes | Shown | Should hide |
| `tds_applicable` | Yes | Shown as "TDS applicable" | Rename / split → Income Tax |
| `lwf_applicable` | Yes | Shown | Should hide |
| `other_deductions` | Yes | Shown (₹/mo) | Show (CAD/mo) |
| PF employer contribution % | **No** | **No** | N/A |
| ESIC employer contribution % | **No** | **No** | N/A |
| `cpp_applicable` | **No** | **No** | **Required** |
| `ei_applicable` | **No** | **No** | **Required** |
| `income_tax_applicable` | **No** | **No** | **Required** (today `tds_applicable` reused in engine for Canada) |

### 2.3 Reusable Fields

| Field | Reuse for |
|-------|-----------|
| `other_deductions` | India + Canada monthly other deductions |
| `payroll_country` | Country branch in engine + UI gating |
| `tds_applicable` | India TDS; **could** map to Canada income tax until `income_tax_applicable` exists |
| `policies.canada_deductions` | CPP/EI **rates** (not per-employee flags) — `cpp_rate`, `ei_rate`, `income_tax_mode`, `income_tax_flat` |

### 2.4 New Fields Required

| Column | Type | Purpose | Migration |
|--------|------|---------|-----------|
| `employment_type_id` | uuid FK → `hr_employment_types` | Separate from category | Yes |
| `pf_employee_contribution_pct` | numeric nullable | Override default 12% (optional) | Yes (if storing overrides) |
| `pf_employer_contribution_pct` | numeric nullable | Display + future employer cost reporting | Yes |
| `esic_employee_contribution_pct` | numeric nullable | Override default 0.75% | Yes (optional) |
| `esic_employer_contribution_pct` | numeric nullable | Override default 3.25% | Yes |
| `cpp_applicable` | boolean default false | Canada | Yes |
| `ei_applicable` | boolean default false | Canada | Yes |
| `income_tax_applicable` | boolean default false | Canada (replace overloading `tds_applicable`) | Yes |

**Note:** Spec asks for PF/ESIC contribution fields on India — today engine **calculates** employee share only; employer share is not stored or displayed.

### 2.5 UI Changes Required (`EmployeeFormModal.tsx` ~lines 1134–1210)

- **India (`payroll_country === 'IN'`):** PF block, ESIC block, PT, LWF, TDS, Other deductions.
- **Canada (`payroll_country === 'CA'`):** Hide PF, ESIC, PT, LWF; show CPP Applicable, EI Applicable, Income Tax Applicable, Other Deductions — **no** employee/employer share fields for CPP/EI.

---

## 3. Payroll Audit

### 3.1 India (`fn_compute_payroll` — `20260717120022_hr_payroll_phase2c_rbac_snapshots.sql`)

| Deduction | Implemented | Source | Notes |
|-----------|-------------|--------|-------|
| PF (employee) | Yes | `p_pf_applicable`, basic × 12%, wage cap ₹15,000 | Rates/cap partially in `p_late_policy` JSON (`pf_ceiling`) |
| PF (employer) | **No** | — | Not in net pay calc |
| ESIC (employee) | Yes | `p_esic_applicable`, gross × 0.75% if monthly ≤ ₹21,000 | `esic_ceiling` in late policy JSON |
| ESIC (employer) | **No** | — | |
| Professional Tax | Yes | `p_pt_applicable`, `p_pt_amount` from `professional_tax` policy | Default ₹200 |
| TDS | Partial | Folded into `pt_employee` when `tds_applicable` + `other_deductions` | Not separate line item |
| LWF | **No** | `lwf_applicable` on employee unused in engine | Column exists (migration 18) |
| Other deductions | Yes | `p_other_deductions` when TDS applicable | |

**Payroll line columns:** `pf_employee`, `esic_employee`, `pt_employee` — India semantics.

### 3.2 Canada (same function, `v_is_ca` branch)

| Deduction | Implemented | Source | Notes |
|-----------|-------------|--------|-------|
| CPP | Yes | `gross × cpp_rate` stored in **`pf_employee`** column | Rate from `canada_deductions` policy |
| EI | Yes | `gross × ei_rate` stored in **`esic_employee`** column | Same mapping |
| Income Tax | Yes | `fn_canada_income_tax()` → **`pt_employee`** | Uses `tds_applicable` as gate |
| Other deductions | Yes | Policy `other_deductions` + employee `other_deductions` | |

**Cross-contamination guard:** Engine branches on `payroll_country` — India formulas never run for CA; Canada formulas never run for IN. **UI/report labels** still show PF/ESIC/PT headers for Canadian rows (presentation gap).

### 3.3 TS mirror (`src/hr-payroll/lib/payrollEngineLogic.ts`)

- Mirrors SQL logic for CI (`qa/hr-payroll/payrollEngine.test.ts`).
- Same India/Canada split; same column name mapping for Canada.

### 3.4 Config hubs status (`moduleStructure.ts`)

| Hub | Route | Status |
|-----|-------|--------|
| PF config | `/hr/config/pf` | `comingSoon` |
| ESIC config | `/hr/config/esic` | `comingSoon` |
| Professional Tax | `/hr/config/professional-tax` | Active (`HrConfigPage`) |
| Canada deductions | `/hr/config/canada-deductions` | Active (`HrConfigPage`) |
| LWF | — | No hub |

---

## 4. Hardcoded vs Configurable Audit

| File | Function / area | Current hardcoded value | Recommended configuration source | Migration required |
|------|-----------------|-------------------------|----------------------------------|--------------------|
| `leavePolicy.ts` | `PAID_APPLY_LEAVE_TYPES` | Casual + Sick only | `hr_leave_types` master or policy `applicable_leave_types` | Yes (if Earned added) |
| `leavePolicy.ts` | `MONTHLY_PAID_LEAVE_CAP` | 1.5 | `policies.leave.monthly_paid_cap` (seeded; TS ignores RPC path) | No (wire TS to policy) |
| `leavePolicy.ts` | `LEAVE_ENTITLED` etc. | 12/6, 7/3, 10 annual | `policies.leave` keys (already seeded) | No (wire TS to policy) |
| `leavePolicy.ts` | `LEAVE_ACCRUAL` | 1.0 / 0.5 | `policies.leave` accrual keys + matrix eligibility | Yes |
| `leavePolicy.ts` | `isLeaveEligible` | Category + probation rules | `fn_is_leave_eligible` + matrix | Yes |
| `leavePolicy.ts` | `NOTICE_DAYS_*` | 7, 30, 3 | `policies.leave` (UI editable; `fn_validate_leave_notice` hardcoded) | Yes (fix SQL) |
| `leavePolicy.ts` | `SICK_*` | 2 hours, 1 day/month | `policies.leave` (partially in DB) | No |
| `leavePolicy.ts` | `DEFAULT_LATE_SLAB_TABLE` | 9 slabs ending 5.0 | `policies.late.slab_table` | No (exists) |
| `leavePolicy.ts` | `lateDeductionFormula` | 1.0 + floor((n-1)/3)×0.5 | `policies.late` continuation rule | Optional |
| `leavePolicy.ts` | `SANDWICH_CAP_PER_YEAR` | 2 | `policies.sandwich_ul` | No |
| `HrConfigPage.tsx` | `DEFAULT_CONFIG` | Mirrors seeds | `policies` table | No |
| `fn_late_deduction` (SQL) | fallback CASE | 0–5 day tiers when no slab_table | `policies.late.slab_table` | No |
| `fn_mispunch_deduction` | defaults | free=2, rate=0.5 | `policies.mispunch` | No |
| `payrollEngineLogic.ts` | `mispunchDeductionDays` | free=2, ×0.5 | `policies.mispunch` | No |
| `fn_compute_payroll` | PF rate / ceiling | 12%, ₹15,000 | `policies` PF domain or employee override | Yes (PF hub) |
| `fn_compute_payroll` | ESIC rate / ceiling | 0.75%, ₹21,000 | `policies` ESIC domain | Yes (ESIC hub) |
| `fn_compute_payroll` | Canada CPP/EI | 0.0595 / 0.0166 | `policies.canada_deductions` | No |
| `fn_compute_payroll` | UL multiplier | 2 | `policies.sandwich_ul.ul_mult` | No |
| `fn_compute_payroll` | Basic default | 50% of monthly | Salary structure config | Optional |
| `fn_compute_payroll` | OT paid mode | multiplier 1.5, min 30 min | `policies.overtime` | No |
| `fn_accrue_leave_balances` | accrual amounts | +1.0 casual, +0.5 sick | `policies.leave` + eligibility | Yes |
| `fn_is_leave_eligible` (21120001) | probation window | 3 months | `policies.leave.probation_months` | Optional |
| `shifts` table | work_hours, grace_min, half_day_after_min | Per-shift defaults | Shift master (`HrShiftsPage`) | No |
| `shifts` table | full_day_after_min, break window | 180 min, 13:00–14:30 | Shift master | No |
| `format.ts` | `weeklyOffDays` | Derived from `working_days_per_week` | Shift master (6-day vs 5-day) | No |
| `holidayFilters.ts` / `fn_apply_holidays` | category tags | permanent, probation, … | Holiday `applicable_tags` + category codes | No |
| `policies` seed (35) | `eligible_employment_types` | `["Full time - Permanent"]` | **Remove or wire to new matrix** | Yes |
| `HrAttendancePage.tsx` | grace display | `shift.grace_min ?? 5` | Shift master | No |
| `EmployeeFormModal.tsx` | statutory labels | India fields always | Conditional on `payroll_country` | No (UI only) |
| `emp360Filters.ts` | `EMP360_COUNTRY_OPTIONS` | IN, CA | CRM country master if shared | Optional |
| `constants.ts` | leave type strings | Casual/Sick/Unpaid | Leave types master | Yes |

---

## 5. Employee Filters & Master Data Validation

### 5.1 Filter dimensions

| Dimension | Master source | Hardcoded? |
|-----------|---------------|------------|
| Country | `payroll_country` IN/CA | Options hardcoded in filter libs |
| Branch | `branches` (CRM) | No |
| Payroll company | `companies` | No |
| Department | `departments` | No |
| Designation | `designations` | No |
| Employee category | `hr_employee_categories` | No |
| Employment type | Legacy `employment_type` text + category label fallback | **No master — derived labels** |
| Employee | `employees` | No |

### 5.2 Screen coverage

| Screen | Country | Branch | Company | Dept | Designation | Category | Employment type | Employee | Notes |
|--------|---------|--------|---------|------|-------------|----------|-----------------|----------|-------|
| All 9 Reports | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ (label) | ✓ | `ReportFilterBar` |
| Emp 360 list | ✓ | ✓ | ✓ | ✓ | ✓ | — | ✓ (label) | search | `Emp360FilterBar` |
| Attendance register | ✓ | ✓ | ✓ | ✓ | ✓ | — | ✓ | search | `AttendanceFilterBar` |
| Payroll Verify | ✓ | ✓ | ✓ | — | — | — | — | — | Cycle + date + status |
| Employee Master | — | — | — | — | — | — | — | search only | **Gap** |
| Leave | — | — | — | — | — | — | — | — | Date filters only |
| Comp-Off / Late / Mispunch | — | — | — | — | — | — | — | — | **Gap** |
| Salary Register | — | — | — | — | — | — | — | — | **Gap** |
| Payroll History | — | — | — | — | — | — | — | — | **Gap** |
| Approval Center | — | — | — | — | — | — | — | — | Category tabs only |
| Dashboard | — | — | — | — | — | — | — | — | **Gap** |

### 5.3 Employment type filter issue

- `employmentTypeLabel()` prefers legacy `employment_type` string over category label.
- Filter matches **display label**, not master ID — breaks when labels drift.
- **No** `employee_category_id` filter on Emp360/Attendance (reports have `categoryId`).

**Recommendation:** Add `hr_employment_types` master; filters use `employment_type_id`; add category filter to Emp360/Attendance; reuse `ReportFilterBar` on ops pages.

---

## 6. Database Changes Summary

### 6.1 New tables

| Table | Purpose |
|-------|---------|
| `hr_employment_types` | org-scoped master: Permanent, Probation, Contract, Intern, Part-Time, Temporary |
| `hr_leave_policy_rules` | `(org_id, employee_category_id?, employment_type_id, leave_type, eligibility, limited_cap?)` — or structured JSON in `policies` |
| `hr_leave_types` (optional) | If leave types should be configurable beyond enum |

### 6.2 New columns on `employees`

| Column | Notes |
|--------|-------|
| `employment_type_id` | FK to `hr_employment_types`; migrate from `employment_type` text |
| `cpp_applicable` | boolean |
| `ei_applicable` | boolean |
| `income_tax_applicable` | boolean |
| `pf_employer_contribution_pct` | numeric nullable |
| `esic_employer_contribution_pct` | numeric nullable |
| `pf_employee_contribution_pct` | numeric nullable (optional override) |
| `esic_employee_contribution_pct` | numeric nullable (optional override) |

### 6.3 Migrations required (implementation phase)

| # | Migration purpose |
|---|-------------------|
| 1 | `hr_employment_types` seed + `employees.employment_type_id` backfill |
| 2 | Leave policy matrix table or policy JSON schema v3 |
| 3 | Replace `fn_is_leave_eligible` — category + employment type + per-type rules |
| 4 | Update `fn_accrue_leave_balances` — `leave_accrual_eligible` + matrix |
| 5 | Wire `fn_validate_leave_notice` to policy JSON |
| 6 | Canada statutory columns + backfill from `tds_applicable` where `payroll_country = CA` |
| 7 | (Future) LWF calculation in `fn_compute_payroll` — **not in this audit scope** |
| 8 | (Future) Earned Leave enum/value + balances — if product confirms |
| 9 | Deprecate / remove dead `eligible_employment_types` or map to matrix |

### 6.4 No migration needed (config-only)

- Late slab table edits via `policies.late`
- Mispunch free count via `policies.mispunch`
- Canada rates via `policies.canada_deductions`
- PT default via `policies.professional_tax`
- Shift attendance parameters via `shifts` table

---

## 7. Recommended Implementation Order (post-audit)

1. **Employment type master** + employee form field + filter fixes.  
2. **Leave policy matrix** (DB + `fn_is_leave_eligible` + TS parity).  
3. **Statutory UI gating** (India vs Canada) + new Canada flags (no formula change).  
4. **Config UI** for matrix + accrual + wire orphaned policy keys.  
5. **Payroll formula pass** — LWF, employer contributions, Earned Leave, label mapping for Canada columns.  
6. **Extend filter bars** to Employee Master, Leave, Late, Mispunch, Salary Register.

---

## 8. Open Questions for Product

1. **Earned Leave** — add as third paid type or map to Casual for Canada night staff annual bucket?  
2. **Residence vs payroll country** — gate statutory on `payroll_country` or new `residence_country`?  
3. **Consultant / India Staff / Canada Staff categories** — remain alongside employment type or merge into category only?  
4. **"Limited" leave** — monthly cap per type, annual cap, or both?  
5. **PF/ESIC employer %** — display-only on master or feed employer cost reports?

---

*End of audit — formulas intentionally unchanged.*
