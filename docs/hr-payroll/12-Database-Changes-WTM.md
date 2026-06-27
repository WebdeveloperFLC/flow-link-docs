# 12 — Database Changes (WTM Pack 2.1)

**Migration:** `supabase/migrations/20260732120000_hr_wtm_attendance_foundation.sql`

## New tables

| Table | Purpose |
|-------|---------|
| `wtm_attendance_sessions` | One session per employee per work_date |
| `wtm_attendance_breaks` | Multiple break records per session |
| `workforce_timeline_events` | Workforce timeline stream |

## New enums

- `wtm_session_status` — Pending, Working, On Break, Completed, Locked
- `wtm_attendance_status` — Present, Half Day, Absent, Holiday, Weekly Off

## New RPCs

- `fn_wtm_clock_in`
- `fn_wtm_clock_out`
- `fn_wtm_break_out`
- `fn_wtm_break_in`
- `fn_wtm_get_session`
- `fn_wtm_log_event`
- `fn_wtm_sync_attendance_rollup`
- `fn_wtm_recalc_session_durations`

## Rollup sync

WTM sessions sync to existing `attendance` table via `fn_wtm_sync_attendance_rollup` so reports and derive triggers continue to work without changing `fn_compute_payroll`.

## RLS

Org-scoped; self punch via `current_employee_id`; HR/manager via `is_hr`, `manages_employee`, `has_perm('manage_emp')`.

## Not modified

- `fn_compute_payroll`
- `fn_record_punch` / `fn_start_attendance_day` (legacy ESS path on HR attendance page)
- Payroll, leave, accounting tables
