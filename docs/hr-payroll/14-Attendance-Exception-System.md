# 14 — Attendance Exception Management System (AEMS)

**WTM Pack 2.2** — handles attendance exceptions that prevent normal clock in/out.

## Exception types (master data)

Domain: `attendance_exception_type` in `hr_masters` (not hardcoded).

Default seeded types: Internet Down, Power Failure, Office System Down, Forgot Clock In/Out, Late System Login, Manual Attendance Request, Browser/Device Issue, Other.

## Exception request

Table: `attendance_exceptions`

| Field | Purpose |
|-------|---------|
| `session_id` | Links to `wtm_attendance_sessions` |
| `exception_type_code` | From master data |
| `requested_clock_in/out` | Employee request |
| `original_clock_in/out` | Snapshot at submit |
| `approved_clock_in/out` | HR-approved values |
| `incident_id` | Optional link to workforce incident |
| `status` | Draft → Submitted → … → Approved/Rejected |

Statuses: Draft, Submitted, Under Review, Approved, Rejected, Returned for Clarification, Closed.

## Evidence

Table: `aems_exception_evidence` — metadata for files in `hr-docs` bucket (`exception-evidence/` path).

## HR actions (RPC `fn_aems_hr_action`)

Approve · Reject · Return for clarification · Approve with modified time — **comment required**.

On approve: `fn_aems_apply_session_correction` updates WTM session + rollup; history in `aems_exception_history`.

## Manual & bulk

- `fn_aems_manual_attendance` — HR-only, reason + comment required
- `fn_aems_bulk_process` — bulk approve/reject with per-row audit via individual `fn_aems_hr_action` calls

## Routes

| Route | Role |
|-------|------|
| `/hr/me/exceptions` | Employee submit & view |
| `/hr/attendance/exceptions` | HR review queue |
| `/hr/admin/incidents` | Incident register (admin) |

## Out of scope (Pack 2.3)

Late minutes, grace period, policy evaluation, payroll.
