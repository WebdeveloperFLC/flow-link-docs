# 20 — WTM Reports (Pack 2.3)

**Route:** `/hr/reports/wre`

## Reports hub entry

**WTM Rules Reports** — policy evaluation outputs (not payroll deductions).

## Sections (single report page)

| Section | Metrics |
|---------|---------|
| **Monthly late minutes** | Per employee-day `late_minutes`, rolling `monthly_late_minutes` |
| **Grace utilization** | `remaining_grace_minutes` per day |
| **Attendance result summary** | Payroll status counts in filter bar summary |
| **Working hours summary** | `working_duration_min` formatted |
| **Early exit summary** | `early_exit_minutes` > 0 |
| **Overtime summary** | `overtime_minutes` |
| **Policy evaluation summary** | Snapshot `attendance_policy_version` on each row |

## Data source

`wtm_attendance_snapshots` — latest version per employee per day in the selected date range.

## Filters

Standard HR report scope: date range, branch, department, category, employment type, employee.

## Export

CSV, Excel, PDF, print via `HrReportShell`.

## HR dashboard widgets

On `/hr` (attendance permission):

- Employees near grace limit (≤5 min remaining)
- Employees exceeding grace
- Frequent late arrival (60+ monthly minutes)
- Frequent early exit (3+ days)
- Attendance evaluation summary badges

## ESS display

On `/hr/me` Workforce Time widget:

- Operational status
- Payroll status
- Late today / monthly late / grace remaining
- Working hours / OT / early exit when evaluated
