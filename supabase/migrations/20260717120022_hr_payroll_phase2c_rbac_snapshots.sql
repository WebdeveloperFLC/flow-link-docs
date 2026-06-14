-- =====================================================================
-- HR Payroll — Phase 2C: CRM RBAC sync, Canada tax brackets, snapshot engine
-- Run after 20260717120021_hr_payroll_uat_isha_link.sql
-- =====================================================================

-- ---- CRM → HR role mapping (centralized RBAC bridge) ----
CREATE TABLE IF NOT EXISTS hr_crm_role_map (
  org_id    uuid NOT NULL,
  crm_role  text NOT NULL,
  hr_role   hr_role NOT NULL,
  PRIMARY KEY (org_id, crm_role)
);

INSERT INTO hr_crm_role_map (org_id, crm_role, hr_role) VALUES
  ('00000000-0000-0000-0000-0000000000f1', 'admin', 'Admin'),
  ('00000000-0000-0000-0000-0000000000f1', 'administrator', 'Admin'),
  ('00000000-0000-0000-0000-0000000000f1', 'manager', 'Manager'),
  ('00000000-0000-0000-0000-0000000000f1', 'counselor', 'HR Manager'),
  ('00000000-0000-0000-0000-0000000000f1', 'commission_admin', 'HR Executive'),
  ('00000000-0000-0000-0000-0000000000f1', 'documentation', 'Employee'),
  ('00000000-0000-0000-0000-0000000000f1', 'telecaller', 'Employee'),
  ('00000000-0000-0000-0000-0000000000f1', 'viewer', 'Employee')
ON CONFLICT (org_id, crm_role) DO UPDATE SET hr_role = EXCLUDED.hr_role;

CREATE OR REPLACE FUNCTION fn_map_crm_role_to_hr(p_org uuid, p_crm_role text)
RETURNS hr_role LANGUAGE sql STABLE AS $$
  SELECT COALESCE(
    (SELECT hr_role FROM hr_crm_role_map WHERE org_id = p_org AND crm_role = p_crm_role),
    'Employee'::hr_role
  );
$$;

CREATE OR REPLACE FUNCTION fn_sync_hr_role_from_crm(p_org uuid, p_staff_id uuid)
RETURNS hr_role LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_crm text;
  v_hr hr_role;
BEGIN
  IF p_staff_id IS NULL THEN RETURN NULL; END IF;

  SELECT ur.role::text INTO v_crm
  FROM user_roles ur
  WHERE ur.user_id = p_staff_id
    AND ur.role <> 'client'::app_role
  ORDER BY CASE ur.role
    WHEN 'admin'::app_role THEN 1
    WHEN 'administrator'::app_role THEN 1
    WHEN 'manager'::app_role THEN 2
    WHEN 'counselor'::app_role THEN 3
    WHEN 'commission_admin'::app_role THEN 4
    ELSE 9
  END
  LIMIT 1;

  IF v_crm IS NULL THEN RETURN NULL; END IF;

  v_hr := fn_map_crm_role_to_hr(p_org, v_crm);

  INSERT INTO role_assignments (org_id, staff_id, role)
  VALUES (p_org, p_staff_id, v_hr)
  ON CONFLICT (org_id, staff_id) DO UPDATE SET role = EXCLUDED.role;

  RETURN v_hr;
END;
$$;

CREATE OR REPLACE FUNCTION fn_sync_all_crm_hr_roles(p_org uuid)
RETURNS int LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  r record;
  v_count int := 0;
BEGIN
  IF NOT has_perm(p_org, 'configure') THEN
    RAISE EXCEPTION 'Configure permission required';
  END IF;

  FOR r IN
    SELECT DISTINCT ur.user_id
    FROM user_roles ur
    JOIN profiles p ON p.id = ur.user_id
    WHERE ur.role <> 'client'::app_role
      AND COALESCE(p.deleted_at, p.status) IS DISTINCT FROM 'deleted'
  LOOP
    PERFORM fn_sync_hr_role_from_crm(p_org, r.user_id);
    v_count := v_count + 1;
  END LOOP;

  INSERT INTO audit_log (org_id, actor_label, action, target, new_value)
  VALUES (p_org, 'HR Admin', 'CRM RBAC Sync', 'role_assignments', v_count::text || ' staff');

  RETURN v_count;
END;
$$;

