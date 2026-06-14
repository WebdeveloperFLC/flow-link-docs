-- HR Payroll — snapshot verification (after Process or Lock)
-- Use for HR-UAT-P2C-002 and HR-UAT-P2-003 follow-up
-- Demo org: 00000000-0000-0000-0000-0000000000f1

-- Latest demo cycle
SELECT 'cycle' AS check_name,
       id::text AS cycle_id,
       label,
       status
FROM payroll_cycles
WHERE org_id = '00000000-0000-0000-0000-0000000000f1'
ORDER BY start_date DESC
LIMIT 1;

-- Cycle-level policy snapshots (migration 22)
SELECT 'cycle_snapshots' AS check_name,
       snapshot_stage,
       captured_at,
       jsonb_object_keys(policies_json) AS policy_domains,
       meta_json->>'employee_count' AS employees_in_meta
FROM payroll_cycle_snapshots pcs
WHERE cycle_id = (
  SELECT id FROM payroll_cycles
  WHERE org_id = '00000000-0000-0000-0000-0000000000f1'
  ORDER BY start_date DESC LIMIT 1
)
ORDER BY snapshot_stage;

-- Per-employee line snapshots by stage
SELECT 'line_snapshots' AS check_name,
       snapshot_stage,
       count(*)::text AS employee_rows,
       CASE WHEN count(*) >= 5 THEN 'PASS' ELSE 'FAIL' END AS status
FROM payroll_line_snapshots
WHERE cycle_id = (
  SELECT id FROM payroll_cycles
  WHERE org_id = '00000000-0000-0000-0000-0000000000f1'
  ORDER BY start_date DESC LIMIT 1
)
GROUP BY snapshot_stage
ORDER BY snapshot_stage;

-- Sample: Isha processed vs locked detail (if both exist)
SELECT pls.snapshot_stage,
       e.emp_code,
       (pls.line_json->>'payable_days')::numeric AS payable_days,
       (pls.line_json->>'net_salary')::numeric AS net_salary,
       pls.detail_json->'attendance' IS NOT NULL AS has_attendance_detail
FROM payroll_line_snapshots pls
JOIN employees e ON e.id = pls.employee_id
WHERE e.emp_code = 'FL-1042'
  AND pls.cycle_id = (
    SELECT id FROM payroll_cycles
    WHERE org_id = '00000000-0000-0000-0000-0000000000f1'
    ORDER BY start_date DESC LIMIT 1
  )
ORDER BY pls.snapshot_stage;
