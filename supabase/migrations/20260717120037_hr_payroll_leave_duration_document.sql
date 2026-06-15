-- =====================================================================
-- HR Payroll — Leave duration (Full/Half + First/Second half) on apply
-- =====================================================================

ALTER TABLE leave_requests
  ADD COLUMN IF NOT EXISTS duration_type text NOT NULL DEFAULT 'Full Day',
  ADD COLUMN IF NOT EXISTS half_day_part text;

COMMENT ON COLUMN leave_requests.duration_type IS 'Full Day or Half Day';
COMMENT ON COLUMN leave_requests.half_day_part IS 'First Half or Second Half when duration_type is Half Day';

-- Back-fill existing rows from days value
UPDATE leave_requests
SET duration_type = CASE WHEN days <= 0.5 THEN 'Half Day' ELSE 'Full Day' END
WHERE duration_type IS NULL OR duration_type = 'Full Day' AND days <= 0.5;
