# 16 — WTM Database Changes (Pack 2.2 AEMS)

**Migration:** `supabase/migrations/20260733120000_hr_aems_pack22.sql`

## New tables

| Table | Purpose |
|-------|---------|
| `workforce_incidents` | Branch operational incident register |
| `attendance_exceptions` | AEMS exception requests |
| `aems_exception_evidence` | File metadata (hr-docs storage) |
| `aems_exception_history` | Immutable approval/status trail |

## New enums

- `aems_exception_status`
- `aems_incident_status`

## New RPCs

- `fn_aems_submit_exception`
- `fn_aems_hr_action`
- `fn_aems_manual_attendance`
- `fn_aems_bulk_process`
- `fn_aems_register_evidence`
- `fn_aems_apply_session_correction`
- `fn_aems_find_matching_incidents`
- `fn_aems_log_history`

## Master data seeds

- `attendance_exception_type` (10 types)
- `workforce_incident_type` (7 types)

## RBAC

Updates `role_permissions.screens` with `attendanceExceptions`, `incidentRegister`.

## Unchanged

- `fn_compute_payroll`
- `wtm_attendance_sessions` schema (corrected via RPC only)
- Payroll / leave / accounting tables