-- ---- Canada progressive income tax ----
CREATE OR REPLACE FUNCTION fn_canada_income_tax(
  p_gross numeric,
  p_policy jsonb,
  p_tds_applicable boolean
) RETURNS numeric LANGUAGE plpgsql IMMUTABLE AS $$
DECLARE
  v_mode text;
  v_bracket jsonb;
  v_tax numeric := 0;
  v_remaining numeric;
  v_prev numeric := 0;
  v_up_to numeric;
  v_rate numeric;
  v_slice numeric;
BEGIN
  IF NOT COALESCE(p_tds_applicable, false) THEN RETURN 0; END IF;

  v_mode := COALESCE(p_policy->>'income_tax_mode', 'flat');
  IF v_mode = 'flat' OR v_mode = '' THEN
    RETURN round(p_gross * COALESCE((p_policy->>'income_tax_flat')::numeric, 0));
  END IF;

  -- Brackets apply to annualized gross; return monthly portion
  v_remaining := p_gross * 12;
  FOR v_bracket IN
    SELECT value FROM jsonb_array_elements(COALESCE(p_policy->'income_tax_brackets', '[]'::jsonb))
    ORDER BY COALESCE(NULLIF(value->>'up_to', '')::numeric, 999999999)
  LOOP
    v_up_to := NULLIF(v_bracket->>'up_to', '')::numeric;
    v_rate := COALESCE((v_bracket->>'rate')::numeric, 0);
    IF v_up_to IS NULL THEN
      v_tax := v_tax + v_remaining * v_rate;
      EXIT;
    END IF;
    v_slice := GREATEST(LEAST(v_remaining, v_up_to - v_prev), 0);
    v_tax := v_tax + v_slice * v_rate;
    v_remaining := v_remaining - v_slice;
    v_prev := v_up_to;
    IF v_remaining <= 0 THEN EXIT; END IF;
  END LOOP;

  RETURN round(v_tax / 12);
END;
$$;

-- ---- Cycle-level policy snapshot ----
CREATE TABLE IF NOT EXISTS payroll_cycle_snapshots (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id         uuid NOT NULL,
  cycle_id       uuid NOT NULL REFERENCES payroll_cycles(id) ON DELETE CASCADE,
  snapshot_stage text NOT NULL CHECK (snapshot_stage IN ('processed', 'locked')),
  policies_json  jsonb NOT NULL DEFAULT '{}'::jsonb,
  meta_json      jsonb NOT NULL DEFAULT '{}'::jsonb,
  captured_at    timestamptz NOT NULL DEFAULT now(),
  captured_by    uuid,
  UNIQUE (cycle_id, snapshot_stage)
);

CREATE INDEX IF NOT EXISTS idx_payroll_cycle_snapshots_cycle ON payroll_cycle_snapshots (cycle_id);

-- Bootstrap line snapshots if migration 20 was skipped or failed mid-run
CREATE TABLE IF NOT EXISTS payroll_line_snapshots (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id          uuid NOT NULL,
  cycle_id        uuid NOT NULL REFERENCES payroll_cycles(id) ON DELETE CASCADE,
  employee_id     uuid NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  line_json       jsonb NOT NULL DEFAULT '{}'::jsonb,
  input_snapshot  jsonb,
  locked_at       timestamptz NOT NULL DEFAULT now(),
  snapshot_stage  text NOT NULL DEFAULT 'locked',
  detail_json     jsonb
);

CREATE INDEX IF NOT EXISTS idx_payroll_snapshots_cycle ON payroll_line_snapshots (cycle_id);

ALTER TABLE payroll_line_snapshots
  ADD COLUMN IF NOT EXISTS snapshot_stage text NOT NULL DEFAULT 'locked';

ALTER TABLE payroll_line_snapshots
  ADD COLUMN IF NOT EXISTS detail_json jsonb;

-- Replace unique constraint to allow processed + locked per employee
ALTER TABLE payroll_line_snapshots DROP CONSTRAINT IF EXISTS payroll_line_snapshots_cycle_id_employee_id_key;
CREATE UNIQUE INDEX IF NOT EXISTS idx_payroll_line_snapshots_stage
  ON payroll_line_snapshots (cycle_id, employee_id, snapshot_stage);

CREATE OR REPLACE FUNCTION fn_collect_cycle_policies(p_org uuid, p_as_of date)
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_out jsonb := '{}'::jsonb;
  d text;
  pol jsonb;
