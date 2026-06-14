-- =====================================================================
-- HR Payroll — Policy-driven engine, approval chains, payroll preview
-- Run after 20260717120011_hr_payroll_leave_workflow.sql
-- =====================================================================

-- Resolve active policy config for a domain on a given date
CREATE OR REPLACE FUNCTION fn_resolve_policy(
  p_org uuid,
  p_domain text,
  p_as_of date DEFAULT current_date
) RETURNS jsonb LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT COALESCE(
    (SELECT config FROM policies
     WHERE org_id = p_org AND domain = p_domain AND effective_from <= p_as_of
     ORDER BY effective_from DESC, version DESC
     LIMIT 1),
    '{}'::jsonb
  );
$$;

-- Late slab (Excel nested-IF by default; optional custom slab_table in policy)
CREATE OR REPLACE FUNCTION fn_late_deduction(p_late int, p_policy jsonb DEFAULT NULL)
RETURNS numeric LANGUAGE plpgsql IMMUTABLE AS $$
DECLARE
  slab record;
BEGIN
  IF p_policy IS NOT NULL AND p_policy ? 'slab_table' THEN
    FOR slab IN
      SELECT (elem->>'max')::int AS max_late, (elem->>'deduction')::numeric AS ded
      FROM jsonb_array_elements(p_policy->'slab_table') AS elem
      ORDER BY (elem->>'max')::int
    LOOP
      IF p_late <= slab.max_late THEN
        RETURN slab.ded;
      END IF;
    END LOOP;
    RETURN 5;
  END IF;

  RETURN CASE
    WHEN p_late <= 3  THEN 0
    WHEN p_late <= 6  THEN 0.5
    WHEN p_late <= 9  THEN 1
    WHEN p_late <= 12 THEN 1.5
    WHEN p_late <= 15 THEN 2
    WHEN p_late <= 18 THEN 2.5
    WHEN p_late <= 21 THEN 3
    WHEN p_late <= 24 THEN 3.5
    WHEN p_late <= 27 THEN 4
    ELSE 5
  END::numeric;
END;
$$;

-- Mispunch (2 free / 0.5 each by default; policy overrides)
CREATE OR REPLACE FUNCTION fn_mispunch_deduction(p_mis int, p_policy jsonb DEFAULT NULL)
RETURNS numeric LANGUAGE sql IMMUTABLE AS $$
  SELECT CASE
    WHEN p_mis <= COALESCE((p_policy->>'free_per_month')::int, 2) THEN 0
    ELSE (p_mis - COALESCE((p_policy->>'free_per_month')::int, 2))
         * COALESCE((p_policy->>'rate_after_free')::numeric, 0.5)
  END::numeric;
$$;

-- Core payroll with policy-aware deductions
CREATE OR REPLACE FUNCTION fn_compute_payroll(
  p_payroll_days  int,
  p_monthly       numeric,
  p_basic         numeric,
  p_incentive     numeric DEFAULT 0,
  p_bonus         numeric DEFAULT 0,
  p_pf_applicable boolean DEFAULT true,
  p_esic_applicable boolean DEFAULT false,
  p_leaves        numeric DEFAULT 0,
  p_paid_leaves   numeric DEFAULT 0,
  p_late          int DEFAULT 0,
  p_ul            int DEFAULT 0,
  p_sandwich      numeric DEFAULT 0,
  p_mispunch      int DEFAULT 0,
  p_compoff       numeric DEFAULT 0,
  p_unpaid_training int DEFAULT 0,
  p_late_policy   jsonb DEFAULT NULL,
  p_mispunch_policy jsonb DEFAULT NULL,
  p_ul_mult       numeric DEFAULT 2
) RETURNS jsonb LANGUAGE plpgsql IMMUTABLE AS $$
DECLARE
  k numeric; n numeric; payable numeric; daily numeric; gross numeric;
  basic numeric; pf_wage numeric; pf_emp numeric; esic_emp numeric; net numeric;
  pf_ceiling numeric := COALESCE((p_late_policy->>'pf_ceiling')::numeric, 15000);
  esic_ceiling numeric := COALESCE((p_late_policy->>'esic_ceiling')::numeric, 21000);
