-- =====================================================================
-- HR Payroll — Casual/Sick apply policy, monthly 1.5d cap, balance visibility
-- Run after 20260717120033_hr_payroll_employment_types_companies.sql
-- =====================================================================

-- Roll Annual Leave balances into Casual Leave (employees apply Casual + Sick only)
INSERT INTO leave_balances (org_id, employee_id, policy_year, type, entitled, accrued, taken, carried_in)
SELECT org_id, employee_id, policy_year, 'Casual Leave', entitled, accrued, taken, COALESCE(carried_in, 0)
FROM leave_balances
WHERE type = 'Annual Leave'
ON CONFLICT (employee_id, policy_year, type) DO UPDATE SET
  entitled = leave_balances.entitled + EXCLUDED.entitled,
  accrued = leave_balances.accrued + EXCLUDED.accrued,
  taken = leave_balances.taken + EXCLUDED.taken,
  carried_in = leave_balances.carried_in + EXCLUDED.carried_in;

-- Ensure every active employee has Casual + Sick balance rows for ESS display
INSERT INTO leave_balances (org_id, employee_id, policy_year, type, entitled, accrued, taken)
SELECT
  e.org_id,
  e.id,
  extract(year FROM current_date)::int,
  t.type,
  CASE
    WHEN t.type = 'Sick Leave' THEN 8
    WHEN e.work_week = '5-Day' THEN 10
    ELSE 18
  END,
  0,
  0
FROM employees e
CROSS JOIN (VALUES ('Casual Leave'), ('Sick Leave')) AS t(type)
WHERE e.status NOT IN ('Terminated', 'Resigned')
ON CONFLICT (employee_id, policy_year, type) DO NOTHING;

CREATE OR REPLACE FUNCTION fn_leave_monthly_paid_used(
  p_employee uuid,
  p_ref_date date,
  p_exclude uuid DEFAULT NULL
) RETURNS numeric LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT COALESCE(SUM(lr.days), 0)
  FROM leave_requests lr
  WHERE lr.employee_id = p_employee
    AND lr.type IN ('Casual Leave', 'Sick Leave')
    AND lr.status IN ('Approved', 'Pending')
    AND date_trunc('month', lr.from_date) = date_trunc('month', p_ref_date)
    AND (p_exclude IS NULL OR lr.id <> p_exclude);
$$;

CREATE OR REPLACE FUNCTION fn_apply_leave_type_policy()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_year int;
  v_remaining numeric;
  v_monthly numeric;
BEGIN
  IF NEW.type NOT IN ('Casual Leave', 'Sick Leave', 'Unpaid Leave') THEN
    RAISE EXCEPTION 'Only Casual Leave, Sick Leave, or Unpaid Leave may be applied';
  END IF;

  IF NEW.type = 'Unpaid Leave' THEN
    RETURN NEW;
  END IF;

  v_year := extract(year FROM NEW.from_date)::int;
  v_monthly := fn_leave_monthly_paid_used(NEW.employee_id, NEW.from_date, NEW.id);

  IF v_monthly + NEW.days > 1.5 THEN
    NEW.type := 'Unpaid Leave';
    RETURN NEW;
  END IF;

  v_remaining := fn_leave_balance_remaining(NEW.employee_id, NEW.type, v_year);
  IF v_remaining < NEW.days THEN
    NEW.type := 'Unpaid Leave';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS leave_apply_policy ON leave_requests;
CREATE TRIGGER leave_apply_policy
  BEFORE INSERT OR UPDATE OF type, days, from_date, employee_id
  ON leave_requests
  FOR EACH ROW
  EXECUTE FUNCTION fn_apply_leave_type_policy();

-- Accrue Casual Leave (1.5/mo 6-day, 0.833/mo 5-day) instead of Annual Leave
CREATE OR REPLACE FUNCTION fn_accrue_leave_balances(p_org uuid, p_year int DEFAULT extract(year FROM current_date)::int)
RETURNS int LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  e record;
  v_accrued numeric;
  v_entitled numeric;
  n int := 0;
BEGIN
  IF NOT has_perm(p_org, 'configure') THEN
    RAISE EXCEPTION 'Configure permission required';
  END IF;

  FOR e IN SELECT * FROM employees WHERE org_id = p_org AND status NOT IN ('Terminated', 'Resigned') LOOP
    IF e.work_week = '5-Day' THEN
      v_entitled := COALESCE(e.annual_entitlement, 10);
      v_accrued := 0.833;
    ELSE
      v_entitled := COALESCE(e.annual_entitlement, 18);
      v_accrued := 1.5;
    END IF;

    INSERT INTO leave_balances (org_id, employee_id, policy_year, type, entitled, accrued, taken)
    VALUES (p_org, e.id, p_year, 'Casual Leave', v_entitled, v_accrued, 0)
    ON CONFLICT (employee_id, policy_year, type) DO UPDATE SET
      entitled = EXCLUDED.entitled,
      accrued = LEAST(leave_balances.entitled, leave_balances.accrued + EXCLUDED.accrued);

    INSERT INTO leave_balances (org_id, employee_id, policy_year, type, entitled, accrued, taken)
    VALUES (p_org, e.id, p_year, 'Sick Leave', 8, 0.667, 0)
    ON CONFLICT (employee_id, policy_year, type) DO UPDATE SET
      accrued = LEAST(8, leave_balances.accrued + 0.667);

    n := n + 1;
  END LOOP;

  INSERT INTO audit_log (org_id, actor_label, action, target, new_value)
  VALUES (p_org, 'System', 'Leave Accrual Run', p_year::text, n::text || ' employees');

  RETURN n;