BEGIN
  FOR d IN SELECT unnest(ARRAY[
    'late', 'mispunch', 'leave', 'sandwich_ul', 'overtime',
    'professional_tax', 'canada_deductions', 'workflow'
  ])
  LOOP
    pol := fn_resolve_policy(p_org, d, p_as_of);
    IF pol IS NOT NULL THEN
      v_out := v_out || jsonb_build_object(d, pol);
    END IF;
  END LOOP;
  RETURN v_out;
END;
$$;

CREATE OR REPLACE FUNCTION fn_build_employee_snapshot_detail(p_employee uuid, p_cycle uuid)
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE
  e employees;
  c payroll_cycles;
  v_att jsonb;
  v_leave jsonb;
BEGIN
  SELECT * INTO e FROM employees WHERE id = p_employee;
  SELECT * INTO c FROM payroll_cycles WHERE id = p_cycle;
  v_att := fn_rollup_inputs(p_employee, p_cycle);

  SELECT COALESCE(jsonb_agg(jsonb_build_object(
    'leave_type', lb.type,
    'entitled', lb.entitled,
    'accrued', lb.accrued,
    'taken', lb.taken,
    'carried_in', lb.carried_in,
    'encashed', lb.encashed
  )), '[]'::jsonb) INTO v_leave
  FROM leave_balances lb
  WHERE lb.employee_id = p_employee AND lb.org_id = e.org_id;

  RETURN jsonb_build_object(
    'employee', jsonb_build_object(
      'emp_code', e.emp_code,
      'full_name', e.full_name,
      'monthly_gross', e.monthly_gross,
      'basic', e.basic,
      'hra', e.hra,
      'conveyance', e.conveyance,
      'special_allow', e.special_allow,
      'salary_currency', e.salary_currency,
      'payroll_country', e.payroll_country,
      'pf_applicable', e.pf_applicable,
      'esic_applicable', e.esic_applicable,
      'pt_applicable', e.pt_applicable,
      'tds_applicable', e.tds_applicable
    ),
    'attendance', v_att,
    'leave_balances', v_leave,
    'cycle', jsonb_build_object(
      'label', c.label,
      'start_date', c.start_date,
      'end_date', c.end_date,
      'payroll_days', c.payroll_days
    )
  );
END;
$$;

CREATE OR REPLACE FUNCTION fn_capture_payroll_snapshots(p_cycle uuid, p_stage text)
RETURNS int LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  c payroll_cycles;
  e record;
  pl record;
  v_policies jsonb;
  v_count int := 0;
  v_detail jsonb;
BEGIN
  IF p_stage NOT IN ('processed', 'locked') THEN
    RAISE EXCEPTION 'Invalid snapshot stage: %', p_stage;
  END IF;

  SELECT * INTO c FROM payroll_cycles WHERE id = p_cycle;
  IF c.id IS NULL THEN RAISE EXCEPTION 'Cycle not found'; END IF;

  v_policies := fn_collect_cycle_policies(c.org_id, c.start_date);

  INSERT INTO payroll_cycle_snapshots (org_id, cycle_id, snapshot_stage, policies_json, meta_json, captured_by)
  VALUES (
    c.org_id, p_cycle, p_stage, v_policies,
    jsonb_build_object(
      'cycle_label', c.label,
      'cycle_status', c.status,
      'employee_count', (
        SELECT count(*) FROM employees
        WHERE org_id = c.org_id AND status NOT IN ('Terminated', 'Resigned')
      )
    ),
    auth.uid()
  )
  ON CONFLICT (cycle_id, snapshot_stage) DO UPDATE SET
    policies_json = EXCLUDED.policies_json,
    meta_json = EXCLUDED.meta_json,
    captured_at = now(),
    captured_by = EXCLUDED.captured_by;

  FOR e IN
    SELECT id FROM employees
    WHERE org_id = c.org_id AND status NOT IN ('Terminated', 'Resigned')
  LOOP
    v_detail := fn_build_employee_snapshot_detail(e.id, p_cycle);
    SELECT * INTO pl FROM payroll_lines WHERE cycle_id = p_cycle AND employee_id = e.id;

    IF pl.id IS NOT NULL THEN
      INSERT INTO payroll_line_snapshots (
        org_id, cycle_id, employee_id, snapshot_stage,
        line_json, input_snapshot, detail_json, locked_at
      ) VALUES (
        c.org_id, p_cycle, e.id, p_stage,
        to_jsonb(pl) - 'id' - 'created_at',
        pl.input_snapshot,
        v_detail,
        now()
      )
      ON CONFLICT (cycle_id, employee_id, snapshot_stage) DO UPDATE SET
        line_json = EXCLUDED.line_json,
        input_snapshot = EXCLUDED.input_snapshot,
        detail_json = EXCLUDED.detail_json,
        locked_at = now();
      v_count := v_count + 1;
    END IF;
  END LOOP;

  RETURN v_count;