BEGIN
  k := fn_late_deduction(p_late, p_late_policy);
  n := fn_mispunch_deduction(p_mispunch, p_mispunch_policy);
  payable := p_payroll_days - COALESCE(p_leaves, 0) + COALESCE(p_paid_leaves, 0)
             + COALESCE(p_compoff, 0) - k - (COALESCE(p_ul, 0) * COALESCE(p_ul_mult, 2))
             - COALESCE(p_sandwich, 0) - n - COALESCE(p_unpaid_training, 0);
  daily := round(p_monthly / NULLIF(p_payroll_days, 0), 2);
  gross := round(daily * payable);
  basic := COALESCE(p_basic, round(p_monthly * 0.5));
  pf_wage := least(basic, pf_ceiling);
  pf_emp  := CASE WHEN p_pf_applicable THEN round(pf_wage * 0.12) ELSE 0 END;
  esic_emp := CASE WHEN p_esic_applicable AND p_monthly <= esic_ceiling THEN round(gross * 0.0075) ELSE 0 END;
  net := gross + COALESCE(p_incentive, 0) + COALESCE(p_bonus, 0) - pf_emp - esic_emp;
  RETURN jsonb_build_object(
    'late_deduction', k,
    'mispunch_deduction', n,
    'payable_days', round(payable, 2),
    'daily_rate', daily,
    'gross_earned', gross,
    'pf_employee', pf_emp,
    'esic_employee', esic_emp,
    'incentive', COALESCE(p_incentive, 0),
    'bonus', COALESCE(p_bonus, 0),
    'net_salary', round(net)
  );
END;
$$;

-- Build payroll line using policies effective at cycle start
CREATE OR REPLACE FUNCTION fn_build_payroll_line(p_employee uuid, p_cycle uuid)
RETURNS payroll_lines LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  c record; e record; inp jsonb; calc jsonb; row payroll_lines;
  use_override boolean; ov jsonb;
  v_late_pol jsonb; v_mis_pol jsonb; v_sul_pol jsonb; v_ul_mult numeric;
BEGIN
  SELECT * INTO c FROM payroll_cycles WHERE id = p_cycle;
  IF c.status <> 'Draft' THEN
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
  v_ul_mult := COALESCE((v_sul_pol->>'ul_multiplier')::numeric, 2);

  calc := fn_compute_payroll(
    c.payroll_days, e.monthly_gross, e.basic, e.incentive, e.bonus,
    e.pf_applicable, e.esic_applicable,
    (inp->>'leaves')::numeric, (inp->>'paid_leaves')::numeric,
    (inp->>'late')::int, (inp->>'ul')::int, (inp->>'sandwich')::numeric,
    (inp->>'mispunch')::int, (inp->>'comp_off')::numeric, (inp->>'unpaid_training')::int,
    v_late_pol, v_mis_pol, v_ul_mult
  );

  INSERT INTO payroll_lines AS pl (
    org_id, cycle_id, employee_id, payroll_days, monthly_gross, basic,
    leaves_taken, paid_leaves, comp_off, late_count, mispunch_count, ul_count,
    sandwich_count, unpaid_training, late_deduction, mispunch_deduction,
    payable_days, daily_rate, gross_earned, incentive, bonus,
    pf_employee, esic_employee, net_salary, is_overridden, override_json
  ) VALUES (
    e.org_id, p_cycle, p_employee, c.payroll_days, e.monthly_gross, e.basic,
    (inp->>'leaves')::numeric, (inp->>'paid_leaves')::numeric, (inp->>'comp_off')::numeric,
    (inp->>'late')::int, (inp->>'mispunch')::int, (inp->>'ul')::int,
    (inp->>'sandwich')::numeric, (inp->>'unpaid_training')::int,
    (calc->>'late_deduction')::numeric, (calc->>'mispunch_deduction')::numeric,
    (calc->>'payable_days')::numeric, (calc->>'daily_rate')::numeric,
    (calc->>'gross_earned')::numeric, (calc->>'incentive')::numeric, (calc->>'bonus')::numeric,
    (calc->>'pf_employee')::numeric, (calc->>'esic_employee')::numeric, (calc->>'net_salary')::numeric,
    COALESCE(use_override, false), ov
  )
  ON CONFLICT (cycle_id, employee_id) DO UPDATE SET
    payroll_days = excluded.payroll_days, monthly_gross = excluded.monthly_gross, basic = excluded.basic,
    leaves_taken = excluded.leaves_taken, paid_leaves = excluded.paid_leaves, comp_off = excluded.comp_off,
    late_count = excluded.late_count, mispunch_count = excluded.mispunch_count, ul_count = excluded.ul_count,
    sandwich_count = excluded.sandwich_count, unpaid_training = excluded.unpaid_training,
    late_deduction = excluded.late_deduction, mispunch_deduction = excluded.mispunch_deduction,
    payable_days = excluded.payable_days, daily_rate = excluded.daily_rate, gross_earned = excluded.gross_earned,
    incentive = excluded.incentive, bonus = excluded.bonus,
    pf_employee = excluded.pf_employee, esic_employee = excluded.esic_employee, net_salary = excluded.net_salary,
    is_overridden = excluded.is_overridden, override_json = excluded.override_json
  RETURNING * INTO row;
  RETURN row;
