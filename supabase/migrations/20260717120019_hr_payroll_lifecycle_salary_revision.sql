-- =====================================================================
-- HR Payroll — lifecycle (Process → Approve → Lock → Paid) + salary revision
-- Run after 20260717120018_hr_payroll_add_up_requirements.sql
-- =====================================================================

-- Rebuild lines while cycle is editable (not Locked/Paid)
CREATE OR REPLACE FUNCTION fn_build_payroll_line(p_employee uuid, p_cycle uuid)
RETURNS payroll_lines LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  c record; e record; inp jsonb; calc jsonb; row payroll_lines;
  use_override boolean; ov jsonb;
  v_late_pol jsonb; v_mis_pol jsonb; v_sul_pol jsonb; v_ot_pol jsonb; v_pt_pol jsonb;
  v_ul_mult numeric; v_pt_amt numeric;
BEGIN
  SELECT * INTO c FROM payroll_cycles WHERE id = p_cycle;
  IF c.status NOT IN ('Draft', 'Processed', 'Approved') THEN
    RAISE EXCEPTION 'Cycle % is %; cannot rebuild line', c.label, c.status;
  END IF;
  SELECT * INTO e FROM employees WHERE id = p_employee;

  use_override := false;
  ov := NULL;
  SELECT is_overridden, override_json INTO use_override, ov
  FROM payroll_lines WHERE cycle_id = p_cycle AND employee_id = p_employee;
  use_override := COALESCE(use_override, false);

  IF use_override THEN
    inp := ov;
  ELSE
    inp := fn_rollup_inputs(p_employee, p_cycle);
  END IF;

  v_late_pol := fn_resolve_policy(e.org_id, 'late', c.start_date);
  v_mis_pol := fn_resolve_policy(e.org_id, 'mispunch', c.start_date);
  v_sul_pol := fn_resolve_policy(e.org_id, 'sandwich_ul', c.start_date);
  v_ot_pol := fn_resolve_policy(e.org_id, 'overtime', c.start_date);
  v_pt_pol := fn_resolve_policy(e.org_id, 'professional_tax', c.start_date);
  v_ul_mult := COALESCE((v_sul_pol->>'ul_multiplier')::numeric, 2);
  v_pt_amt := COALESCE((v_pt_pol->>'default_amount')::numeric, 200);

  calc := fn_compute_payroll(
    c.payroll_days, e.monthly_gross, e.basic, e.incentive, e.bonus,
    e.pf_applicable, e.esic_applicable,
    (inp->>'leaves')::numeric, (inp->>'paid_leaves')::numeric,
    (inp->>'late')::int, (inp->>'ul')::int, (inp->>'sandwich')::numeric,
    (inp->>'mispunch')::int, (inp->>'comp_off')::numeric, (inp->>'unpaid_training')::int,
    v_late_pol, v_mis_pol, v_ul_mult,
    COALESCE((inp->>'ot_minutes')::int, 0), v_ot_pol,
    COALESCE(e.pt_applicable, false),
    CASE WHEN COALESCE(e.pt_applicable, false) THEN v_pt_amt ELSE 0 END
  );

  INSERT INTO payroll_lines AS pl (
    org_id, cycle_id, employee_id, payroll_days, monthly_gross, basic,
    leaves_taken, paid_leaves, comp_off, late_count, mispunch_count, ul_count,
    sandwich_count, unpaid_training, ot_minutes, ot_pay,
    late_deduction, mispunch_deduction,
    payable_days, daily_rate, gross_earned, incentive, bonus,
    pf_employee, esic_employee, pt_employee, net_salary, is_overridden, override_json
  ) VALUES (
    e.org_id, p_cycle, p_employee, c.payroll_days, e.monthly_gross, e.basic,
    (inp->>'leaves')::numeric, (inp->>'paid_leaves')::numeric, (inp->>'comp_off')::numeric,
    (inp->>'late')::int, (inp->>'mispunch')::int, (inp->>'ul')::int,
    (inp->>'sandwich')::numeric, (inp->>'unpaid_training')::int,
    COALESCE((inp->>'ot_minutes')::int, 0), COALESCE((calc->>'ot_pay')::numeric, 0),
    (calc->>'late_deduction')::numeric, (calc->>'mispunch_deduction')::numeric,
    (calc->>'payable_days')::numeric, (calc->>'daily_rate')::numeric,
    (calc->>'gross_earned')::numeric, (calc->>'incentive')::numeric, (calc->>'bonus')::numeric,
    (calc->>'pf_employee')::numeric, (calc->>'esic_employee')::numeric,
    COALESCE((calc->>'pt_employee')::numeric, 0), (calc->>'net_salary')::numeric,
    COALESCE(use_override, false), ov
  )
  ON CONFLICT (cycle_id, employee_id) DO UPDATE SET
    payroll_days = excluded.payroll_days, monthly_gross = excluded.monthly_gross, basic = excluded.basic,
    leaves_taken = excluded.leaves_taken, paid_leaves = excluded.paid_leaves, comp_off = excluded.comp_off,
    late_count = excluded.late_count, mispunch_count = excluded.mispunch_count, ul_count = excluded.ul_count,
    sandwich_count = excluded.sandwich_count, unpaid_training = excluded.unpaid_training,
    ot_minutes = excluded.ot_minutes, ot_pay = excluded.ot_pay,
    late_deduction = excluded.late_deduction, mispunch_deduction = excluded.mispunch_deduction,
    payable_days = excluded.payable_days, daily_rate = excluded.daily_rate, gross_earned = excluded.gross_earned,
    incentive = excluded.incentive, bonus = excluded.bonus,
    pf_employee = excluded.pf_employee, esic_employee = excluded.esic_employee,
    pt_employee = excluded.pt_employee, net_salary = excluded.net_salary,
    is_overridden = excluded.is_overridden, override_json = excluded.override_json
  RETURNING * INTO row;
  RETURN row;
