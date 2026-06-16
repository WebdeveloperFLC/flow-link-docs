-- =====================================================================
-- HR Payroll — Attendance columns catch-up (run if migration 31 was skipped)
-- Fixes checkout error: record "new" has no field "shift_work_min"
-- Safe to re-run (IF NOT EXISTS).
-- =====================================================================

ALTER TABLE attendance
  ADD COLUMN IF NOT EXISTS shift_work_min int NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS off_shift_min int NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS ess_unavailable boolean NOT NULL DEFAULT false;

ALTER TABLE payroll_lines
  ADD COLUMN IF NOT EXISTS off_shift_minutes int NOT NULL DEFAULT 0;

COMMENT ON COLUMN attendance.shift_work_min IS 'Minutes inside shift window (salary reference)';
COMMENT ON COLUMN attendance.off_shift_min IS 'Extra minutes outside shift — performance only';
