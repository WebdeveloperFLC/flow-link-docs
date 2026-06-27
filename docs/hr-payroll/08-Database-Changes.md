# 08 — Database Changes (Epic 1)

**Migration:** `supabase/migrations/20260731120000_hr_wpms_master_data_foundation.sql`

## New tables

| Table | Purpose |
|-------|---------|
| `hr_masters` | Generic master registry (domain + code + label + audit) |
| `wpms_policies` | Versioned WPMS policies (6 kinds) |
| `wpms_policy_bundles` | Bundle header + FKs to six policies |
| `wpms_employee_bundle_assignments` | Current/historical assignment rows |
| `wpms_bundle_assignment_history` | Immutable assignment change log |
| `wpms_events` | Structured WPMS event stream |

## Extended tables

| Table | Columns added |
|-------|---------------|
| `hr_document_types` | `remarks`, `created_by`, `created_by_label`, `modified_by`, `modified_by_label` |
| `hr_employee_categories` | Same audit columns |
| `employees` | `employment_type_id` → `hr_masters`, `wpms_current_bundle_id` |

## New RPCs

- `fn_wpms_log_event`
- `fn_wpms_assign_bundle`
- `fn_wpms_bulk_assign_bundle`

## RLS

All new tables use org-scoped policies consistent with existing HR patterns (`has_perm`, `is_hr`, `manages_employee`).

## RBAC (same migration)

Updates `role_permissions.screens` with `admin`, `masterData`, `wpms` for HR Admin roles; refreshes `fn_reset_hr_role_permissions` to include these keys.

## Not modified

- `fn_compute_payroll` — unchanged
- `public.branches`, `departments`, `designations` — unchanged
- Accounting tables — unchanged
- Operational `attendance`, `leave_requests`, `payroll_lines` — unchanged

## Indexes

- `idx_hr_masters_org_domain`
- `idx_wpms_policies_org_kind`
- `idx_wpms_bundles_org`
- `idx_wpms_emp_bundle_current` (partial unique on `is_current`)
- `idx_wpms_bundle_hist_emp`
- `idx_wpms_events_org`
