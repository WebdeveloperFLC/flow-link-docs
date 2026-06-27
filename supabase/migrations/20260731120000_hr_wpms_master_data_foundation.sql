-- =====================================================================
-- Epic 1: Master Data Administration + WPMS (Workforce Policy Management)
-- Extends existing HR schema — no CRM master duplication, no payroll engine changes.
-- =====================================================================

-- ---------------------------------------------------------------------
-- 1. Generic HR master registry (new master types only)
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS hr_masters (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id            uuid NOT NULL,
  domain            text NOT NULL,
  code              text NOT NULL,
  label             text NOT NULL,
  config            jsonb NOT NULL DEFAULT '{}'::jsonb,
  is_active         boolean NOT NULL DEFAULT true,
  display_order     int NOT NULL DEFAULT 0,
  remarks           text,
  created_by        uuid,
  created_by_label  text,
  modified_by       uuid,
  modified_by_label text,
  created_at        timestamptz NOT NULL DEFAULT now(),
  updated_at        timestamptz NOT NULL DEFAULT now(),
  UNIQUE (org_id, domain, code)
);

CREATE INDEX IF NOT EXISTS idx_hr_masters_org_domain
  ON hr_masters (org_id, domain, is_active, display_order);

ALTER TABLE hr_masters ENABLE ROW LEVEL SECURITY;

CREATE POLICY hr_masters_select ON hr_masters FOR SELECT
  USING (current_hr_role(org_id) IS NOT NULL OR current_employee_id(org_id) IS NOT NULL);

CREATE POLICY hr_masters_write ON hr_masters FOR ALL
  USING (has_perm(org_id, 'configure') OR has_perm(org_id, 'manage_emp'))
  WITH CHECK (has_perm(org_id, 'configure') OR has_perm(org_id, 'manage_emp'));

DROP TRIGGER IF EXISTS trg_hr_masters_updated ON hr_masters;
CREATE TRIGGER trg_hr_masters_updated
  BEFORE UPDATE ON hr_masters
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- Extend existing HR masters with audit columns
ALTER TABLE hr_document_types
  ADD COLUMN IF NOT EXISTS remarks text,
  ADD COLUMN IF NOT EXISTS created_by uuid,
  ADD COLUMN IF NOT EXISTS created_by_label text,
  ADD COLUMN IF NOT EXISTS modified_by uuid,
  ADD COLUMN IF NOT EXISTS modified_by_label text;

ALTER TABLE hr_employee_categories
  ADD COLUMN IF NOT EXISTS remarks text,
  ADD COLUMN IF NOT EXISTS created_by uuid,
  ADD COLUMN IF NOT EXISTS created_by_label text,
  ADD COLUMN IF NOT EXISTS modified_by uuid,
  ADD COLUMN IF NOT EXISTS modified_by_label text;

