# Attendance Integration Options (v1)

The prototype proves the **manual + self-punch** path: a Punch Station stamps live time, `fn_derive_status` turns punches into Present/Half Day/Absent/Mispunch, and that rolls into payroll. Production needs to decide how punches actually arrive. The `attendance.source` column (`manual | self | biometric | import`) already accommodates all options below — they are additive, not exclusive.

---

## Option A — Self-service punch (web/mobile) — **v1 default, already prototyped**
Employees punch from the ESS portal; managers/HR correct from the Attendance screen.

| | |
|---|---|
| Effort | Low — built in prototype; wire `attendance` insert/update via RLS (`apply` for self, `manage_emp`/`approve` for others). |
| Pros | Zero hardware; works day one; full audit trail; honours shift rules immediately. |
| Cons | Trust-based; no geofence in v1; relies on employee discipline. |
| Hardening (v1.1) | Optional gefence/IP allow-list; selfie capture to `hr-docs`; block punch outside shift window ± buffer. |
| Data path | UI → Supabase RLS insert → `trg_attendance_derive` sets status/mispunch → rollup picks up. |

## Option B — Biometric / access-control device import
Devices (fingerprint, RFID, face) export punch logs; we ingest them.

| | |
|---|---|
| Effort | Medium — build an importer; map device user id → `employees.emp_code`/`staff_id`. |
| Pros | Tamper-resistant; matches existing office hardware if present. |
| Cons | Hardware dependency; device clock drift; one row per scan needs pairing into in/out. |
| Data path | Device → SFTP/CSV or vendor API → Supabase Edge Function `fn_import_attendance(batch)` → upsert `attendance(source='biometric')` → trigger derives status. |
| Contract | `device_logs(device_user_id, punch_ts, direction?)`. If direction absent, pair sequential scans per day (1st=in, last=out, middle=break). |

## Option C — Vendor HRMS/attendance API (e.g. existing biometric SaaS)
If FL already runs an attendance SaaS, sync from its API rather than raw devices.

| | |
|---|---|
| Effort | Medium — one adapter per vendor; scheduled pull. |
| Pros | Vendor handles devices/edge cases; we just reconcile. |
| Cons | Vendor lock-in; mapping their statuses to ours; API rate/cost. |
| Data path | Cron Edge Function → vendor API → normalise → upsert `attendance(source='import')`. |

## Option D — Spreadsheet/CSV bulk import (interim / branches without devices)
HR uploads a monthly sheet; we parse and upsert.

| | |
|---|---|
| Effort | Low. |
| Pros | Unblocks branches with no infrastructure; good migration bridge. |
| Cons | Manual; error-prone; not real-time. |
| Data path | Upload → parse → preview/diff → confirm → upsert `attendance(source='import')`. |

---

## Recommendation
- **v1:** ship Option A (self-punch, done) + Option D (CSV import) so every branch can operate regardless of hardware.
- **v1.1:** add Option B or C based on what hardware/SaaS FL already owns. Keep the `source` column and the derive-trigger as the single normalisation point so all sources converge on the same status logic and the same payroll engine.

## Invariants all sources must respect
1. One row per `(employee_id, work_date)` — importers upsert, never duplicate.
2. After write, status/mispunch are derived by `fn_derive_status` unless an explicit manual status is set.
3. Cross-midnight night shifts attribute the row to the **login date**.
4. Imports into a **locked** cycle's date range are rejected (or routed to the next open cycle) — never mutate locked payroll.
5. Every import batch writes an `audit_log` summary (rows added/updated, source, actor).