END;
$$;

-- Approval: enforce monthly cap + balance for Casual/Sick only
CREATE OR REPLACE FUNCTION fn_process_leave_decision(
  p_request uuid,
  p_decision request_status
) RETURNS leave_requests LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  r leave_requests;
  e employees;
  v_remaining numeric;
  v_year int;
  v_was_approved boolean;
  v_monthly numeric;
BEGIN
  IF p_decision NOT IN ('Approved', 'Rejected', 'Pending') THEN
    RAISE EXCEPTION 'Invalid decision %', p_decision;
  END IF;

  SELECT * INTO r FROM leave_requests WHERE id = p_request FOR UPDATE;
  IF r.id IS NULL THEN RAISE EXCEPTION 'Leave request not found'; END IF;

  SELECT * INTO e FROM employees WHERE id = r.employee_id;

  IF NOT has_perm(r.org_id, 'approve') AND r.employee_id <> current_employee_id(r.org_id) THEN
    RAISE EXCEPTION 'Not authorized to decide leave';
  END IF;

  v_was_approved := (r.status = 'Approved');
  v_year := extract(year FROM r.from_date)::int;

  IF p_decision = 'Approved' AND NOT v_was_approved THEN
    IF e.status = 'On Probation'
       AND e.date_of_joining IS NOT NULL
       AND e.date_of_joining > (current_date - interval '3 months')::date
       AND r.type NOT IN ('Unpaid Leave') THEN
      RAISE EXCEPTION 'Paid leave blocked during probation (first 3 months)';
    END IF;

    IF r.type IN ('Casual Leave', 'Sick Leave') THEN
      v_monthly := fn_leave_monthly_paid_used(r.employee_id, r.from_date, r.id);
      IF v_monthly + r.days > 1.5 THEN
        RAISE EXCEPTION 'Monthly paid leave cap exceeded (1.5 days per month for Casual + Sick)';
      END IF;

      v_remaining := fn_leave_balance_remaining(r.employee_id, r.type, v_year);
      IF v_remaining < r.days THEN
        RAISE EXCEPTION 'Insufficient % balance (%.1f remaining, %.1f requested)',
          r.type, v_remaining, r.days;
      END IF;
    END IF;
  END IF;

  UPDATE leave_requests SET status = p_decision WHERE id = p_request RETURNING * INTO r;

  IF p_decision = 'Approved' AND NOT v_was_approved THEN
    IF r.type IN ('Casual Leave', 'Sick Leave') THEN
      INSERT INTO leave_balances (org_id, employee_id, policy_year, type, entitled, accrued, taken)
      VALUES (r.org_id, r.employee_id, v_year, r.type, 0, 0, 0)
      ON CONFLICT (employee_id, policy_year, type) DO NOTHING;

      UPDATE leave_balances
      SET taken = taken + r.days
      WHERE employee_id = r.employee_id
        AND policy_year = v_year
        AND type = r.type;
    END IF;

    PERFORM fn_detect_sandwich_for_leave(r.id);

    INSERT INTO approvals (org_id, entity_type, entity_id, stage, decision, acted_at)
    VALUES (r.org_id, 'leave', r.id, 'HR', 'Approved', now());

    INSERT INTO audit_log (org_id, actor_label, action, target, new_value)
    VALUES (r.org_id, 'HR', 'Leave Approved', r.type || ' · ' || r.from_date::text, r.days::text);
  ELSIF p_decision = 'Rejected' AND v_was_approved THEN
    IF r.type IN ('Casual Leave', 'Sick Leave') THEN
      UPDATE leave_balances
      SET taken = GREATEST(0, taken - r.days)
      WHERE employee_id = r.employee_id
        AND policy_year = v_year
        AND type = r.type;
    END IF;
  ELSIF p_decision = 'Rejected' THEN
    INSERT INTO audit_log (org_id, actor_label, action, target, new_value)
    VALUES (r.org_id, 'HR', 'Leave Rejected', r.type, r.from_date::text);
  ELSIF p_decision = 'Pending' AND v_was_approved THEN
    IF r.type IN ('Casual Leave', 'Sick Leave') THEN
      UPDATE leave_balances
      SET taken = GREATEST(0, taken - r.days)
      WHERE employee_id = r.employee_id
        AND policy_year = v_year
        AND type = r.type;
    END IF;
    UPDATE leave_requests SET is_sandwich = false WHERE id = r.id;
  END IF;

  RETURN r;
END;
$$;

DO $$
DECLARE r record;
BEGIN
  FOR r IN
    SELECT p.oid::regprocedure AS sig FROM pg_proc p
    WHERE p.proname IN (
      'fn_leave_monthly_paid_used',
      'fn_apply_leave_type_policy',
      'fn_accrue_leave_balances',
      'fn_process_leave_decision'
    )
  LOOP
    EXECUTE format('GRANT EXECUTE ON FUNCTION %s TO authenticated', r.sig);
  END LOOP;
END $$;