END;
$$;

-- ---- fn_compute_payroll: Canada bracket tax ----
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
  p_ul_mult       numeric DEFAULT 2,
  p_ot_minutes    int DEFAULT 0,
  p_ot_policy     jsonb DEFAULT NULL,
  p_pt_applicable boolean DEFAULT false,
  p_pt_amount     numeric DEFAULT 0,
  p_payroll_country text DEFAULT 'IN',
  p_canada_policy jsonb DEFAULT NULL,
  p_other_deductions numeric DEFAULT 0,
  p_tds_applicable boolean DEFAULT false
) RETURNS jsonb LANGUAGE plpgsql IMMUTABLE AS $$
DECLARE
  k numeric; n numeric; payable numeric; daily numeric; gross numeric;
  basic numeric; pf_wage numeric; pf_emp numeric; esic_emp numeric; pt_emp numeric; net numeric;
  pf_ceiling numeric := COALESCE((p_late_policy->>'pf_ceiling')::numeric, 15000);
  esic_ceiling numeric := COALESCE((p_late_policy->>'esic_ceiling')::numeric, 21000);
  v_ot_pay numeric := 0;
  v_hourly numeric;
  v_mode text;
  v_min_ot int;
  v_cpp_rate numeric;
  v_ei_rate numeric;
  v_policy_other numeric;
  v_is_ca boolean;
BEGIN
  k := fn_late_deduction(p_late, p_late_policy);
  n := fn_mispunch_deduction(p_mispunch, p_mispunch_policy);
  payable := p_payroll_days - COALESCE(p_leaves, 0) + COALESCE(p_paid_leaves, 0)
             + COALESCE(p_compoff, 0) - k - (COALESCE(p_ul, 0) * COALESCE(p_ul_mult, 2))
             - COALESCE(p_sandwich, 0) - n - COALESCE(p_unpaid_training, 0);
  daily := round(p_monthly / NULLIF(p_payroll_days, 0), 2);
  gross := round(daily * payable);
  basic := COALESCE(p_basic, round(p_monthly * 0.5));

  v_mode := COALESCE(p_ot_policy->>'mode', 'display');
  v_min_ot := COALESCE((p_ot_policy->>'min_ot_minutes')::int, 30);
  IF v_mode = 'paid' AND COALESCE(p_ot_minutes, 0) >= v_min_ot THEN
    v_hourly := daily / COALESCE((p_ot_policy->>'hours_per_day')::numeric, 8);
    v_ot_pay := round(
      (p_ot_minutes / 60.0) * v_hourly * COALESCE((p_ot_policy->>'rate_multiplier')::numeric, 1.5)
    );
  END IF;

  v_is_ca := upper(COALESCE(p_payroll_country, 'IN')) IN ('CA', 'CAN', 'CANADA');

  IF v_is_ca THEN
    v_cpp_rate := COALESCE((p_canada_policy->>'cpp_rate')::numeric, 0.0595);
    v_ei_rate := COALESCE((p_canada_policy->>'ei_rate')::numeric, 0.0166);
    v_policy_other := COALESCE((p_canada_policy->>'other_deductions')::numeric, 0);
    pf_emp := round(gross * v_cpp_rate);
    esic_emp := round(gross * v_ei_rate);
    pt_emp := fn_canada_income_tax(gross, p_canada_policy, p_tds_applicable)
              + v_policy_other + COALESCE(p_other_deductions, 0);
  ELSE
    pf_wage := least(basic, pf_ceiling);
    pf_emp  := CASE WHEN p_pf_applicable THEN round(pf_wage * 0.12) ELSE 0 END;
    esic_emp := CASE WHEN p_esic_applicable AND p_monthly <= esic_ceiling THEN round(gross * 0.0075) ELSE 0 END;
    pt_emp := CASE WHEN COALESCE(p_pt_applicable, false) THEN COALESCE(p_pt_amount, 0) ELSE 0 END;
    IF COALESCE(p_tds_applicable, false) THEN
      pt_emp := pt_emp + COALESCE(p_other_deductions, 0);
    END IF;
  END IF;

  net := gross + COALESCE(p_incentive, 0) + COALESCE(p_bonus, 0) + v_ot_pay - pf_emp - esic_emp - pt_emp;
  RETURN jsonb_build_object(
    'late_deduction', k,
    'mispunch_deduction', n,
    'payable_days', round(payable, 2),
    'daily_rate', daily,
    'gross_earned', gross,
    'pf_employee', pf_emp,
    'esic_employee', esic_emp,
    'pt_employee', pt_emp,
    'incentive', COALESCE(p_incentive, 0),
    'bonus', COALESCE(p_bonus, 0),
    'ot_minutes', COALESCE(p_ot_minutes, 0),
    'ot_pay', v_ot_pay,
    'net_salary', round(net),
    'payroll_country', CASE WHEN v_is_ca THEN 'CA' ELSE 'IN' END
  );
