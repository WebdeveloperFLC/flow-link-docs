# 19 — WTM Evaluation Logic (Pack 2.3)

## Flow

1. Load session (raw facts).
2. Resolve WPMS bundle + attendance policy + holiday calendar at `work_date`.
3. Resolve shift scheduled times and grace from policy + shift.
4. If approved exception exists → use **effective** clock in/out for math only.
5. Detect holiday / weekly off from calendar (not from punches alone).
6. Compute late, early exit, overtime, monthly late, remaining grace.
7. Derive payroll status (present / half day / absent / holiday / weekly off).
8. Append `wre_evaluations` row + immutable `wtm_attendance_snapshots` version.
9. Update session **calculated** columns only (`payroll_status`, `attendance_status`, `is_mispunch`, `latest_evaluation_id`).
10. Sync legacy `attendance` rollup (backward compat).

## Late minutes (today)

```
late = max(0, minutes(effective_in - shift.login) - grace_minutes)
```

Grace comes from attendance policy `grace_minutes` or shift `grace_min`.

## Monthly late minutes

Sum of `late_minutes` from snapshots in the same calendar month (excluding current session on re-eval).

```
monthly_late = prior_month_late_sum + late_today
remaining_grace = max(0, monthly_grace_minutes - monthly_late)
```

Policy keys: `monthly_grace_minutes` or `monthly_late_minutes_cap` (default 30).

## Half day

Policy-driven thresholds (no hardcoding):

| Key | Role |
|-----|------|
| `minimum_present_hours` | Full day working minutes |
| `minimum_half_day_hours` | Half day floor |
| `maximum_late_minutes` | Late beyond → half day |
| `early_exit_threshold_minutes` | Early leave flag |

Also uses `fn_derive_status` for shift-aware baseline.

## Holiday & weekly off

- **Holiday:** row in `holidays` for org + date → payroll `Holiday`, operational `Holiday`.
- **Weekly off:** `fn_is_weekly_off_day` with no punch → payroll `Weekly Off`.
- **Exceptional working day:** if employee punches on weekly off, normal evaluation applies.

## Exception handling

Approved `attendance_exceptions` supply effective in/out. Original session facts remain in `input_snapshot` JSON on the evaluation row.

## Re-evaluation

`fn_wre_reevaluate(org, from, to, employee?, dry_run?)` creates new evaluation + snapshot version. Prior snapshots are never updated.

## Audit

- `audit_log`: Rule Evaluation / Rule Re-Evaluation
- `workforce_timeline_events`: Rule Evaluated / Rule Re-Evaluated with policy version in payload

## Versioning

Each evaluation stores:

- `bundle_version`
- `attendance_policy_version`
- `holiday_policy_version`
- `evaluated_at`
- `evaluated_by_label` (default System)
