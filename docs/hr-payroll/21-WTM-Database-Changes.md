# 21 — WTM Database Changes (Pack 2.3 WRE)

**Migration:** `supabase/migrations/20260734120000_hr_wre_pack23.sql`

## New enums

| Enum | Values |
|------|--------|
| `wtm_payroll_status` | Present · Half Day · Absent · Paid Leave · Unpaid Leave · Holiday · Weekly Off |
| `wre_eval_trigger` | clock_out · aems_correction · manual_reeval · policy_change · calendar_change |

## Extended enums

`wtm_session_status` + Exception · Holiday · Weekly Off

## New tables

| Table | Purpose |
|-------|---------|
| `wre_evaluations` | Append-only evaluation runs with policy snapshots and results |
| `wtm_attendance_snapshots` | Immutable per-evaluation attendance snapshot |

## Extended columns (`wtm_attendance_sessions`)

| Column | Purpose |
|--------|---------|
| `payroll_status` | Latest WRE payroll status |
| `is_mispunch` | Derived mispunch flag |
| `latest_evaluation_id` | FK to latest `wre_evaluations` |

## New RPCs

- `fn_wpms_employee_bundle_at`
- `fn_wpms_policy_config_at`
- `fn_wre_evaluate_session`
- `fn_wre_reevaluate`

## Patched RPCs

- `fn_wtm_clock_out` — calls WRE after duration recalc
- `fn_aems_apply_session_correction` — calls WRE when session completed

## Policy config extension

Attendance policies seeded with:

```json
{
  "minimum_present_hours": 9,
  "minimum_half_day_hours": 4,
  "maximum_late_minutes": 120,
  "early_exit_threshold_minutes": 30,
  "monthly_grace_minutes": 30
}
```

## RLS

Select: HR, manager, or self. Insert: HR or self (via SECURITY DEFINER RPCs).

## Unchanged

- `fn_compute_payroll`
- Payroll, leave, accounting tables
- Raw WTM session punch columns (WRE writes calculated fields only)

## Indexes

- `wre_evaluations (session_id, evaluated_at DESC)`
- `wre_evaluations (employee_id, work_date DESC)`
- `wtm_attendance_snapshots (employee_id, work_date DESC)`
- `wtm_attendance_snapshots (org_id, work_date)`