END;
$$;

CREATE OR REPLACE FUNCTION fn_rebuild_cycle_lines(p_cycle uuid)
RETURNS int LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  c payroll_cycles;
  e record;
  v_count int := 0;
BEGIN
  SELECT * INTO c FROM payroll_cycles WHERE id = p_cycle FOR UPDATE;
  IF c.id IS NULL THEN RAISE EXCEPTION 'Cycle not found'; END IF;
  IF c.status NOT IN ('Draft', 'Processed', 'Approved') THEN
    RAISE EXCEPTION 'Cycle % is %; cannot rebuild', c.label, c.status;
  END IF;

  FOR e IN
    SELECT id FROM employees
    WHERE org_id = c.org_id AND status NOT IN ('Terminated', 'Resigned')
  LOOP
    PERFORM fn_build_payroll_line(e.id, p_cycle);
    v_count := v_count + 1;
  END LOOP;
  RETURN v_count;
END;
$$;

CREATE OR REPLACE FUNCTION fn_process_payroll_cycle(p_cycle uuid)
RETURNS payroll_cycles LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE c payroll_cycles;
BEGIN
  SELECT * INTO c FROM payroll_cycles WHERE id = p_cycle FOR UPDATE;
  IF c.id IS NULL THEN RAISE EXCEPTION 'Cycle not found'; END IF;
  IF c.status <> 'Draft' THEN RAISE EXCEPTION 'Only Draft cycles can be processed (current: %)', c.status; END IF;
  IF NOT has_perm(c.org_id, 'approve') THEN RAISE EXCEPTION 'Approve permission required'; END IF;

  PERFORM fn_rebuild_cycle_lines(p_cycle);

  UPDATE payroll_cycles
  SET status = 'Processed', processed_by = auth.uid(), processed_at = now()
  WHERE id = p_cycle
  RETURNING * INTO c;

  INSERT INTO audit_log (org_id, actor_label, action, target, new_value)
  VALUES (c.org_id, 'HR', 'Payroll Processed', c.label, c.status);

  RETURN c;
END;
$$;

CREATE OR REPLACE FUNCTION fn_approve_payroll_cycle(p_cycle uuid)
RETURNS payroll_cycles LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE c payroll_cycles;
BEGIN
  SELECT * INTO c FROM payroll_cycles WHERE id = p_cycle FOR UPDATE;
  IF c.id IS NULL THEN RAISE EXCEPTION 'Cycle not found'; END IF;
  IF c.status <> 'Processed' THEN RAISE EXCEPTION 'Only Processed cycles can be approved (current: %)', c.status; END IF;
  IF NOT has_perm(c.org_id, 'approve') THEN RAISE EXCEPTION 'Approve permission required'; END IF;

  UPDATE payroll_cycles
  SET status = 'Approved', approved_by = auth.uid(), approved_at = now()
  WHERE id = p_cycle
  RETURNING * INTO c;

  INSERT INTO audit_log (org_id, actor_label, action, target, new_value)
  VALUES (c.org_id, 'HR', 'Payroll Approved', c.label, c.status);

  RETURN c;
END;
$$;

-- Lock from Approved (or legacy one-step Draft → Locked)
CREATE OR REPLACE FUNCTION fn_lock_payroll_cycle(p_cycle uuid)
RETURNS payroll_cycles LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  c payroll_cycles;
  e record;