ALTER TABLE employees
  ADD COLUMN IF NOT EXISTS employment_type_id uuid REFERENCES hr_masters(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS wpms_current_bundle_id uuid;

CREATE INDEX IF NOT EXISTS idx_employees_employment_type
  ON employees (org_id, employment_type_id)
  WHERE employment_type_id IS NOT NULL;

-- ---------------------------------------------------------------------
-- 2. WPMS policy versions (structured policies — not replacing policies table)
-- ---------------------------------------------------------------------
DO $$ BEGIN
  CREATE TYPE wpms_policy_kind AS ENUM (
    'attendance',
    'leave',
    'payroll',
    'salary_template',
    'bonus',
    'holiday_calendar'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS wpms_policies (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id            uuid NOT NULL,
  policy_kind       wpms_policy_kind NOT NULL,
  name              text NOT NULL,
  code              text NOT NULL,
  version           int NOT NULL DEFAULT 1,
  effective_from    date NOT NULL DEFAULT CURRENT_DATE,
  effective_to      date,
  is_active         boolean NOT NULL DEFAULT true,
  config            jsonb NOT NULL DEFAULT '{}'::jsonb,
  notes             text,
  created_by        uuid,
  created_by_label  text,
  modified_by       uuid,
  modified_by_label text,
  created_at        timestamptz NOT NULL DEFAULT now(),
  updated_at        timestamptz NOT NULL DEFAULT now(),
  UNIQUE (org_id, policy_kind, code, version)
);

CREATE INDEX IF NOT EXISTS idx_wpms_policies_org_kind
  ON wpms_policies (org_id, policy_kind, is_active, effective_from DESC);

ALTER TABLE wpms_policies ENABLE ROW LEVEL SECURITY;

CREATE POLICY wpms_policies_select ON wpms_policies FOR SELECT
  USING (current_hr_role(org_id) IS NOT NULL OR current_employee_id(org_id) IS NOT NULL);

CREATE POLICY wpms_policies_write ON wpms_policies FOR ALL
  USING (has_perm(org_id, 'configure'))
  WITH CHECK (has_perm(org_id, 'configure'));

DROP TRIGGER IF EXISTS trg_wpms_policies_updated ON wpms_policies;
CREATE TRIGGER trg_wpms_policies_updated
  BEFORE UPDATE ON wpms_policies
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ---------------------------------------------------------------------
-- 3. Policy bundles
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS wpms_policy_bundles (
  id                    uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id                uuid NOT NULL,
  name                  text NOT NULL,
  code                  text NOT NULL,
  description           text,
  version               int NOT NULL DEFAULT 1,
  effective_from        date NOT NULL DEFAULT CURRENT_DATE,
  effective_to          date,
  is_active             boolean NOT NULL DEFAULT true,
  notes                 text,
  attendance_policy_id  uuid REFERENCES wpms_policies(id) ON DELETE SET NULL,
  leave_policy_id       uuid REFERENCES wpms_policies(id) ON DELETE SET NULL,
  payroll_policy_id     uuid REFERENCES wpms_policies(id) ON DELETE SET NULL,
  salary_template_id    uuid REFERENCES wpms_policies(id) ON DELETE SET NULL,
  bonus_policy_id       uuid REFERENCES wpms_policies(id) ON DELETE SET NULL,
  holiday_calendar_id   uuid REFERENCES wpms_policies(id) ON DELETE SET NULL,
  created_by            uuid,
  created_by_label      text,
  modified_by           uuid,
  modified_by_label     text,
  created_at            timestamptz NOT NULL DEFAULT now(),
  updated_at            timestamptz NOT NULL DEFAULT now(),
  UNIQUE (org_id, code, version)
);

CREATE INDEX IF NOT EXISTS idx_wpms_bundles_org
  ON wpms_policy_bundles (org_id, is_active, effective_from DESC);

ALTER TABLE wpms_policy_bundles ENABLE ROW LEVEL SECURITY;

CREATE POLICY wpms_bundles_select ON wpms_policy_bundles FOR SELECT
  USING (current_hr_role(org_id) IS NOT NULL OR current_employee_id(org_id) IS NOT NULL);

CREATE POLICY wpms_bundles_write ON wpms_policy_bundles FOR ALL
  USING (has_perm(org_id, 'configure'))
  WITH CHECK (has_perm(org_id, 'configure'));

DROP TRIGGER IF EXISTS trg_wpms_bundles_updated ON wpms_policy_bundles;
CREATE TRIGGER trg_wpms_bundles_updated
  BEFORE UPDATE ON wpms_policy_bundles
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ---------------------------------------------------------------------
-- 4. Employee bundle assignments + history
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS wpms_employee_bundle_assignments (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id            uuid NOT NULL,
  employee_id       uuid NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  bundle_id         uuid NOT NULL REFERENCES wpms_policy_bundles(id) ON DELETE RESTRICT,
  effective_from    date NOT NULL,
  effective_to      date,
  is_current        boolean NOT NULL DEFAULT true,
  assigned_by       uuid,
  assigned_by_label text,
  reason            text,
  created_at        timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_wpms_emp_bundle_current
  ON wpms_employee_bundle_assignments (employee_id)
  WHERE is_current = true;

CREATE INDEX IF NOT EXISTS idx_wpms_emp_bundle_org
  ON wpms_employee_bundle_assignments (org_id, employee_id, effective_from DESC);

ALTER TABLE wpms_employee_bundle_assignments ENABLE ROW LEVEL SECURITY;

CREATE POLICY wpms_assign_select ON wpms_employee_bundle_assignments FOR SELECT
  USING (
    is_hr(org_id)
    OR manages_employee(org_id, employee_id)
    OR employee_id = current_employee_id(org_id)
  );

CREATE POLICY wpms_assign_write ON wpms_employee_bundle_assignments FOR ALL
  USING (has_perm(org_id, 'manage_emp') OR has_perm(org_id, 'approve'))
  WITH CHECK (has_perm(org_id, 'manage_emp') OR has_perm(org_id, 'approve'));

CREATE TABLE IF NOT EXISTS wpms_bundle_assignment_history (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id              uuid NOT NULL,
  employee_id         uuid NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  previous_bundle_id  uuid REFERENCES wpms_policy_bundles(id) ON DELETE SET NULL,
  new_bundle_id       uuid NOT NULL REFERENCES wpms_policy_bundles(id) ON DELETE RESTRICT,
  effective_date      date NOT NULL,
  changed_by          uuid,
  changed_by_label    text,
  reason              text,
  created_at          timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_wpms_bundle_hist_emp
  ON wpms_bundle_assignment_history (org_id, employee_id, created_at DESC);

ALTER TABLE wpms_bundle_assignment_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY wpms_hist_select ON wpms_bundle_assignment_history FOR SELECT
  USING (is_hr(org_id) OR employee_id = current_employee_id(org_id));

CREATE POLICY wpms_hist_insert ON wpms_bundle_assignment_history FOR INSERT
  WITH CHECK (has_perm(org_id, 'manage_emp') OR has_perm(org_id, 'approve'));

-- ---------------------------------------------------------------------
-- 5. WPMS events (audit + notification framework hook)
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS wpms_events (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id       uuid NOT NULL,
  event_type   text NOT NULL,
  entity_type  text,
  entity_id    uuid,
  payload      jsonb NOT NULL DEFAULT '{}'::jsonb,
  actor_id     uuid,
  actor_label  text,
  created_at   timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_wpms_events_org
  ON wpms_events (org_id, created_at DESC);

ALTER TABLE wpms_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY wpms_events_select ON wpms_events FOR SELECT
  USING (is_hr(org_id));

CREATE POLICY wpms_events_insert ON wpms_events FOR INSERT
  WITH CHECK (current_hr_role(org_id) IS NOT NULL);

-- ---------------------------------------------------------------------
-- 6. Helpers: log WPMS event + audit + in-app notification log
-- ---------------------------------------------------------------------
CREATE OR REPLACE FUNCTION fn_wpms_log_event(
  p_org uuid,
  p_event_type text,
  p_entity_type text DEFAULT NULL,
  p_entity_id uuid DEFAULT NULL,
  p_payload jsonb DEFAULT '{}'::jsonb,
  p_actor_id uuid DEFAULT NULL,
  p_actor_label text DEFAULT NULL
) RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_id uuid;
  v_label text;
BEGIN
  v_label := COALESCE(p_actor_label, 'HR User');
  INSERT INTO wpms_events (org_id, event_type, entity_type, entity_id, payload, actor_id, actor_label)
  VALUES (p_org, p_event_type, p_entity_type, p_entity_id, COALESCE(p_payload, '{}'::jsonb), p_actor_id, v_label)
  RETURNING id INTO v_id;

  INSERT INTO audit_log (org_id, actor_id, actor_label, action, target, prev_value, new_value)
  VALUES (
    p_org,
    p_actor_id,
    v_label,
    p_event_type,
    COALESCE(p_entity_type, 'wpms') || COALESCE(' · ' || (p_payload->>'label'), ''),
    COALESCE(p_payload->>'prev', '—'),
    COALESCE(p_payload->>'new', '—')
  );

  INSERT INTO notification_delivery_log (user_id, category, channel, status, metadata)
  VALUES (
    p_actor_id,
    'hr_wpms',
    'inapp',
    'sent',
    jsonb_build_object('event_type', p_event_type, 'entity_type', p_entity_type, 'entity_id', p_entity_id, 'wpms_event_id', v_id)
  );

  RETURN v_id;
END;
$$;

GRANT EXECUTE ON FUNCTION fn_wpms_log_event TO authenticated;

-- ---------------------------------------------------------------------
-- 7. Assign bundle to one employee (history preserved)
-- ---------------------------------------------------------------------
CREATE OR REPLACE FUNCTION fn_wpms_assign_bundle(
  p_org uuid,
  p_employee_id uuid,
  p_bundle_id uuid,
  p_effective_from date DEFAULT CURRENT_DATE,
  p_reason text DEFAULT NULL,
  p_actor_id uuid DEFAULT NULL,
  p_actor_label text DEFAULT NULL
) RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_prev uuid;
  v_new_id uuid;
  v_emp_name text;
  v_bundle_name text;
BEGIN
  IF NOT (has_perm(p_org, 'manage_emp') OR has_perm(p_org, 'approve')) THEN
    RAISE EXCEPTION 'Not authorized to assign policy bundles';
  END IF;

  SELECT full_name INTO v_emp_name FROM employees WHERE id = p_employee_id AND org_id = p_org;
  IF v_emp_name IS NULL THEN RAISE EXCEPTION 'Employee not found'; END IF;

  SELECT name INTO v_bundle_name FROM wpms_policy_bundles WHERE id = p_bundle_id AND org_id = p_org;
  IF v_bundle_name IS NULL THEN RAISE EXCEPTION 'Policy bundle not found'; END IF;

  SELECT bundle_id INTO v_prev
  FROM wpms_employee_bundle_assignments
  WHERE employee_id = p_employee_id AND is_current = true
  LIMIT 1;

  UPDATE wpms_employee_bundle_assignments
  SET is_current = false, effective_to = p_effective_from - 1
  WHERE employee_id = p_employee_id AND is_current = true;

  INSERT INTO wpms_employee_bundle_assignments (
    org_id, employee_id, bundle_id, effective_from, is_current, assigned_by, assigned_by_label, reason
  ) VALUES (
    p_org, p_employee_id, p_bundle_id, p_effective_from, true, p_actor_id, p_actor_label, p_reason
  ) RETURNING id INTO v_new_id;

  UPDATE employees SET wpms_current_bundle_id = p_bundle_id WHERE id = p_employee_id;

  INSERT INTO wpms_bundle_assignment_history (
    org_id, employee_id, previous_bundle_id, new_bundle_id, effective_date, changed_by, changed_by_label, reason
  ) VALUES (
    p_org, p_employee_id, v_prev, p_bundle_id, p_effective_from, p_actor_id, p_actor_label, p_reason
  );

  PERFORM fn_wpms_log_event(
    p_org,
    CASE WHEN v_prev IS NULL THEN 'Bundle Assigned' ELSE 'Bundle Changed' END,
    'employee',
    p_employee_id,
    jsonb_build_object(
      'label', v_emp_name,
      'bundle', v_bundle_name,
      'prev', COALESCE(v_prev::text, 'none'),
      'new', p_bundle_id::text,
      'effective_from', p_effective_from,
      'reason', p_reason
    ),
    p_actor_id,
    p_actor_label
  );

  RETURN v_new_id;
END;
$$;

GRANT EXECUTE ON FUNCTION fn_wpms_assign_bundle TO authenticated;

-- ---------------------------------------------------------------------
-- 8. Bulk assign with preview (dry_run)
-- ---------------------------------------------------------------------
CREATE OR REPLACE FUNCTION fn_wpms_bulk_assign_bundle(
  p_org uuid,
  p_bundle_id uuid,
  p_effective_from date DEFAULT CURRENT_DATE,
  p_reason text DEFAULT NULL,
  p_branch_id uuid DEFAULT NULL,
  p_department_id uuid DEFAULT NULL,
  p_employment_type_id uuid DEFAULT NULL,
  p_employee_ids uuid[] DEFAULT NULL,
  p_dry_run boolean DEFAULT true,
  p_actor_id uuid DEFAULT NULL,
  p_actor_label text DEFAULT NULL
) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_ids uuid[];
  v_id uuid;
  v_count int := 0;
  v_preview jsonb := '[]'::jsonb;
BEGIN
  IF NOT (has_perm(p_org, 'manage_emp') OR has_perm(p_org, 'approve')) THEN
    RAISE EXCEPTION 'Not authorized to assign policy bundles';
  END IF;

  IF p_employee_ids IS NOT NULL AND array_length(p_employee_ids, 1) > 0 THEN
    v_ids := p_employee_ids;
  ELSE
    SELECT array_agg(e.id) INTO v_ids
    FROM employees e
    WHERE e.org_id = p_org
      AND e.status NOT IN ('Resigned', 'Terminated')
      AND (p_branch_id IS NULL OR e.branch_id = p_branch_id)
      AND (p_department_id IS NULL OR e.department_id = p_department_id)
      AND (p_employment_type_id IS NULL OR e.employment_type_id = p_employment_type_id);
  END IF;

  v_ids := COALESCE(v_ids, ARRAY[]::uuid[]);

  IF p_dry_run THEN
    SELECT COALESCE(jsonb_agg(jsonb_build_object(
      'employee_id', e.id,
      'emp_code', e.emp_code,
      'full_name', e.full_name,
      'current_bundle_id', e.wpms_current_bundle_id
    )), '[]'::jsonb) INTO v_preview
    FROM employees e
    WHERE e.id = ANY(v_ids);

    RETURN jsonb_build_object('dry_run', true, 'count', array_length(v_ids, 1), 'employees', v_preview);
  END IF;

  FOREACH v_id IN ARRAY v_ids LOOP
    PERFORM fn_wpms_assign_bundle(p_org, v_id, p_bundle_id, p_effective_from, p_reason, p_actor_id, p_actor_label);
    v_count := v_count + 1;
  END LOOP;

  PERFORM fn_wpms_log_event(
    p_org,
    'Bundle Bulk Assigned',
    'bundle',
    p_bundle_id,
    jsonb_build_object('count', v_count, 'effective_from', p_effective_from, 'reason', p_reason),
    p_actor_id,
    p_actor_label
  );

  RETURN jsonb_build_object('dry_run', false, 'count', v_count);
END;
$$;

GRANT EXECUTE ON FUNCTION fn_wpms_bulk_assign_bundle TO authenticated;

-- ---------------------------------------------------------------------
-- 9. Demo org seed — masters + WPMS policies + bundles
-- ---------------------------------------------------------------------
DO $$
DECLARE
  v_org uuid := '00000000-0000-0000-0000-0000000000f1';
  v_att uuid; v_leave uuid; v_pay uuid; v_sal uuid; v_bonus uuid; v_hol uuid;
  v_att_ca uuid; v_leave_ca uuid; v_pay_ca uuid; v_sal_ca uuid; v_bonus_ca uuid; v_hol_ca uuid;
  v_b_ind uuid; v_b_fac uuid; v_b_ca uuid; v_b_con uuid; v_b_leg uuid;
BEGIN
  -- Employment masters
  INSERT INTO hr_masters (org_id, domain, code, label, display_order, config) VALUES
    (v_org, 'employment_type', 'permanent', 'Permanent', 10, '{"default_probation_months":3}'),
    (v_org, 'employment_type', 'probation', 'Probation', 20, '{}'),
    (v_org, 'employment_type', 'contract', 'Contract', 30, '{}'),
    (v_org, 'employment_type', 'intern', 'Intern', 40, '{}'),
    (v_org, 'employment_type', 'consultant', 'Consultant', 50, '{"pay_mode":"consultant"}'),
    (v_org, 'employment_status', 'active', 'Active', 10, '{}'),
    (v_org, 'employment_status', 'on_notice', 'On Notice', 20, '{}'),
    (v_org, 'leave_type', 'casual_leave', 'Casual Leave', 10, '{"paid":true}'),
    (v_org, 'leave_type', 'sick_leave', 'Sick Leave', 20, '{"paid":true}'),
    (v_org, 'leave_type', 'unpaid_leave', 'Unpaid Leave', 30, '{"paid":false}'),
    (v_org, 'salary_component', 'basic', 'Basic Salary', 10, '{"type":"earning"}'),
    (v_org, 'salary_component', 'hra', 'HRA', 20, '{"type":"earning"}'),
    (v_org, 'salary_component', 'special_allowance', 'Special Allowance', 30, '{"type":"earning"}'),
    (v_org, 'loan_type', 'personal_loan', 'Personal Loan', 10, '{}'),
    (v_org, 'advance_type', 'salary_advance', 'Salary Advance', 10, '{}')
  ON CONFLICT (org_id, domain, code) DO NOTHING;

  -- India Standard policies
  INSERT INTO wpms_policies (org_id, policy_kind, name, code, version, config) VALUES
    (v_org, 'attendance', 'India Standard Attendance', 'india_std_att', 1, jsonb_build_object(
      'working_days', jsonb_build_array('Mon','Tue','Wed','Thu','Fri','Sat'),
      'saturday_mandatory', true,
      'grace_minutes', 10,
      'monthly_late_minutes_cap', 120,
      'working_hours', 9,
      'missing_punch_rule', 'half_day_after_2',
      'photo_evidence_required', false,
      'daily_salary_preview', false
    )),
    (v_org, 'leave', 'India Standard Leave', 'india_std_leave', 1, jsonb_build_object(
      'monthly_cl', 1.0, 'monthly_sl', 0.5,
      'carry_forward', true, 'encashment', false,
      'sandwich_leave', true, 'approval_levels', 2
    )),
    (v_org, 'payroll', 'India Standard Payroll', 'india_std_pay', 1, jsonb_build_object(
      'day_calculation', 'working_day',
      'cycle_type', 'calendar_month',
      'pf_applicable', true, 'esi_applicable', true,
      'professional_tax', true, 'tds', true,
      'salary_lock', true, 'payroll_lock', true
    )),
    (v_org, 'salary_template', 'India Standard Salary', 'india_std_salary', 1, jsonb_build_object(
      'basic_pct', 40, 'hra_pct', 20, 'special_allowance_pct', 25,
      'conveyance', 1600, 'medical', 1250, 'custom_components', jsonb_build_array()
    )),
    (v_org, 'bonus', 'India Standard Bonus', 'india_std_bonus', 1, jsonb_build_object(
      'eligible', true, 'after_months', 12,
      'include_probation', false, 'manual_override', true, 'approval_required', true
    )),
    (v_org, 'holiday_calendar', 'India National', 'india_holidays', 1, jsonb_build_object(
      'region', 'IN', 'scope', 'country'
    ))
  ON CONFLICT (org_id, policy_kind, code, version) DO NOTHING;

  SELECT id INTO v_att FROM wpms_policies WHERE org_id = v_org AND code = 'india_std_att' AND version = 1;
  SELECT id INTO v_leave FROM wpms_policies WHERE org_id = v_org AND code = 'india_std_leave' AND version = 1;
  SELECT id INTO v_pay FROM wpms_policies WHERE org_id = v_org AND code = 'india_std_pay' AND version = 1;
  SELECT id INTO v_sal FROM wpms_policies WHERE org_id = v_org AND code = 'india_std_salary' AND version = 1;
  SELECT id INTO v_bonus FROM wpms_policies WHERE org_id = v_org AND code = 'india_std_bonus' AND version = 1;
  SELECT id INTO v_hol FROM wpms_policies WHERE org_id = v_org AND code = 'india_holidays' AND version = 1;

  -- Canada Ontario policies
  INSERT INTO wpms_policies (org_id, policy_kind, name, code, version, config) VALUES
    (v_org, 'attendance', 'Canada Ontario Attendance', 'ca_on_att', 1, '{"working_days":["Mon","Tue","Wed","Thu","Fri"],"saturday_mandatory":false,"grace_minutes":5,"working_hours":8}'),
    (v_org, 'leave', 'Canada Ontario Leave', 'ca_on_leave', 1, '{"monthly_cl":0,"monthly_sl":0,"carry_forward":true,"region":"CA-ON"}'),
    (v_org, 'payroll', 'Canada Ontario Payroll', 'ca_on_pay', 1, '{"day_calculation":"calendar_day","cycle_type":"26_25","pf_applicable":false,"consultant_rules":false}'),
    (v_org, 'salary_template', 'Canada Ontario Salary', 'ca_on_salary', 1, '{"basic_pct":100,"currency":"CAD"}'),
    (v_org, 'bonus', 'Canada Ontario Bonus', 'ca_on_bonus', 1, '{"eligible":true,"after_months":6}'),
    (v_org, 'holiday_calendar', 'Ontario Holidays', 'ca_on_holidays', 1, '{"region":"CA-ON","scope":"province"}')
  ON CONFLICT (org_id, policy_kind, code, version) DO NOTHING;

  SELECT id INTO v_att_ca FROM wpms_policies WHERE org_id = v_org AND code = 'ca_on_att' AND version = 1;
  SELECT id INTO v_leave_ca FROM wpms_policies WHERE org_id = v_org AND code = 'ca_on_leave' AND version = 1;
  SELECT id INTO v_pay_ca FROM wpms_policies WHERE org_id = v_org AND code = 'ca_on_pay' AND version = 1;
  SELECT id INTO v_sal_ca FROM wpms_policies WHERE org_id = v_org AND code = 'ca_on_salary' AND version = 1;
  SELECT id INTO v_bonus_ca FROM wpms_policies WHERE org_id = v_org AND code = 'ca_on_bonus' AND version = 1;
  SELECT id INTO v_hol_ca FROM wpms_policies WHERE org_id = v_org AND code = 'ca_on_holidays' AND version = 1;

  INSERT INTO wpms_policy_bundles (org_id, name, code, version, description,
    attendance_policy_id, leave_policy_id, payroll_policy_id, salary_template_id, bonus_policy_id, holiday_calendar_id)
  VALUES
    (v_org, 'India Standard', 'india_standard', 1, 'Default India workforce bundle',
      v_att, v_leave, v_pay, v_sal, v_bonus, v_hol),
    (v_org, 'India Faculty', 'india_faculty', 1, 'Faculty-specific India bundle',
      v_att, v_leave, v_pay, v_sal, v_bonus, v_hol),
    (v_org, 'Canada Ontario', 'canada_ontario', 1, 'Ontario Canada bundle',
      v_att_ca, v_leave_ca, v_pay_ca, v_sal_ca, v_bonus_ca, v_hol_ca),
    (v_org, 'Consultant', 'consultant', 1, 'Consultant / non-statutory bundle',
      v_att, v_leave, v_pay, v_sal, v_bonus, v_hol),
    (v_org, 'Legacy Employee', 'legacy_employee', 1, 'Grandfathered legacy rules',
      v_att, v_leave, v_pay, v_sal, v_bonus, v_hol)
  ON CONFLICT (org_id, code, version) DO NOTHING;
END $$;

-- ---------------------------------------------------------------------
-- 10. RBAC — Administration + WPMS screens
-- ---------------------------------------------------------------------
UPDATE role_permissions
SET screens = screens || '{"admin":true,"masterData":true,"wpms":true}'::jsonb
WHERE org_id = '00000000-0000-0000-0000-0000000000f1'
  AND role IN ('Super Admin', 'Admin', 'HR Manager', 'HR Executive');

UPDATE role_permissions
SET screens = screens || '{"admin":false,"masterData":false,"wpms":false}'::jsonb
WHERE org_id = '00000000-0000-0000-0000-0000000000f1'
  AND role IN ('Manager', 'Employee');

CREATE OR REPLACE FUNCTION fn_reset_hr_role_permissions(p_org uuid)
RETURNS int LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT has_perm(p_org, 'configure') THEN
    RAISE EXCEPTION 'Configure permission required';
  END IF;

  DELETE FROM role_permissions WHERE org_id = p_org;

  INSERT INTO role_permissions(org_id, role, can_view, can_apply, can_approve, can_override, can_export, can_configure, can_manage_emp, screens) VALUES
    (p_org, 'Super Admin', true, true, true, true, true, true, true,
      '{"dashboard":true,"ess":true,"emp360":true,"employees":true,"documents":true,"training":true,"attendance":true,"leave":true,"compoff":true,"late":true,"mispunch":true,"holiday":true,"payrollCycle":true,"calculator":true,"verify":true,"salaryRegister":true,"payrollHistory":true,"approvals":true,"reports":true,"config":true,"docTypes":true,"shifts":true,"roles":true,"audit":true,"admin":true,"masterData":true,"wpms":true}'::jsonb),
    (p_org, 'Admin', true, true, true, true, true, true, true,
      '{"dashboard":true,"ess":true,"emp360":true,"employees":true,"documents":true,"training":true,"attendance":true,"leave":true,"compoff":true,"late":true,"mispunch":true,"holiday":true,"payrollCycle":true,"calculator":true,"verify":true,"salaryRegister":true,"payrollHistory":true,"approvals":true,"reports":true,"config":true,"docTypes":true,"shifts":true,"roles":true,"audit":true,"admin":true,"masterData":true,"wpms":true}'::jsonb),
    (p_org, 'HR Manager', true, true, true, true, true, false, true,
      '{"dashboard":true,"ess":true,"emp360":true,"employees":true,"documents":true,"training":true,"attendance":true,"leave":true,"compoff":true,"late":true,"mispunch":true,"holiday":true,"payrollCycle":true,"calculator":true,"verify":true,"salaryRegister":true,"payrollHistory":true,"approvals":true,"reports":true,"config":false,"docTypes":true,"shifts":true,"roles":true,"audit":true,"admin":true,"masterData":true,"wpms":true}'::jsonb),
    (p_org, 'HR Executive', true, true, true, false, true, false, true,
      '{"dashboard":true,"ess":true,"emp360":true,"employees":true,"documents":true,"training":true,"attendance":true,"leave":true,"compoff":true,"late":true,"mispunch":true,"holiday":true,"payrollCycle":true,"calculator":true,"verify":true,"salaryRegister":true,"payrollHistory":true,"approvals":true,"reports":true,"config":false,"docTypes":true,"shifts":false,"roles":false,"audit":true,"admin":true,"masterData":true,"wpms":true}'::jsonb),
    (p_org, 'Manager', true, true, true, false, false, false, false,
      '{"dashboard":true,"ess":true,"emp360":true,"employees":false,"documents":false,"training":true,"attendance":true,"leave":true,"compoff":true,"late":true,"mispunch":true,"holiday":false,"payrollCycle":false,"calculator":false,"verify":false,"salaryRegister":false,"payrollHistory":false,"approvals":true,"reports":false,"config":false,"docTypes":false,"shifts":false,"roles":false,"audit":false,"admin":false,"masterData":false,"wpms":false}'::jsonb),
    (p_org, 'Employee', true, true, false, false, false, false, false,
      '{"dashboard":false,"ess":true,"emp360":false,"employees":false,"documents":false,"training":false,"attendance":false,"leave":true,"compoff":true,"late":true,"mispunch":true,"holiday":true,"payrollCycle":false,"calculator":false,"verify":false,"salaryRegister":false,"payrollHistory":false,"approvals":false,"reports":false,"config":false,"docTypes":false,"shifts":false,"roles":false,"audit":false,"admin":false,"masterData":false,"wpms":false}'::jsonb);

  INSERT INTO audit_log (org_id, actor_label, action, target, new_value)
  VALUES (p_org, 'HR Admin', 'RBAC Reset', 'role_permissions', '6 roles (WPMS admin screens)');

  RETURN 6;
END;
$$;
