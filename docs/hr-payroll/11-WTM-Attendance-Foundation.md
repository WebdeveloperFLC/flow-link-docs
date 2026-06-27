# 11 — WTM Attendance Foundation (Pack 2.1)

**Epic:** Workforce Time Management — Attendance Foundation only.

## Scope

Establishes the **Attendance Session** model with clock in/out and unlimited breaks. Does **not** implement late minutes, grace period, exceptions, missing punch, payroll, or leave.

## Session model

One `wtm_attendance_sessions` row per `(employee_id, work_date)`.

| Field | Purpose |
|-------|---------|
| `clock_in` / `clock_out` | Time stamps |
| `clock_in_at` / `clock_out_at` | Timestamptz for live timer |
| `working_duration_min` | Gross minus breaks (on clock out) |
| `break_duration_min` | Sum of all breaks |
| `session_status` | Pending · Working · On Break · Completed · Locked |
| `attendance_status` | Present · Half Day · Absent · Holiday · Weekly Off |
| `shift_id` | From `fn_employee_shift_at` — no duplicate shift config |

Breaks stored in `wtm_attendance_breaks` (unlimited, never overwritten).

## RPCs

| RPC | Action |
|-----|--------|
| `fn_wtm_clock_in` | Start session; duplicate prevention |
| `fn_wtm_clock_out` | Complete session; calc duration |
| `fn_wtm_break_out` | Start break; no double break-out |
| `fn_wtm_break_in` | End break; update totals |
| `fn_wtm_get_session` | Fetch today's session |
| `fn_wtm_sync_attendance_rollup` | Sync → legacy `attendance` row |
| `fn_wtm_log_event` | Timeline + audit + notification |

## Events

- AttendanceSessionStarted / Completed
- BreakStarted / BreakEnded
- Clock In / Clock Out / Break Out / Break In

Stored in `workforce_timeline_events`; visible in Emp360 Activity Timeline.

## UI entry points

| Route | Purpose |
|-------|---------|
| `/hr/me` | Workforce Time widget (ESS) |
| `/hr/me/time-history` | Read-only attendance history |
| `/hr/attendance/records` | HR today panel + existing register |
| `/hr` | HR dashboard today panel |
| Emp360 summary | Timeline filter "Workforce time" |

## Out of scope (Pack 2.2+)

Late minutes, grace, exceptions, missing punch, photo, daily salary, approval queues, manual/bulk attendance.

## Unchanged

- `fn_compute_payroll` — not modified
- Legacy `PunchStation` — retained for HR admin punch on attendance page
- Payroll / Leave / Accounting modules
