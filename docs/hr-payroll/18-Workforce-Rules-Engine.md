# 18 — Workforce Rules Engine (Pack 2.3 WRE)

**Epic:** Workforce Time Management — policy-driven attendance evaluation.

## Golden rule

**Store Facts. Calculate Results.**

Raw session facts (clock in/out, breaks, durations, device info) are never overwritten by WRE. Calculated outcomes live in `wre_evaluations` and `wtm_attendance_snapshots`.

## Two status model

| Layer | Source | Values |
|-------|--------|--------|
| **Operational** | WTM session lifecycle + calendar | Pending · Working · On Break · Completed · Exception · Holiday · Weekly Off · Locked |
| **Payroll** | WRE evaluation | Present · Half Day · Absent · Paid Leave · Unpaid Leave · Holiday · Weekly Off |

Payroll modules must read **Payroll Status** only. WRE does **not** call `fn_compute_payroll`.

## Evaluation inputs

- WPMS policy bundle (attendance + holiday calendar)
- Employee shift (`fn_employee_shift_at`)
- Workforce / holiday calendar (`holidays`, `fn_is_weekly_off_day`)
- Approved attendance exceptions (effective times for evaluation; audit retained)

## Triggers

| Trigger | When |
|---------|------|
| `clock_out` | Session completed |
| `aems_correction` | Approved exception applied |
| `manual_reeval` | HR bulk re-run (`fn_wre_reevaluate`) |
| `policy_change` / `calendar_change` | Reserved for scheduled re-eval |

## RPCs

| RPC | Purpose |
|-----|---------|
| `fn_wre_evaluate_session` | Evaluate one session; write snapshot |
| `fn_wre_reevaluate` | Dry-run or bulk re-evaluate date range |
| `fn_wpms_employee_bundle_at` | Bundle as-of date |
| `fn_wpms_policy_config_at` | Policy JSON as-of date |

## UI

| Route | Purpose |
|-------|---------|
| `/hr/me` | ESS — operational + payroll status, late/grace metrics |
| `/hr` | HR dashboard — WRE widgets |
| `/hr/reports/wre` | WTM rules reports |

## Out of scope

Salary deductions, leave engine, bonus, loans, accounting, payroll integration.

## WTM feature complete

After Pack 2.3, WTM is **feature complete**. Do not proceed to Leave Management without ERP Solution Architect approval.
