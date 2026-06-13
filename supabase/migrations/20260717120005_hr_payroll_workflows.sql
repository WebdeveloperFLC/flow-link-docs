-- =====================================================================
-- HR Payroll — RPC grants, lock/unlock, override rebuild helpers
-- Run after 20260717120002_hr_payroll_functions.sql
-- =====================================================================

-- Grant execute on HR engine functions to authenticated users
DO $$
DECLARE r record;
BEGIN
  FOR r IN
    SELECT p.oid::regprocedure AS sig
    FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public'
      AND p.proname IN (
        'fn_compute_payroll',
        'fn_rollup_inputs',
        'fn_build_payroll_line',
        'fn_late_deduction',
        'fn_mispunch_deduction'
      )
  LOOP
    EXECUTE format('GRANT EXECUTE ON FUNCTION %s TO authenticated', r.sig);
  END LOOP;
END $$;

-- Lock payroll cycle (freezes lines; refuses if Draft lines missing)
CREATE OR REPLACE FUNCTION fn_lock_payroll_cycle(p_cycle uuid)
RETURNS payroll_cycles LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE c payroll_cycles;
BEGIN
  SELECT * INTO c FROM payroll_cycles WHERE id = p_cycle FOR UPDATE;
  IF c.id IS NULL THEN
    RAISE EXCEPTION 'Cycle not found';
  END IF;
  IF c.status <> 'Draft' THEN
    RAISE EXCEPTION 'Cycle already %', c.status;
  END IF;
  UPDATE payroll_cycles
  SET status = 'Locked', approved_at = now()
  WHERE id = p_cycle
  RETURNING * INTO c;
  INSERT INTO audit_log (org_id, actor_label, action, target, new_value)
  VALUES (c.org_id, 'System', 'Payroll Locked', c.label, c.status);
  RETURN c;
END; $$;

CREATE OR REPLACE FUNCTION fn_reopen_payroll_cycle(p_cycle uuid)
RETURNS payroll_cycles LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE c payroll_cycles;
BEGIN
  SELECT * INTO c FROM payroll_cycles WHERE id = p_cycle FOR UPDATE;
  IF c.status <> 'Locked' THEN
    RAISE EXCEPTION 'Only locked cycles can be reopened';
  END IF;
  UPDATE payroll_cycles SET status = 'Draft', approved_at = NULL
  WHERE id = p_cycle RETURNING * INTO c;
  INSERT INTO audit_log (org_id, actor_label, action, target, new_value)
  VALUES (c.org_id, 'System', 'Payroll Reopened', c.label, c.status);
  RETURN c;
END; $$;

-- Apply manual override inputs then rebuild line (Draft only)
CREATE OR REPLACE FUNCTION fn_apply_payroll_override(
  p_employee uuid,
  p_cycle uuid,
  p_override jsonb
) RETURNS payroll_lines LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  UPDATE payroll_lines
  SET is_overridden = true, override_json = p_override
  WHERE employee_id = p_employee AND cycle_id = p_cycle;
  RETURN fn_build_payroll_line(p_employee, p_cycle);
END; $$;

-- Clear override and rebuild from roll-up
CREATE OR REPLACE FUNCTION fn_clear_payroll_override(p_employee uuid, p_cycle uuid)
RETURNS payroll_lines LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  UPDATE payroll_lines
  SET is_overridden = false, override_json = NULL
  WHERE employee_id = p_employee AND cycle_id = p_cycle;
  RETURN fn_build_payroll_line(p_employee, p_cycle);
END; $$;

DO $$
DECLARE r record;
BEGIN
  FOR r IN
    SELECT p.oid::regprocedure AS sig
    FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public'
      AND p.proname IN (
        'fn_lock_payroll_cycle',
        'fn_reopen_payroll_cycle',
        'fn_apply_payroll_override',
        'fn_clear_payroll_override'
      )
  LOOP
    EXECUTE format('GRANT EXECUTE ON FUNCTION %s TO authenticated', r.sig);
  END LOOP;
END $$;