END;
$$;

-- ---- Process: capture processed snapshots ----
CREATE OR REPLACE FUNCTION fn_process_payroll_cycle(p_cycle uuid)
RETURNS payroll_cycles LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE c payroll_cycles;
DECLARE e record;
BEGIN
  SELECT * INTO c FROM payroll_cycles WHERE id = p_cycle FOR UPDATE;
  IF c.id IS NULL THEN RAISE EXCEPTION 'Cycle not found'; END IF;
  IF c.status <> 'Draft' THEN RAISE EXCEPTION 'Only Draft cycles can be processed (current: %)', c.status; END IF;
  IF NOT has_perm(c.org_id, 'approve') THEN RAISE EXCEPTION 'Approve permission required'; END IF;

  PERFORM fn_rebuild_cycle_lines(p_cycle);

  FOR e IN
    SELECT id FROM employees
    WHERE org_id = c.org_id AND status NOT IN ('Terminated', 'Resigned')
  LOOP
    UPDATE payroll_lines
    SET input_snapshot = fn_rollup_inputs(e.id, p_cycle)
    WHERE cycle_id = p_cycle AND employee_id = e.id;
  END LOOP;

  PERFORM fn_capture_payroll_snapshots(p_cycle, 'processed');

  UPDATE payroll_cycles
  SET status = 'Processed', processed_by = auth.uid(), processed_at = now()
  WHERE id = p_cycle
  RETURNING * INTO c;

  INSERT INTO audit_log (org_id, actor_label, action, target, new_value)
  VALUES (c.org_id, 'HR', 'Payroll Processed', c.label, c.status || ' · snapshots captured');

  RETURN c;
END;
$$;

-- ---- Lock: final locked snapshots (reuses migration 20 line logic + stage locked) ----
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

  PERFORM fn_capture_payroll_snapshots(p_cycle, 'locked');

  UPDATE payroll_cycles
  SET status = 'Locked', approved_at = COALESCE(approved_at, now())
  WHERE id = p_cycle
  RETURNING * INTO c;

  INSERT INTO audit_log (org_id, actor_label, action, target, new_value)
  VALUES (
    c.org_id, 'HR', 'Payroll Locked', c.label,
    c.status || ' · ' || (
      SELECT COUNT(*)::text FROM payroll_line_snapshots
      WHERE cycle_id = p_cycle AND snapshot_stage = 'locked'
    ) || ' snapshots'
  );

  RETURN c;
END;
$$;

-- Demo: enable bracket tax placeholder on canada policy (optional progressive mode)
UPDATE policies
SET config = config || jsonb_build_object(
  'income_tax_mode', 'flat',
  'income_tax_brackets', jsonb_build_array(
    jsonb_build_object('up_to', '55867', 'rate', '0.15'),
    jsonb_build_object('up_to', '111733', 'rate', '0.205'),
    jsonb_build_object('up_to', '', 'rate', '0.26')
  )
)
WHERE org_id = '00000000-0000-0000-0000-0000000000f1'::uuid
  AND domain = 'canada_deductions'
  AND NOT (config ? 'income_tax_brackets');

GRANT SELECT ON hr_crm_role_map TO authenticated;
GRANT SELECT ON payroll_cycle_snapshots TO authenticated;
GRANT SELECT ON payroll_line_snapshots TO authenticated;

DO $$
DECLARE r record;
BEGIN
  FOR r IN
    SELECT p.oid::regprocedure AS sig FROM pg_proc p
    WHERE p.proname IN (
      'fn_sync_hr_role_from_crm',
      'fn_sync_all_crm_hr_roles',
      'fn_capture_payroll_snapshots'
    )
  LOOP
    EXECUTE format('GRANT EXECUTE ON FUNCTION %s TO authenticated', r.sig);
  END LOOP;
END $$;