END;
$$;

-- Payroll preview view (locked register + employee context)
CREATE OR REPLACE VIEW v_payroll_preview
WITH (security_invoker = true) AS
SELECT
  pl.id,
  pl.org_id,
  pl.cycle_id,
  pl.employee_id,
  e.emp_code,
  e.full_name,
  e.designation,
  e.department,
  co.name AS company_name,
  br.name AS branch_name,
  cy.label AS cycle_label,
  cy.start_date AS cycle_start,
  cy.end_date AS cycle_end,
  cy.status AS cycle_status,
  pl.payroll_days,
  pl.monthly_gross,
  pl.basic,
  pl.leaves_taken,
  pl.paid_leaves,
  pl.comp_off,
  pl.late_count,
  pl.mispunch_count,
  pl.ul_count,
  pl.sandwich_count,
  pl.unpaid_training,
  pl.late_deduction,
  pl.mispunch_deduction,
  pl.payable_days,
  pl.daily_rate,
  pl.gross_earned,
  pl.incentive,
  pl.bonus,
  pl.pf_employee,
  pl.esic_employee,
  pl.net_salary,
  pl.is_overridden,
  pl.created_at,
  pl.updated_at
FROM payroll_lines pl
JOIN employees e ON e.id = pl.employee_id
JOIN payroll_cycles cy ON cy.id = pl.cycle_id
LEFT JOIN companies co ON co.id = e.company_id
LEFT JOIN branches br ON br.id = e.branch_id;

GRANT SELECT ON v_payroll_preview TO authenticated;

-- =====================================================================
-- Approval chain workflow
-- =====================================================================

CREATE OR REPLACE FUNCTION fn_workflow_config(p_org uuid, p_as_of date DEFAULT current_date)
RETURNS jsonb LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT COALESCE(
    fn_resolve_policy(p_org, 'workflow', p_as_of),
    '{"enabled":true,"chain":["Manager","HR"],"skip_manager_when_no_mgr":true}'::jsonb
  );
$$;

CREATE OR REPLACE FUNCTION fn_init_entity_approvals(
  p_org uuid,
  p_entity_type text,
  p_entity_id uuid,
  p_employee_id uuid
) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  wf jsonb;
  stg text;
  e record;
  skip_mgr boolean;
BEGIN
  wf := fn_workflow_config(p_org);
  IF COALESCE((wf->>'enabled')::boolean, true) = false THEN
    RETURN;
  END IF;

  SELECT * INTO e FROM employees WHERE id = p_employee_id;
  skip_mgr := COALESCE((wf->>'skip_manager_when_no_mgr')::boolean, true);

  FOR stg IN
    SELECT jsonb_array_elements_text(COALESCE(wf->'chain', '["Manager","HR"]'::jsonb))
  LOOP
    IF stg = 'Manager' AND skip_mgr AND e.reporting_mgr_id IS NULL THEN
      CONTINUE;
    END IF;
    INSERT INTO approvals (org_id, entity_type, entity_id, stage, decision)
    VALUES (p_org, p_entity_type, p_entity_id, stg::approval_stage, 'Pending');
  END LOOP;
