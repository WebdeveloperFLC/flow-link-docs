-- =====================================================================
-- HR Payroll — Leave workflow, balance validation, RBAC reset
-- Run after 20260717120010_hr_payroll_storage.sql
-- =====================================================================

-- Remaining balance for a leave type (accrued - taken)
CREATE OR REPLACE FUNCTION fn_leave_balance_remaining(
  p_employee uuid,
  p_type leave_type,
  p_year int DEFAULT extract(year FROM current_date)::int
) RETURNS numeric LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT COALESCE(
    (SELECT (lb.accrued - lb.taken)
     FROM leave_balances lb
     WHERE lb.employee_id = p_employee
       AND lb.type = p_type
       AND lb.policy_year = p_year),
    0
  );
$$;

-- Flag sandwich leave when approved leave brackets week-off/holiday (cap from policy)
CREATE OR REPLACE FUNCTION fn_detect_sandwich_for_leave(p_request uuid)
RETURNS int LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  r record;
  e record;
  v_org uuid;
  v_cap int := 2;
  v_count int := 0;
  d date;
BEGIN
  SELECT lr.*, e.org_id AS emp_org INTO r
  FROM leave_requests lr
  JOIN employees e ON e.id = lr.employee_id
  WHERE lr.id = p_request;

  IF r.id IS NULL OR r.status <> 'Approved' THEN
    RETURN 0;
  END IF;

  v_org := r.emp_org;

  SELECT COALESCE((config->>'sandwich_cap')::int, 2) INTO v_cap
  FROM policies
  WHERE org_id = v_org AND domain = 'sandwich_ul'
  ORDER BY effective_from DESC, version DESC
  LIMIT 1;

  UPDATE leave_requests SET is_sandwich = false
  WHERE employee_id = r.employee_id
    AND org_id = v_org
    AND from_date BETWEEN r.from_date - 7 AND r.to_date + 7;

  d := r.from_date - 1;
  WHILE d >= r.from_date - 14 LOOP
    IF EXISTS (
      SELECT 1 FROM attendance a
      WHERE a.employee_id = r.employee_id
        AND a.work_date = d
        AND a.status IN ('Week Off', 'Holiday')
    ) AND EXISTS (
      SELECT 1 FROM leave_requests lr2
      WHERE lr2.employee_id = r.employee_id
        AND lr2.status = 'Approved'
        AND lr2.from_date <= d AND lr2.to_date >= d
    ) THEN
      UPDATE leave_requests SET is_sandwich = true
      WHERE id = p_request AND NOT is_sandwich;
      v_count := v_count + 1;
      EXIT WHEN v_count >= v_cap;
    END IF;
    d := d - 1;
  END LOOP;

  d := r.to_date + 1;
  WHILE d <= r.to_date + 14 LOOP
    IF EXISTS (
      SELECT 1 FROM attendance a
      WHERE a.employee_id = r.employee_id
        AND a.work_date = d
        AND a.status IN ('Week Off', 'Holiday')
    ) AND EXISTS (
      SELECT 1 FROM leave_requests lr2
      WHERE lr2.employee_id = r.employee_id
        AND lr2.status = 'Approved'
        AND lr2.from_date <= d AND lr2.to_date >= d
    ) THEN
      UPDATE leave_requests SET is_sandwich = true
      WHERE id = p_request;
      v_count := v_count + 1;
      EXIT WHEN v_count >= v_cap;
    END IF;
    d := d + 1;
  END LOOP;

  RETURN v_count;
END;
$$;

-- Approve or reject leave with balance + probation checks
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

    IF r.type IN ('Annual Leave', 'Sick Leave', 'Casual Leave', 'Comp-Off Leave', 'Special Leave') THEN
      v_remaining := fn_leave_balance_remaining(r.employee_id, r.type, v_year);
      IF v_remaining < r.days THEN
        RAISE EXCEPTION 'Insufficient % balance (%.1f remaining, %.1f requested)',
          r.type, v_remaining, r.days;
      END IF;
    END IF;
  END IF;

  UPDATE leave_requests SET status = p_decision WHERE id = p_request RETURNING * INTO r;

  IF p_decision = 'Approved' AND NOT v_was_approved THEN
    INSERT INTO leave_balances (org_id, employee_id, policy_year, type, entitled, accrued, taken)
    VALUES (r.org_id, r.employee_id, v_year, r.type, 0, 0, 0)
    ON CONFLICT (employee_id, policy_year, type) DO NOTHING;

    UPDATE leave_balances
    SET taken = taken + r.days
    WHERE employee_id = r.employee_id
      AND policy_year = v_year
      AND type = r.type;

    PERFORM fn_detect_sandwich_for_leave(r.id);

    INSERT INTO approvals (org_id, entity_type, entity_id, stage, decision, acted_at)
    VALUES (r.org_id, 'leave', r.id, 'HR', 'Approved', now());

    INSERT INTO audit_log (org_id, actor_label, action, target, new_value)
    VALUES (r.org_id, 'HR', 'Leave Approved', r.type || ' · ' || r.from_date::text, r.days::text);
  ELSIF p_decision = 'Rejected' AND v_was_approved THEN
    UPDATE leave_balances
    SET taken = GREATEST(0, taken - r.days)
    WHERE employee_id = r.employee_id
      AND policy_year = v_year
      AND type = r.type;
  ELSIF p_decision = 'Rejected' THEN
    INSERT INTO audit_log (org_id, actor_label, action, target, new_value)
    VALUES (r.org_id, 'HR', 'Leave Rejected', r.type, r.from_date::text);
  ELSIF p_decision = 'Pending' AND v_was_approved THEN
    UPDATE leave_balances
    SET taken = GREATEST(0, taken - r.days)
    WHERE employee_id = r.employee_id
      AND policy_year = v_year
      AND type = r.type;
    UPDATE leave_requests SET is_sandwich = false WHERE id = r.id;
  END IF;

  RETURN r;