BEGIN
  SELECT * INTO c FROM payroll_cycles WHERE id = p_cycle FOR UPDATE;
  IF c.id IS NULL THEN RAISE EXCEPTION 'Cycle not found'; END IF;
  IF c.status NOT IN ('Draft', 'Approved') THEN
    RAISE EXCEPTION 'Cycle must be Draft (legacy) or Approved to lock (current: %)', c.status;
  END IF;
  IF NOT has_perm(c.org_id, 'approve') THEN RAISE EXCEPTION 'Approve permission required'; END IF;

  IF c.status = 'Draft' THEN
    PERFORM fn_rebuild_cycle_lines(p_cycle);
  END IF;

  FOR e IN
    SELECT id FROM employees
    WHERE org_id = c.org_id AND status NOT IN ('Terminated', 'Resigned')
  LOOP
    UPDATE payroll_lines
    SET input_snapshot = fn_rollup_inputs(e.id, p_cycle)
    WHERE cycle_id = p_cycle AND employee_id = e.id;
  END LOOP;

  UPDATE payroll_cycles
  SET status = 'Locked', approved_at = COALESCE(approved_at, now())
  WHERE id = p_cycle
  RETURNING * INTO c;

  INSERT INTO audit_log (org_id, actor_label, action, target, new_value)
  VALUES (
    c.org_id, 'HR', 'Payroll Locked', c.label,
    c.status || ' · ' || (SELECT COUNT(*)::text FROM payroll_lines WHERE cycle_id = p_cycle) || ' lines'
  );

  RETURN c;
END;
$$;

CREATE OR REPLACE FUNCTION fn_mark_payroll_paid(p_cycle uuid)
RETURNS payroll_cycles LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE c payroll_cycles;
BEGIN
  SELECT * INTO c FROM payroll_cycles WHERE id = p_cycle FOR UPDATE;
  IF c.id IS NULL THEN RAISE EXCEPTION 'Cycle not found'; END IF;
  IF c.status <> 'Locked' THEN RAISE EXCEPTION 'Only Locked cycles can be marked paid (current: %)', c.status; END IF;
  IF NOT has_perm(c.org_id, 'approve') THEN RAISE EXCEPTION 'Approve permission required'; END IF;

  UPDATE payroll_cycles
  SET status = 'Paid', paid_by = auth.uid(), paid_at = now()
  WHERE id = p_cycle
  RETURNING * INTO c;

  INSERT INTO audit_log (org_id, actor_label, action, target, new_value)
  VALUES (c.org_id, 'HR', 'Payroll Paid', c.label, c.status);

  RETURN c;
END;
$$;

CREATE OR REPLACE FUNCTION fn_reopen_payroll_cycle(p_cycle uuid, p_reason text DEFAULT NULL)
RETURNS payroll_cycles LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE c payroll_cycles;
BEGIN
  SELECT * INTO c FROM payroll_cycles WHERE id = p_cycle FOR UPDATE;
  IF c.id IS NULL THEN RAISE EXCEPTION 'Cycle not found'; END IF;
  IF c.status NOT IN ('Locked', 'Approved', 'Processed') THEN
    RAISE EXCEPTION 'Only Processed/Approved/Locked cycles can be reopened (current: %)', c.status;
  END IF;
  IF NOT (has_perm(c.org_id, 'configure') OR has_perm(c.org_id, 'approve')) THEN
    RAISE EXCEPTION 'Configure or approve permission required';
  END IF;

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

  INSERT INTO audit_log (org_id, actor_label, action, target, prev_value, new_value)
  VALUES (
    c.org_id, 'HR', 'Payroll Reopened', c.label,
    'Locked/Approved/Processed', COALESCE(NULLIF(trim(p_reason), ''), 'No reason given')
  );

  RETURN c;
END;
$$;

-- Salary revision audit when monthly gross changes
CREATE OR REPLACE FUNCTION trg_employee_salary_revision()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF TG_OP = 'UPDATE' AND NEW.monthly_gross IS DISTINCT FROM OLD.monthly_gross THEN
    INSERT INTO salary_revision_history (
      org_id, employee_id, effective_date, old_salary, new_salary, revised_by, remarks
    ) VALUES (
      NEW.org_id,
      NEW.id,
      COALESCE(NEW.date_of_joining, CURRENT_DATE),
      OLD.monthly_gross,
      NEW.monthly_gross,
      auth.uid(),
      'Auto from employee profile update'
    );
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS employee_salary_revision ON employees;
CREATE TRIGGER employee_salary_revision
  AFTER UPDATE OF monthly_gross ON employees
  FOR EACH ROW EXECUTE FUNCTION trg_employee_salary_revision();

GRANT EXECUTE ON FUNCTION fn_rebuild_cycle_lines(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION fn_process_payroll_cycle(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION fn_approve_payroll_cycle(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION fn_mark_payroll_paid(uuid) TO authenticated;