END;
$$;

CREATE OR REPLACE FUNCTION trg_hr_init_approvals()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  PERFORM fn_init_entity_approvals(NEW.org_id, TG_ARGV[0], NEW.id, NEW.employee_id);
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS leave_init_approvals ON leave_requests;
CREATE TRIGGER leave_init_approvals
  AFTER INSERT ON leave_requests
  FOR EACH ROW EXECUTE FUNCTION trg_hr_init_approvals('leave');

DROP TRIGGER IF EXISTS compoff_init_approvals ON compoff_requests;
CREATE TRIGGER compoff_init_approvals
  AFTER INSERT ON compoff_requests
  FOR EACH ROW EXECUTE FUNCTION trg_hr_init_approvals('compoff');

DROP TRIGGER IF EXISTS late_init_approvals ON late_exemptions;
CREATE TRIGGER late_init_approvals
  AFTER INSERT ON late_exemptions
  FOR EACH ROW EXECUTE FUNCTION trg_hr_init_approvals('late');

DROP TRIGGER IF EXISTS mispunch_init_approvals ON mispunch_requests;
CREATE TRIGGER mispunch_init_approvals
  AFTER INSERT ON mispunch_requests
  FOR EACH ROW EXECUTE FUNCTION trg_hr_init_approvals('mispunch');

CREATE OR REPLACE FUNCTION fn_can_approve_stage(
  p_org uuid,
  p_employee_id uuid,
  p_stage approval_stage
) RETURNS boolean LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF p_stage = 'Manager' THEN
    RETURN manages_employee(p_org, p_employee_id) OR has_perm(p_org, 'manage_emp');
  ELSIF p_stage IN ('HR', 'Final') THEN
    RETURN has_perm(p_org, 'approve');
  END IF;
  RETURN false;
END;
$$;

CREATE OR REPLACE FUNCTION fn_finalize_leave_on_approve(p_request uuid)
RETURNS leave_requests LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  r leave_requests;
  e employees;
  v_remaining numeric;
  v_year int;
  v_was_approved boolean;
BEGIN
  SELECT * INTO r FROM leave_requests WHERE id = p_request FOR UPDATE;
  IF r.id IS NULL THEN RAISE EXCEPTION 'Leave request not found'; END IF;

  SELECT * INTO e FROM employees WHERE id = r.employee_id;
  v_was_approved := (r.status = 'Approved');
  v_year := extract(year FROM r.from_date)::int;

  IF NOT v_was_approved THEN
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

  UPDATE leave_requests SET status = 'Approved' WHERE id = p_request RETURNING * INTO r;

  IF NOT v_was_approved THEN
    INSERT INTO leave_balances (org_id, employee_id, policy_year, type, entitled, accrued, taken)
    VALUES (r.org_id, r.employee_id, v_year, r.type, 0, 0, 0)
    ON CONFLICT (employee_id, policy_year, type) DO NOTHING;

    UPDATE leave_balances
    SET taken = taken + r.days
    WHERE employee_id = r.employee_id AND policy_year = v_year AND type = r.type;

    PERFORM fn_detect_sandwich_for_leave(r.id);
  END IF;

  RETURN r;
END;
$$;

CREATE OR REPLACE FUNCTION fn_process_approval_decision(
  p_entity_type text,
  p_entity_id uuid,
  p_decision request_status,
  p_comment text DEFAULT NULL
) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_org uuid;
  v_emp uuid;
  v_status request_status;
  v_stage approval_stage;
  v_appr record;
  v_pending int;
  v_actor uuid;
