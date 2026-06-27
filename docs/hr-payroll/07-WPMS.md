# 07 — Workforce Policy Management System (WPMS)

**Epic 1 deliverable** — Policy bundles as the single assignment unit for employees.

## Entry point

`/hr/admin/wpms`

## Concepts

1. **Policy** (`wpms_policies`) — Versioned document for one kind: attendance, leave, payroll, salary_template, bonus, holiday_calendar. Config stored as JSONB.
2. **Policy Bundle** (`wpms_policy_bundles`) — Named set referencing six policy IDs (India Standard, Canada Ontario, Consultant, …).
3. **Assignment** — Employee receives **one bundle**. Current row in `wpms_employee_bundle_assignments`; history in `wpms_bundle_assignment_history`.

## Policy kinds & config shapes

Default JSON templates: `src/hr-payroll/lib/wpmsTypes.ts` → `WPMS_DEFAULT_CONFIG`.

### Attendance policy fields

`working_days`, `saturday_mandatory`, `grace_minutes`, `monthly_late_minutes_cap`, `break_rules`, `working_hours`, `missing_punch_rule`, `attendance_exception_rule`, `photo_evidence_required`, `daily_salary_preview`

### Leave policy fields

`monthly_cl`, `monthly_sl`, `carry_forward`, `encashment`, `holiday_behaviour`, `sandwich_leave`, `approval_levels`

### Payroll policy fields

`day_calculation`, `cycle_type`, `cycle_26_25`, `pf_applicable`, `esi_applicable`, `professional_tax`, `tds`, `consultant_rules`, `salary_lock`, `payroll_lock`

### Salary template fields

`basic_pct`, `hra_pct`, `special_allowance_pct`, `conveyance`, `medical`, `bonus_component`, `custom_components`

### Bonus policy fields

`eligible`, `after_months`, `include_probation`, `exclude_probation`, `manual_override`, `approval_required`

### Holiday calendar fields

`region` (IN, CA-ON), `scope` (country, branch, custom)

## RPCs

| RPC | Purpose |
|-----|---------|
| `fn_wpms_assign_bundle` | Single employee assign + history |
| `fn_wpms_bulk_assign_bundle` | Filter by branch/dept/employment type; `p_dry_run` preview |
| `fn_wpms_log_event` | Audit + `notification_delivery_log` (in-app, category `hr_wpms`) |

## Seeded bundles (demo org)

- India Standard
- India Faculty
- Canada Ontario
- Consultant
- Legacy Employee

## Permissions

| Action | Permission |
|--------|------------|
| View policies/bundles | `view` + screen `wpms` |
| Create/Edit policies/bundles | `configure` |
| Assign bundle | `manageEmp` or `approve` |

## Out of scope (Epic 1)

WPMS policies are **stored and assigned only**. Attendance engine, leave engine, and `fn_compute_payroll` are **not wired** to WPMS in this epic — that is Epic 2+.