END;
$$;

-- Monthly accrual (call via cron or manually)
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
    VALUES (p_org, e.id, p_year, 'Annual Leave', v_entitled, v_accrued, 0)
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

-- Reset role_permissions matrix to demo defaults
CREATE OR REPLACE FUNCTION fn_reset_hr_role_permissions(p_org uuid)
RETURNS int LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT has_perm(p_org, 'configure') THEN
    RAISE EXCEPTION 'Configure permission required';
  END IF;

  DELETE FROM role_permissions WHERE org_id = p_org;

  INSERT INTO role_permissions(org_id, role, can_view, can_apply, can_approve, can_override, can_export, can_configure, can_manage_emp, screens) VALUES
    (p_org, 'Super Admin', true, true, true, true, true, true, true,
      '{"dashboard":true,"ess":true,"emp360":true,"employees":true,"shifts":true,"training":true,"calculator":true,"verify":true,"attendance":true,"leave":true,"compoff":true,"late":true,"mispunch":true,"holiday":true,"config":true,"roles":true,"audit":true}'::jsonb),
    (p_org, 'Admin', true, true, true, true, true, true, true,
      '{"dashboard":true,"ess":true,"emp360":true,"employees":true,"shifts":true,"training":true,"calculator":true,"verify":true,"attendance":true,"leave":true,"compoff":true,"late":true,"mispunch":true,"holiday":true,"config":true,"roles":true,"audit":true}'::jsonb),
    (p_org, 'HR Manager', true, true, true, true, true, false, true,
      '{"dashboard":true,"ess":true,"emp360":true,"employees":true,"shifts":true,"training":true,"calculator":true,"verify":true,"attendance":true,"leave":true,"compoff":true,"late":true,"mispunch":true,"holiday":true,"config":false,"roles":true,"audit":true}'::jsonb),
    (p_org, 'HR Executive', true, true, true, false, true, false, true,
      '{"dashboard":true,"ess":true,"emp360":true,"employees":true,"shifts":false,"training":true,"calculator":true,"verify":true,"attendance":true,"leave":true,"compoff":true,"late":true,"mispunch":true,"holiday":true,"config":false,"roles":false,"audit":true}'::jsonb),
    (p_org, 'Manager', true, true, true, false, false, false, false,
      '{"dashboard":true,"ess":true,"emp360":true,"employees":false,"shifts":false,"training":true,"calculator":false,"verify":false,"attendance":true,"leave":true,"compoff":true,"late":true,"mispunch":true,"holiday":false,"config":false,"roles":false,"audit":false}'::jsonb),
    (p_org, 'Employee', true, true, false, false, false, false, false,
      '{"dashboard":false,"ess":true,"emp360":false,"employees":false,"shifts":false,"training":false,"calculator":false,"verify":false,"attendance":false,"leave":true,"compoff":true,"late":true,"mispunch":true,"holiday":true,"config":false,"roles":false,"audit":false}'::jsonb);

  INSERT INTO audit_log (org_id, actor_label, action, target, new_value)
  VALUES (p_org, 'HR Admin', 'RBAC Reset', 'role_permissions', '6 roles');

  RETURN 6;
END;
$$;

DO $$
DECLARE r record;
BEGIN
  FOR r IN
    SELECT p.oid::regprocedure AS sig FROM pg_proc p
    WHERE p.proname IN (
      'fn_leave_balance_remaining',
      'fn_detect_sandwich_for_leave',
      'fn_process_leave_decision',
      'fn_accrue_leave_balances',
      'fn_reset_hr_role_permissions'
    )
  LOOP
    EXECUTE format('GRANT EXECUTE ON FUNCTION %s TO authenticated', r.sig);
  END LOOP;
END $$;