BEGIN
  IF p_decision NOT IN ('Approved', 'Rejected', 'Pending') THEN
    RAISE EXCEPTION 'Invalid decision %', p_decision;
  END IF;

  v_actor := current_employee_id(v_org);

  IF p_entity_type = 'leave' THEN
    SELECT org_id, employee_id, status INTO v_org, v_emp, v_status
    FROM leave_requests WHERE id = p_entity_id FOR UPDATE;
  ELSIF p_entity_type = 'compoff' THEN
    SELECT org_id, employee_id, status INTO v_org, v_emp, v_status
    FROM compoff_requests WHERE id = p_entity_id FOR UPDATE;
  ELSIF p_entity_type = 'late' THEN
    SELECT org_id, employee_id, status INTO v_org, v_emp, v_status
    FROM late_exemptions WHERE id = p_entity_id FOR UPDATE;
  ELSIF p_entity_type = 'mispunch' THEN
    SELECT org_id, employee_id, status INTO v_org, v_emp, v_status
    FROM mispunch_requests WHERE id = p_entity_id FOR UPDATE;
  ELSE
    RAISE EXCEPTION 'Unknown entity type %', p_entity_type;
  END IF;

  IF v_org IS NULL THEN RAISE EXCEPTION 'Request not found'; END IF;

  SELECT COUNT(*) INTO v_pending
  FROM approvals
  WHERE entity_type = p_entity_type AND entity_id = p_entity_id AND decision = 'Pending';

  -- No chain rows → direct HR decision (legacy / workflow disabled)
  IF v_pending = 0 THEN
    IF NOT has_perm(v_org, 'approve') THEN
      RAISE EXCEPTION 'Not authorized to decide';
    END IF;

    IF p_entity_type = 'leave' THEN
      IF p_decision = 'Approved' THEN
        PERFORM fn_finalize_leave_on_approve(p_entity_id);
      ELSE
        UPDATE leave_requests SET status = p_decision WHERE id = p_entity_id;
      END IF;
    ELSIF p_entity_type = 'compoff' THEN
      UPDATE compoff_requests SET status = p_decision WHERE id = p_entity_id;
    ELSIF p_entity_type = 'late' THEN
      UPDATE late_exemptions SET status = p_decision WHERE id = p_entity_id;
    ELSIF p_entity_type = 'mispunch' THEN
      UPDATE mispunch_requests SET status = p_decision WHERE id = p_entity_id;
    END IF;

    RETURN jsonb_build_object('entity_type', p_entity_type, 'entity_id', p_entity_id, 'status', p_decision, 'stage', 'HR');
  END IF;

  SELECT * INTO v_appr
  FROM approvals
  WHERE entity_type = p_entity_type AND entity_id = p_entity_id AND decision = 'Pending'
  ORDER BY CASE stage WHEN 'Manager' THEN 1 WHEN 'HR' THEN 2 WHEN 'Final' THEN 3 ELSE 4 END
  LIMIT 1 FOR UPDATE;

  IF NOT fn_can_approve_stage(v_org, v_emp, v_appr.stage) THEN
    RAISE EXCEPTION 'Not authorized for % stage', v_appr.stage;
  END IF;

  UPDATE approvals
  SET decision = p_decision, acted_at = now(), approver_id = v_actor, comment = p_comment
  WHERE id = v_appr.id;

  IF p_decision = 'Rejected' THEN
    IF p_entity_type = 'leave' THEN
      UPDATE leave_requests SET status = 'Rejected' WHERE id = p_entity_id;
    ELSIF p_entity_type = 'compoff' THEN
      UPDATE compoff_requests SET status = 'Rejected' WHERE id = p_entity_id;
    ELSIF p_entity_type = 'late' THEN
      UPDATE late_exemptions SET status = 'Rejected' WHERE id = p_entity_id;
    ELSIF p_entity_type = 'mispunch' THEN
      UPDATE mispunch_requests SET status = 'Rejected' WHERE id = p_entity_id;
    END IF;
    RETURN jsonb_build_object('entity_type', p_entity_type, 'entity_id', p_entity_id, 'status', 'Rejected', 'stage', v_appr.stage);
  END IF;

  SELECT COUNT(*) INTO v_pending
  FROM approvals
  WHERE entity_type = p_entity_type AND entity_id = p_entity_id AND decision = 'Pending';

  IF v_pending > 0 THEN
    RETURN jsonb_build_object('entity_type', p_entity_type, 'entity_id', p_entity_id, 'status', 'Pending', 'stage', v_appr.stage);
  END IF;

  -- All stages approved → finalize
  IF p_entity_type = 'leave' THEN
    PERFORM fn_finalize_leave_on_approve(p_entity_id);
  ELSIF p_entity_type = 'compoff' THEN
    UPDATE compoff_requests SET status = 'Approved' WHERE id = p_entity_id;
  ELSIF p_entity_type = 'late' THEN
    UPDATE late_exemptions SET status = 'Approved' WHERE id = p_entity_id;
  ELSIF p_entity_type = 'mispunch' THEN
    UPDATE mispunch_requests SET status = 'Approved' WHERE id = p_entity_id;
  END IF;

  RETURN jsonb_build_object('entity_type', p_entity_type, 'entity_id', p_entity_id, 'status', 'Approved', 'stage', v_appr.stage);
