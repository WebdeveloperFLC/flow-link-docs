-- =====================================================================
-- HR Payroll — Reset Payroll Cycle (UAT)
-- Clears generated processing artifacts for one cycle and returns workflow
-- to Draft. Does NOT modify fn_compute_payroll or delete master/attendance data.
-- =====================================================================

ALTER TABLE payroll_cycles
  ADD COLUMN IF NOT EXISTS is_production boolean NOT NULL DEFAULT false;

COMMENT ON COLUMN payroll_cycles.is_production IS
  'When true, cycle is treated as finalized production payroll and cannot be UAT-reset.';

CREATE OR REPLACE FUNCTION fn_hr_actor_label()
RETURNS text LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT COALESCE(
    (
      SELECT COALESCE(NULLIF(trim(p.full_name), ''), NULLIF(trim(p.email), ''))
      FROM profiles p
      WHERE p.id = auth.uid()
    ),
    'HR User'
  );
$$;

CREATE OR REPLACE FUNCTION fn_can_reset_payroll_cycle_uat(p_org uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT
    (
      has_perm(p_org, 'configure')
      AND current_hr_role(p_org) IN ('Admin'::hr_role, 'Super Admin'::hr_role)
    )
    OR (
      has_perm(p_org, 'approve')
      AND current_hr_role(p_org) = 'HR Manager'::hr_role
    );
$$;

CREATE OR REPLACE FUNCTION fn_reset_payroll_cycle_uat(p_cycle uuid)
RETURNS payroll_cycles LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  c payroll_cycles;
  v_prev text;
  v_actor text;
  v_slips int := 0;
  v_line_snaps int := 0;
  v_cycle_snaps int := 0;
  v_payouts int := 0;
  v_lines int := 0;
BEGIN
  SELECT * INTO c FROM payroll_cycles WHERE id = p_cycle FOR UPDATE;
  IF c.id IS NULL THEN
    RAISE EXCEPTION 'Cycle not found';
  END IF;

  IF COALESCE(c.is_production, false) THEN
    RAISE EXCEPTION 'Production payroll cycles cannot be UAT-reset';
  END IF;

  IF c.status NOT IN ('Processed', 'Approved', 'Locked', 'Paid') THEN
    RAISE EXCEPTION 'Only Processed/Approved/Locked/Paid cycles can be UAT-reset (current: %)', c.status;
  END IF;

  IF NOT fn_can_reset_payroll_cycle_uat(c.org_id) THEN
    RAISE EXCEPTION 'HR Admin or Payroll Admin permission required';
  END IF;

  v_prev := c.status::text;
  v_actor := fn_hr_actor_label();

  DELETE FROM salary_slips WHERE cycle_id = p_cycle;
  GET DIAGNOSTICS v_slips = ROW_COUNT;

  DELETE FROM payroll_line_snapshots WHERE cycle_id = p_cycle;
  GET DIAGNOSTICS v_line_snaps = ROW_COUNT;

  DELETE FROM payroll_cycle_snapshots WHERE cycle_id = p_cycle;
  GET DIAGNOSTICS v_cycle_snaps = ROW_COUNT;

  DELETE FROM accounting_payouts WHERE cycle_id = p_cycle;
  GET DIAGNOSTICS v_payouts = ROW_COUNT;

  DELETE FROM payroll_lines WHERE cycle_id = p_cycle;
  GET DIAGNOSTICS v_lines = ROW_COUNT;

  UPDATE payroll_cycles
  SET status = 'Draft',
      approved_at = NULL,
      approved_by = NULL,
      processed_at = NULL,
      processed_by = NULL,
      paid_at = NULL,
      paid_by = NULL
  WHERE id = p_cycle
  RETURNING * INTO c;

  INSERT INTO audit_log (org_id, actor_id, actor_label, action, target, prev_value, new_value)
  VALUES (
    c.org_id,
    auth.uid(),
    v_actor,
    'Payroll UAT Reset',
    c.label,
    v_prev,
    format(
      'Payroll cycle reset for UAT by %s. Removed %s lines, %s line snapshots, %s cycle snapshots, %s slips, %s payouts.',
      v_actor,
      v_lines,
      v_line_snaps,
      v_cycle_snaps,
      v_slips,
      v_payouts
    )
  );

  RETURN c;
END;
$$;

GRANT EXECUTE ON FUNCTION fn_hr_actor_label() TO authenticated;
GRANT EXECUTE ON FUNCTION fn_can_reset_payroll_cycle_uat(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION fn_reset_payroll_cycle_uat(uuid) TO authenticated;