END;
$$;

-- Leave RPC now routes through approval chain
CREATE OR REPLACE FUNCTION fn_process_leave_decision(
  p_request uuid,
  p_decision request_status
) RETURNS leave_requests LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  r leave_requests;
  v_result jsonb;
BEGIN
  v_result := fn_process_approval_decision('leave', p_request, p_decision);
  SELECT * INTO r FROM leave_requests WHERE id = p_request;
  RETURN r;
END;
$$;

-- Demo workflow policy + backfill approval rows for pending requests
INSERT INTO policies (org_id, domain, effective_from, version, config)
SELECT
  '00000000-0000-0000-0000-0000000000f1'::uuid,
  'workflow',
  '2026-01-01'::date,
  1,
  '{"enabled":true,"chain":["Manager","HR"],"skip_manager_when_no_mgr":true}'::jsonb
WHERE NOT EXISTS (
  SELECT 1 FROM policies
  WHERE org_id = '00000000-0000-0000-0000-0000000000f1'::uuid
    AND domain = 'workflow' AND version = 1
);

DO $$
DECLARE
  r record;
BEGIN
  FOR r IN
    SELECT 'leave' AS et, lr.id, lr.org_id, lr.employee_id
    FROM leave_requests lr
    WHERE lr.org_id = '00000000-0000-0000-0000-0000000000f1'::uuid
      AND lr.status = 'Pending'
      AND NOT EXISTS (SELECT 1 FROM approvals a WHERE a.entity_type = 'leave' AND a.entity_id = lr.id)
    UNION ALL
    SELECT 'compoff', cr.id, cr.org_id, cr.employee_id
    FROM compoff_requests cr
    WHERE cr.org_id = '00000000-0000-0000-0000-0000000000f1'::uuid
      AND cr.status = 'Pending'
      AND NOT EXISTS (SELECT 1 FROM approvals a WHERE a.entity_type = 'compoff' AND a.entity_id = cr.id)
    UNION ALL
    SELECT 'late', le.id, le.org_id, le.employee_id
    FROM late_exemptions le
    WHERE le.org_id = '00000000-0000-0000-0000-0000000000f1'::uuid
      AND le.status = 'Pending'
      AND NOT EXISTS (SELECT 1 FROM approvals a WHERE a.entity_type = 'late' AND a.entity_id = le.id)
    UNION ALL
    SELECT 'mispunch', mr.id, mr.org_id, mr.employee_id
    FROM mispunch_requests mr
    WHERE mr.org_id = '00000000-0000-0000-0000-0000000000f1'::uuid
      AND mr.status = 'Pending'
      AND NOT EXISTS (SELECT 1 FROM approvals a WHERE a.entity_type = 'mispunch' AND a.entity_id = mr.id)
  LOOP
    PERFORM fn_init_entity_approvals(r.org_id, r.et, r.id, r.employee_id);
  END LOOP;
END $$;

DO $$
DECLARE r record;
BEGIN
  FOR r IN
    SELECT p.oid::regprocedure AS sig FROM pg_proc p
    WHERE p.proname IN (
      'fn_resolve_policy',
      'fn_workflow_config',
      'fn_init_entity_approvals',
      'fn_can_approve_stage',
      'fn_finalize_leave_on_approve',
      'fn_process_approval_decision',
      'fn_process_leave_decision',
      'fn_build_payroll_line',
      'fn_compute_payroll',
      'fn_late_deduction',
      'fn_mispunch_deduction'
    )
  LOOP
    EXECUTE format('GRANT EXECUTE ON FUNCTION %s TO authenticated', r.sig);
  END LOOP;
END $$;
