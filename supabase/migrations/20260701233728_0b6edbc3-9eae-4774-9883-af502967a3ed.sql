-- =====================================================================
-- Epic 1: Master Data Administration + WPMS (Workforce Policy Management)
-- Extends existing HR schema — no CRM master duplication, no payroll engine changes.
-- =====================================================================

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
GRANT SELECT, INSERT, UPDATE, DELETE ON public.hr_masters TO authenticated;
GRANT ALL ON public.hr_masters TO service_role;
CREATE INDEX IF NOT EXISTS idx_hr_masters_org_domain ON hr_masters (org_id, domain, is_active, display_order);
ALTER TABLE hr_masters ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS hr_masters_select ON hr_masters;
CREATE POLICY hr_masters_select ON hr_masters FOR SELECT USING (current_hr_role(org_id) IS NOT NULL OR current_employee_id(org_id) IS NOT NULL);
DROP POLICY IF EXISTS hr_masters_write ON hr_masters;
CREATE POLICY hr_masters_write ON hr_masters FOR ALL USING (has_perm(org_id, 'configure') OR has_perm(org_id, 'manage_emp')) WITH CHECK (has_perm(org_id, 'configure') OR has_perm(org_id, 'manage_emp'));
DROP TRIGGER IF EXISTS trg_hr_masters_updated ON hr_masters;
CREATE TRIGGER trg_hr_masters_updated BEFORE UPDATE ON hr_masters FOR EACH ROW EXECUTE FUNCTION set_updated_at();

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

CREATE INDEX IF NOT EXISTS idx_employees_employment_type ON employees (org_id, employment_type_id) WHERE employment_type_id IS NOT NULL;

DO $$ BEGIN
  CREATE TYPE wpms_policy_kind AS ENUM ('attendance','leave','payroll','salary_template','bonus','holiday_calendar');
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
GRANT SELECT, INSERT, UPDATE, DELETE ON public.wpms_policies TO authenticated;
GRANT ALL ON public.wpms_policies TO service_role;
CREATE INDEX IF NOT EXISTS idx_wpms_policies_org_kind ON wpms_policies (org_id, policy_kind, is_active, effective_from DESC);
ALTER TABLE wpms_policies ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS wpms_policies_select ON wpms_policies;
CREATE POLICY wpms_policies_select ON wpms_policies FOR SELECT USING (current_hr_role(org_id) IS NOT NULL OR current_employee_id(org_id) IS NOT NULL);
DROP POLICY IF EXISTS wpms_policies_write ON wpms_policies;
CREATE POLICY wpms_policies_write ON wpms_policies FOR ALL USING (has_perm(org_id, 'configure')) WITH CHECK (has_perm(org_id, 'configure'));
DROP TRIGGER IF EXISTS trg_wpms_policies_updated ON wpms_policies;
CREATE TRIGGER trg_wpms_policies_updated BEFORE UPDATE ON wpms_policies FOR EACH ROW EXECUTE FUNCTION set_updated_at();

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
GRANT SELECT, INSERT, UPDATE, DELETE ON public.wpms_policy_bundles TO authenticated;
GRANT ALL ON public.wpms_policy_bundles TO service_role;
CREATE INDEX IF NOT EXISTS idx_wpms_bundles_org ON wpms_policy_bundles (org_id, is_active, effective_from DESC);
ALTER TABLE wpms_policy_bundles ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS wpms_bundles_select ON wpms_policy_bundles;
CREATE POLICY wpms_bundles_select ON wpms_policy_bundles FOR SELECT USING (current_hr_role(org_id) IS NOT NULL OR current_employee_id(org_id) IS NOT NULL);
DROP POLICY IF EXISTS wpms_bundles_write ON wpms_policy_bundles;
CREATE POLICY wpms_bundles_write ON wpms_policy_bundles FOR ALL USING (has_perm(org_id, 'configure')) WITH CHECK (has_perm(org_id, 'configure'));
DROP TRIGGER IF EXISTS trg_wpms_bundles_updated ON wpms_policy_bundles;
CREATE TRIGGER trg_wpms_bundles_updated BEFORE UPDATE ON wpms_policy_bundles FOR EACH ROW EXECUTE FUNCTION set_updated_at();

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
GRANT SELECT, INSERT, UPDATE, DELETE ON public.wpms_employee_bundle_assignments TO authenticated;
GRANT ALL ON public.wpms_employee_bundle_assignments TO service_role;
CREATE UNIQUE INDEX IF NOT EXISTS idx_wpms_emp_bundle_current ON wpms_employee_bundle_assignments (employee_id) WHERE is_current = true;
CREATE INDEX IF NOT EXISTS idx_wpms_emp_bundle_org ON wpms_employee_bundle_assignments (org_id, employee_id, effective_from DESC);
ALTER TABLE wpms_employee_bundle_assignments ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS wpms_assign_select ON wpms_employee_bundle_assignments;
CREATE POLICY wpms_assign_select ON wpms_employee_bundle_assignments FOR SELECT USING (is_hr(org_id) OR manages_employee(org_id, employee_id) OR employee_id = current_employee_id(org_id));
DROP POLICY IF EXISTS wpms_assign_write ON wpms_employee_bundle_assignments;
CREATE POLICY wpms_assign_write ON wpms_employee_bundle_assignments FOR ALL USING (has_perm(org_id, 'manage_emp') OR has_perm(org_id, 'approve')) WITH CHECK (has_perm(org_id, 'manage_emp') OR has_perm(org_id, 'approve'));

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
GRANT SELECT, INSERT, UPDATE, DELETE ON public.wpms_bundle_assignment_history TO authenticated;
GRANT ALL ON public.wpms_bundle_assignment_history TO service_role;
CREATE INDEX IF NOT EXISTS idx_wpms_bundle_hist_emp ON wpms_bundle_assignment_history (org_id, employee_id, created_at DESC);
ALTER TABLE wpms_bundle_assignment_history ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS wpms_hist_select ON wpms_bundle_assignment_history;
CREATE POLICY wpms_hist_select ON wpms_bundle_assignment_history FOR SELECT USING (is_hr(org_id) OR employee_id = current_employee_id(org_id));
DROP POLICY IF EXISTS wpms_hist_insert ON wpms_bundle_assignment_history;
CREATE POLICY wpms_hist_insert ON wpms_bundle_assignment_history FOR INSERT WITH CHECK (has_perm(org_id, 'manage_emp') OR has_perm(org_id, 'approve'));

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
GRANT SELECT, INSERT, UPDATE, DELETE ON public.wpms_events TO authenticated;
GRANT ALL ON public.wpms_events TO service_role;
CREATE INDEX IF NOT EXISTS idx_wpms_events_org ON wpms_events (org_id, created_at DESC);
ALTER TABLE wpms_events ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS wpms_events_select ON wpms_events;
CREATE POLICY wpms_events_select ON wpms_events FOR SELECT USING (is_hr(org_id));
DROP POLICY IF EXISTS wpms_events_insert ON wpms_events;
CREATE POLICY wpms_events_insert ON wpms_events FOR INSERT WITH CHECK (current_hr_role(org_id) IS NOT NULL);

CREATE OR REPLACE FUNCTION fn_wpms_log_event(
  p_org uuid, p_event_type text, p_entity_type text DEFAULT NULL, p_entity_id uuid DEFAULT NULL,
  p_payload jsonb DEFAULT '{}'::jsonb, p_actor_id uuid DEFAULT NULL, p_actor_label text DEFAULT NULL
) RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_id uuid; v_label text;
BEGIN
  v_label := COALESCE(p_actor_label, 'HR User');
  INSERT INTO wpms_events (org_id, event_type, entity_type, entity_id, payload, actor_id, actor_label)
  VALUES (p_org, p_event_type, p_entity_type, p_entity_id, COALESCE(p_payload, '{}'::jsonb), p_actor_id, v_label)
  RETURNING id INTO v_id;
  INSERT INTO audit_log (org_id, actor_id, actor_label, action, target, prev_value, new_value)
  VALUES (p_org, p_actor_id, v_label, p_event_type,
    COALESCE(p_entity_type, 'wpms') || COALESCE(' · ' || (p_payload->>'label'), ''),
    COALESCE(p_payload->>'prev', '—'), COALESCE(p_payload->>'new', '—'));
  INSERT INTO notification_delivery_log (user_id, category, channel, status, metadata)
  VALUES (p_actor_id, 'hr_wpms', 'inapp', 'sent',
    jsonb_build_object('event_type', p_event_type, 'entity_type', p_entity_type, 'entity_id', p_entity_id, 'wpms_event_id', v_id));
  RETURN v_id;
END; $$;
GRANT EXECUTE ON FUNCTION fn_wpms_log_event TO authenticated;

CREATE OR REPLACE FUNCTION fn_wpms_assign_bundle(
  p_org uuid, p_employee_id uuid, p_bundle_id uuid,
  p_effective_from date DEFAULT CURRENT_DATE, p_reason text DEFAULT NULL,
  p_actor_id uuid DEFAULT NULL, p_actor_label text DEFAULT NULL
) RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_prev uuid; v_new_id uuid; v_emp_name text; v_bundle_name text;
BEGIN
  IF NOT (has_perm(p_org, 'manage_emp') OR has_perm(p_org, 'approve')) THEN
    RAISE EXCEPTION 'Not authorized to assign policy bundles';
  END IF;
  SELECT full_name INTO v_emp_name FROM employees WHERE id = p_employee_id AND org_id = p_org;
  IF v_emp_name IS NULL THEN RAISE EXCEPTION 'Employee not found'; END IF;
  SELECT name INTO v_bundle_name FROM wpms_policy_bundles WHERE id = p_bundle_id AND org_id = p_org;
  IF v_bundle_name IS NULL THEN RAISE EXCEPTION 'Policy bundle not found'; END IF;
  SELECT bundle_id INTO v_prev FROM wpms_employee_bundle_assignments WHERE employee_id = p_employee_id AND is_current = true LIMIT 1;
  UPDATE wpms_employee_bundle_assignments SET is_current = false, effective_to = p_effective_from - 1
    WHERE employee_id = p_employee_id AND is_current = true;
  INSERT INTO wpms_employee_bundle_assignments (org_id, employee_id, bundle_id, effective_from, is_current, assigned_by, assigned_by_label, reason)
  VALUES (p_org, p_employee_id, p_bundle_id, p_effective_from, true, p_actor_id, p_actor_label, p_reason) RETURNING id INTO v_new_id;
  UPDATE employees SET wpms_current_bundle_id = p_bundle_id WHERE id = p_employee_id;
  INSERT INTO wpms_bundle_assignment_history (org_id, employee_id, previous_bundle_id, new_bundle_id, effective_date, changed_by, changed_by_label, reason)
  VALUES (p_org, p_employee_id, v_prev, p_bundle_id, p_effective_from, p_actor_id, p_actor_label, p_reason);
  PERFORM fn_wpms_log_event(p_org, CASE WHEN v_prev IS NULL THEN 'Bundle Assigned' ELSE 'Bundle Changed' END,
    'employee', p_employee_id,
    jsonb_build_object('label', v_emp_name, 'bundle', v_bundle_name, 'prev', COALESCE(v_prev::text, 'none'),
      'new', p_bundle_id::text, 'effective_from', p_effective_from, 'reason', p_reason),
    p_actor_id, p_actor_label);
  RETURN v_new_id;
END; $$;
GRANT EXECUTE ON FUNCTION fn_wpms_assign_bundle TO authenticated;

CREATE OR REPLACE FUNCTION fn_wpms_bulk_assign_bundle(
  p_org uuid, p_bundle_id uuid, p_effective_from date DEFAULT CURRENT_DATE, p_reason text DEFAULT NULL,
  p_branch_id uuid DEFAULT NULL, p_department_id uuid DEFAULT NULL, p_employment_type_id uuid DEFAULT NULL,
  p_employee_ids uuid[] DEFAULT NULL, p_dry_run boolean DEFAULT true,
  p_actor_id uuid DEFAULT NULL, p_actor_label text DEFAULT NULL
) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_ids uuid[]; v_id uuid; v_count int := 0; v_preview jsonb := '[]'::jsonb;
BEGIN
  IF NOT (has_perm(p_org, 'manage_emp') OR has_perm(p_org, 'approve')) THEN
    RAISE EXCEPTION 'Not authorized to assign policy bundles';
  END IF;
  IF p_employee_ids IS NOT NULL AND array_length(p_employee_ids, 1) > 0 THEN
    v_ids := p_employee_ids;
  ELSE
    SELECT array_agg(e.id) INTO v_ids FROM employees e
    WHERE e.org_id = p_org AND e.status NOT IN ('Resigned', 'Terminated')
      AND (p_branch_id IS NULL OR e.branch_id = p_branch_id)
      AND (p_department_id IS NULL OR e.department_id = p_department_id)
      AND (p_employment_type_id IS NULL OR e.employment_type_id = p_employment_type_id);
  END IF;
  v_ids := COALESCE(v_ids, ARRAY[]::uuid[]);
  IF p_dry_run THEN
    SELECT COALESCE(jsonb_agg(jsonb_build_object('employee_id', e.id, 'emp_code', e.emp_code, 'full_name', e.full_name, 'current_bundle_id', e.wpms_current_bundle_id)), '[]'::jsonb) INTO v_preview
    FROM employees e WHERE e.id = ANY(v_ids);
    RETURN jsonb_build_object('dry_run', true, 'count', array_length(v_ids, 1), 'employees', v_preview);
  END IF;
  FOREACH v_id IN ARRAY v_ids LOOP
    PERFORM fn_wpms_assign_bundle(p_org, v_id, p_bundle_id, p_effective_from, p_reason, p_actor_id, p_actor_label);
    v_count := v_count + 1;
  END LOOP;
  PERFORM fn_wpms_log_event(p_org, 'Bundle Bulk Assigned', 'bundle', p_bundle_id,
    jsonb_build_object('count', v_count, 'effective_from', p_effective_from, 'reason', p_reason),
    p_actor_id, p_actor_label);
  RETURN jsonb_build_object('dry_run', false, 'count', v_count);
END; $$;
GRANT EXECUTE ON FUNCTION fn_wpms_bulk_assign_bundle TO authenticated;

-- Skipping demo org seed (v_org 00000000-0000-0000-0000-0000000000f1) and RBAC UPDATE per B2c rule (schema-only, skip demo seeds).
-- fn_reset_hr_role_permissions retained as schema:
CREATE OR REPLACE FUNCTION fn_reset_hr_role_permissions(p_org uuid)
RETURNS int LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT has_perm(p_org, 'configure') THEN RAISE EXCEPTION 'Configure permission required'; END IF;
  DELETE FROM role_permissions WHERE org_id = p_org;
  INSERT INTO role_permissions(org_id, role, can_view, can_apply, can_approve, can_override, can_export, can_configure, can_manage_emp, screens) VALUES
    (p_org, 'Super Admin', true, true, true, true, true, true, true, '{"admin":true,"masterData":true,"wpms":true}'::jsonb),
    (p_org, 'Admin', true, true, true, true, true, true, true, '{"admin":true,"masterData":true,"wpms":true}'::jsonb),
    (p_org, 'HR Manager', true, true, true, true, true, false, true, '{"admin":true,"masterData":true,"wpms":true}'::jsonb),
    (p_org, 'HR Executive', true, true, true, false, true, false, true, '{"admin":true,"masterData":true,"wpms":true}'::jsonb),
    (p_org, 'Manager', true, true, true, false, false, false, false, '{"admin":false,"masterData":false,"wpms":false}'::jsonb),
    (p_org, 'Employee', true, true, false, false, false, false, false, '{"admin":false,"masterData":false,"wpms":false}'::jsonb);
  INSERT INTO audit_log (org_id, actor_label, action, target, new_value)
  VALUES (p_org, 'HR Admin', 'RBAC Reset', 'role_permissions', '6 roles (WPMS admin screens)');
  RETURN 6;
END; $$;

-- =====================================================================
-- WTM Pack 2.1 — Attendance Foundation
-- =====================================================================
DO $$ BEGIN CREATE TYPE wtm_session_status AS ENUM ('Pending','Working','On Break','Completed','Locked');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE wtm_attendance_status AS ENUM ('Present','Half Day','Absent','Holiday','Weekly Off');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE TABLE IF NOT EXISTS wtm_attendance_sessions (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id              uuid NOT NULL,
  employee_id         uuid NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  attendance_id       uuid REFERENCES attendance(id) ON DELETE SET NULL,
  shift_id            uuid REFERENCES shifts(id) ON DELETE SET NULL,
  work_date           date NOT NULL,
  clock_in            time,
  clock_out           time,
  clock_in_at         timestamptz,
  clock_out_at        timestamptz,
  working_duration_min int NOT NULL DEFAULT 0,
  break_duration_min  int NOT NULL DEFAULT 0,
  attendance_status   wtm_attendance_status NOT NULL DEFAULT 'Present',
  session_status      wtm_session_status NOT NULL DEFAULT 'Pending',
  device_info         jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_by          uuid,
  created_by_label    text,
  modified_by         uuid,
  modified_by_label   text,
  created_at          timestamptz NOT NULL DEFAULT now(),
  updated_at          timestamptz NOT NULL DEFAULT now(),
  UNIQUE (employee_id, work_date)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.wtm_attendance_sessions TO authenticated;
GRANT ALL ON public.wtm_attendance_sessions TO service_role;
CREATE INDEX IF NOT EXISTS idx_wtm_sessions_org_date ON wtm_attendance_sessions (org_id, work_date, session_status);
CREATE INDEX IF NOT EXISTS idx_wtm_sessions_emp_date ON wtm_attendance_sessions (employee_id, work_date DESC);
ALTER TABLE wtm_attendance_sessions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS wtm_sessions_select ON wtm_attendance_sessions;
CREATE POLICY wtm_sessions_select ON wtm_attendance_sessions FOR SELECT USING (is_hr(org_id) OR manages_employee(org_id, employee_id) OR employee_id = current_employee_id(org_id));
DROP POLICY IF EXISTS wtm_sessions_write ON wtm_attendance_sessions;
CREATE POLICY wtm_sessions_write ON wtm_attendance_sessions FOR ALL USING (employee_id = current_employee_id(org_id) OR manages_employee(org_id, employee_id) OR has_perm(org_id, 'manage_emp')) WITH CHECK (employee_id = current_employee_id(org_id) OR manages_employee(org_id, employee_id) OR has_perm(org_id, 'manage_emp'));
DROP TRIGGER IF EXISTS trg_wtm_sessions_updated ON wtm_attendance_sessions;
CREATE TRIGGER trg_wtm_sessions_updated BEFORE UPDATE ON wtm_attendance_sessions FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TABLE IF NOT EXISTS wtm_attendance_breaks (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id              uuid NOT NULL,
  session_id          uuid NOT NULL REFERENCES wtm_attendance_sessions(id) ON DELETE CASCADE,
  break_out           time NOT NULL,
  break_in            time,
  break_out_at        timestamptz NOT NULL DEFAULT now(),
  break_in_at         timestamptz,
  break_duration_min  int NOT NULL DEFAULT 0,
  sequence_no         int NOT NULL DEFAULT 1,
  created_at          timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.wtm_attendance_breaks TO authenticated;
GRANT ALL ON public.wtm_attendance_breaks TO service_role;
CREATE INDEX IF NOT EXISTS idx_wtm_breaks_session ON wtm_attendance_breaks (session_id, sequence_no);
ALTER TABLE wtm_attendance_breaks ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS wtm_breaks_select ON wtm_attendance_breaks;
CREATE POLICY wtm_breaks_select ON wtm_attendance_breaks FOR SELECT USING (EXISTS (SELECT 1 FROM wtm_attendance_sessions s WHERE s.id = session_id AND (is_hr(org_id) OR manages_employee(org_id, s.employee_id) OR s.employee_id = current_employee_id(org_id))));
DROP POLICY IF EXISTS wtm_breaks_write ON wtm_attendance_breaks;
CREATE POLICY wtm_breaks_write ON wtm_attendance_breaks FOR ALL USING (EXISTS (SELECT 1 FROM wtm_attendance_sessions s WHERE s.id = session_id AND (s.employee_id = current_employee_id(org_id) OR manages_employee(org_id, s.employee_id) OR has_perm(org_id, 'manage_emp')))) WITH CHECK (EXISTS (SELECT 1 FROM wtm_attendance_sessions s WHERE s.id = session_id AND (s.employee_id = current_employee_id(org_id) OR manages_employee(org_id, s.employee_id) OR has_perm(org_id, 'manage_emp'))));

CREATE TABLE IF NOT EXISTS workforce_timeline_events (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id       uuid NOT NULL,
  employee_id  uuid NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  event_type   text NOT NULL,
  session_id   uuid REFERENCES wtm_attendance_sessions(id) ON DELETE SET NULL,
  break_id     uuid REFERENCES wtm_attendance_breaks(id) ON DELETE SET NULL,
  payload      jsonb NOT NULL DEFAULT '{}'::jsonb,
  actor_id     uuid,
  actor_label  text,
  created_at   timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.workforce_timeline_events TO authenticated;
GRANT ALL ON public.workforce_timeline_events TO service_role;
CREATE INDEX IF NOT EXISTS idx_workforce_timeline_emp ON workforce_timeline_events (org_id, employee_id, created_at DESC);
ALTER TABLE workforce_timeline_events ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS wtm_timeline_select ON workforce_timeline_events;
CREATE POLICY wtm_timeline_select ON workforce_timeline_events FOR SELECT USING (is_hr(org_id) OR employee_id = current_employee_id(org_id));
DROP POLICY IF EXISTS wtm_timeline_insert ON workforce_timeline_events;
CREATE POLICY wtm_timeline_insert ON workforce_timeline_events FOR INSERT WITH CHECK (current_hr_role(org_id) IS NOT NULL OR employee_id = current_employee_id(org_id));

CREATE OR REPLACE FUNCTION fn_wtm_log_event(
  p_org uuid, p_employee_id uuid, p_event_type text,
  p_session_id uuid DEFAULT NULL, p_break_id uuid DEFAULT NULL,
  p_payload jsonb DEFAULT '{}'::jsonb, p_actor_id uuid DEFAULT NULL, p_actor_label text DEFAULT NULL
) RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_id uuid; v_label text; v_emp_name text;
BEGIN
  v_label := COALESCE(p_actor_label, 'HR User');
  SELECT full_name INTO v_emp_name FROM employees WHERE id = p_employee_id;
  INSERT INTO workforce_timeline_events (org_id, employee_id, event_type, session_id, break_id, payload, actor_id, actor_label)
  VALUES (p_org, p_employee_id, p_event_type, p_session_id, p_break_id, COALESCE(p_payload, '{}'::jsonb), p_actor_id, v_label)
  RETURNING id INTO v_id;
  INSERT INTO audit_log (org_id, actor_id, actor_label, action, target, prev_value, new_value)
  VALUES (p_org, p_actor_id, v_label, p_event_type,
    COALESCE(v_emp_name, p_employee_id::text) || ' · ' || COALESCE(p_payload->>'work_date', ''),
    COALESCE(p_payload->>'prev', '—'), COALESCE(p_payload->>'new', '—'));
  INSERT INTO notification_delivery_log (user_id, category, channel, status, metadata)
  VALUES (p_actor_id, 'hr_wtm', 'inapp', 'sent',
    jsonb_build_object('event_type', p_event_type, 'employee_id', p_employee_id, 'session_id', p_session_id, 'timeline_event_id', v_id));
  RETURN v_id;
END; $$;
GRANT EXECUTE ON FUNCTION fn_wtm_log_event TO authenticated;

CREATE OR REPLACE FUNCTION fn_wtm_sync_attendance_rollup(p_session_id uuid)
RETURNS attendance LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE s wtm_attendance_sessions; row attendance;
  v_first_break_out time; v_first_break_in time; v_total_break int;
BEGIN
  SELECT * INTO s FROM wtm_attendance_sessions WHERE id = p_session_id;
  IF s.id IS NULL THEN RAISE EXCEPTION 'Session not found'; END IF;
  SELECT COALESCE(SUM(break_duration_min), 0) INTO v_total_break FROM wtm_attendance_breaks WHERE session_id = s.id AND break_in IS NOT NULL;
  SELECT break_out, break_in INTO v_first_break_out, v_first_break_in FROM wtm_attendance_breaks WHERE session_id = s.id ORDER BY sequence_no LIMIT 1;
  INSERT INTO attendance (org_id, employee_id, work_date, check_in, check_out, break_start, break_end, break_min, status, is_mispunch, source)
  VALUES (s.org_id, s.employee_id, s.work_date, s.clock_in, s.clock_out, v_first_break_out, v_first_break_in, v_total_break,
    CASE s.attendance_status::text
      WHEN 'Weekly Off' THEN 'Week Off'::att_status WHEN 'Holiday' THEN 'Holiday'::att_status
      WHEN 'Half Day' THEN 'Half Day'::att_status WHEN 'Absent' THEN 'Absent'::att_status
      ELSE 'Present'::att_status END,
    false, 'self')
  ON CONFLICT (employee_id, work_date) DO UPDATE SET
    check_in = EXCLUDED.check_in, check_out = EXCLUDED.check_out,
    break_start = EXCLUDED.break_start, break_end = EXCLUDED.break_end, break_min = EXCLUDED.break_min,
    status = CASE WHEN attendance.status IN ('Week Off', 'Holiday', 'Leave', 'Sick Leave') THEN attendance.status ELSE EXCLUDED.status END,
    source = 'self'
  RETURNING * INTO row;
  UPDATE wtm_attendance_sessions SET attendance_id = row.id WHERE id = s.id;
  RETURN row;
END; $$;
GRANT EXECUTE ON FUNCTION fn_wtm_sync_attendance_rollup TO authenticated;

CREATE OR REPLACE FUNCTION fn_wtm_recalc_session_durations(p_session_id uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE s wtm_attendance_sessions; v_break_total int := 0; v_gross int := 0;
BEGIN
  SELECT COALESCE(SUM(break_duration_min), 0) INTO v_break_total FROM wtm_attendance_breaks WHERE session_id = p_session_id AND break_in IS NOT NULL;
  SELECT * INTO s FROM wtm_attendance_sessions WHERE id = p_session_id;
  IF s.clock_in_at IS NOT NULL AND s.clock_out_at IS NOT NULL THEN
    v_gross := GREATEST(0, FLOOR(EXTRACT(EPOCH FROM (s.clock_out_at - s.clock_in_at)) / 60)::int);
  END IF;
  UPDATE wtm_attendance_sessions SET break_duration_min = v_break_total,
    working_duration_min = GREATEST(0, v_gross - v_break_total) WHERE id = p_session_id;
END; $$;
GRANT EXECUTE ON FUNCTION fn_wtm_recalc_session_durations TO authenticated;

CREATE OR REPLACE FUNCTION fn_wtm_clock_in(
  p_employee uuid, p_work_date date DEFAULT NULL, p_time time DEFAULT NULL,
  p_meta jsonb DEFAULT '{}'::jsonb, p_actor_id uuid DEFAULT NULL, p_actor_label text DEFAULT NULL
) RETURNS wtm_attendance_sessions LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE e employees; v_date date := COALESCE(p_work_date, current_date);
  v_time time := COALESCE(p_time, current_time); v_shift uuid;
  s wtm_attendance_sessions; v_now timestamptz := now();
BEGIN
  SELECT * INTO e FROM employees WHERE id = p_employee;
  IF e.id IS NULL THEN RAISE EXCEPTION 'Employee not found'; END IF;
  IF e.id <> current_employee_id(e.org_id) AND NOT manages_employee(e.org_id, p_employee) AND NOT has_perm(e.org_id, 'manage_emp') THEN
    RAISE EXCEPTION 'Not authorized to clock in for this employee';
  END IF;
  SELECT * INTO s FROM wtm_attendance_sessions WHERE employee_id = p_employee AND work_date = v_date;
  IF s.id IS NOT NULL AND s.clock_in IS NOT NULL AND s.session_status <> 'Completed' THEN
    RAISE EXCEPTION 'Already clocked in for this date — clock out first';
  END IF;
  IF s.id IS NOT NULL AND s.session_status = 'Completed' THEN RAISE EXCEPTION 'Session already completed for this date'; END IF;
  v_shift := fn_employee_shift_at(p_employee, v_date);
  IF s.id IS NULL THEN
    INSERT INTO wtm_attendance_sessions (org_id, employee_id, shift_id, work_date, clock_in, clock_in_at, session_status, attendance_status, device_info, created_by, created_by_label, modified_by, modified_by_label)
    VALUES (e.org_id, p_employee, v_shift, v_date, v_time, v_now, 'Working', 'Present', COALESCE(p_meta, '{}'::jsonb), p_actor_id, p_actor_label, p_actor_id, p_actor_label) RETURNING * INTO s;
  ELSE
    UPDATE wtm_attendance_sessions SET shift_id = v_shift, clock_in = v_time, clock_in_at = v_now,
      clock_out = NULL, clock_out_at = NULL, working_duration_min = 0, break_duration_min = 0,
      session_status = 'Working', attendance_status = 'Present', device_info = COALESCE(p_meta, '{}'::jsonb),
      modified_by = p_actor_id, modified_by_label = p_actor_label WHERE id = s.id RETURNING * INTO s;
  END IF;
  PERFORM fn_wtm_sync_attendance_rollup(s.id);
  PERFORM fn_wtm_log_event(e.org_id, p_employee, 'AttendanceSessionStarted', s.id, NULL,
    jsonb_build_object('work_date', v_date, 'new', v_time::text, 'shift_id', v_shift), p_actor_id, p_actor_label);
  PERFORM fn_wtm_log_event(e.org_id, p_employee, 'Clock In', s.id, NULL,
    jsonb_build_object('work_date', v_date, 'new', v_time::text), p_actor_id, p_actor_label);
  RETURN s;
END; $$;
GRANT EXECUTE ON FUNCTION fn_wtm_clock_in TO authenticated;

CREATE OR REPLACE FUNCTION fn_wtm_clock_out(
  p_session uuid, p_time time DEFAULT NULL, p_meta jsonb DEFAULT '{}'::jsonb,
  p_actor_id uuid DEFAULT NULL, p_actor_label text DEFAULT NULL
) RETURNS wtm_attendance_sessions LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE s wtm_attendance_sessions; v_time time := COALESCE(p_time, current_time);
  v_now timestamptz := now(); v_open_break int;
BEGIN
  SELECT * INTO s FROM wtm_attendance_sessions WHERE id = p_session FOR UPDATE;
  IF s.id IS NULL THEN RAISE EXCEPTION 'Session not found'; END IF;
  IF s.employee_id <> current_employee_id(s.org_id) AND NOT manages_employee(s.org_id, s.employee_id) AND NOT has_perm(s.org_id, 'manage_emp') THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;
  IF s.clock_in IS NULL THEN RAISE EXCEPTION 'Clock in before clock out'; END IF;
  IF s.clock_out IS NOT NULL OR s.session_status = 'Completed' THEN RAISE EXCEPTION 'Already clocked out'; END IF;
  SELECT COUNT(*) INTO v_open_break FROM wtm_attendance_breaks WHERE session_id = s.id AND break_in IS NULL;
  IF v_open_break > 0 THEN RAISE EXCEPTION 'End break before clocking out'; END IF;
  UPDATE wtm_attendance_sessions SET clock_out = v_time, clock_out_at = v_now, session_status = 'Completed',
    device_info = device_info || COALESCE(p_meta, '{}'::jsonb), modified_by = p_actor_id, modified_by_label = p_actor_label
    WHERE id = s.id RETURNING * INTO s;
  PERFORM fn_wtm_recalc_session_durations(s.id);
  SELECT * INTO s FROM wtm_attendance_sessions WHERE id = s.id;
  PERFORM fn_wtm_sync_attendance_rollup(s.id);
  PERFORM fn_wtm_log_event(s.org_id, s.employee_id, 'AttendanceSessionCompleted', s.id, NULL,
    jsonb_build_object('work_date', s.work_date, 'new', v_time::text, 'working_min', s.working_duration_min), p_actor_id, p_actor_label);
  PERFORM fn_wtm_log_event(s.org_id, s.employee_id, 'Clock Out', s.id, NULL,
    jsonb_build_object('work_date', s.work_date, 'new', v_time::text), p_actor_id, p_actor_label);
  RETURN s;
END; $$;
GRANT EXECUTE ON FUNCTION fn_wtm_clock_out TO authenticated;

CREATE OR REPLACE FUNCTION fn_wtm_break_out(
  p_session uuid, p_time time DEFAULT NULL, p_actor_id uuid DEFAULT NULL, p_actor_label text DEFAULT NULL
) RETURNS wtm_attendance_breaks LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE s wtm_attendance_sessions; b wtm_attendance_breaks;
  v_time time := COALESCE(p_time, current_time); v_now timestamptz := now();
  v_seq int; v_open int;
BEGIN
  SELECT * INTO s FROM wtm_attendance_sessions WHERE id = p_session FOR UPDATE;
  IF s.id IS NULL THEN RAISE EXCEPTION 'Session not found'; END IF;
  IF s.employee_id <> current_employee_id(s.org_id) AND NOT manages_employee(s.org_id, s.employee_id) AND NOT has_perm(s.org_id, 'manage_emp') THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;
  IF s.clock_in IS NULL OR s.session_status NOT IN ('Working', 'On Break') THEN
    RAISE EXCEPTION 'Clock in before taking a break';
  END IF;
  IF s.session_status = 'Completed' THEN RAISE EXCEPTION 'Session already completed'; END IF;
  SELECT COUNT(*) INTO v_open FROM wtm_attendance_breaks WHERE session_id = s.id AND break_in IS NULL;
  IF v_open > 0 THEN RAISE EXCEPTION 'Already on break — break in first'; END IF;
  SELECT COALESCE(MAX(sequence_no), 0) + 1 INTO v_seq FROM wtm_attendance_breaks WHERE session_id = s.id;
  INSERT INTO wtm_attendance_breaks (org_id, session_id, break_out, break_out_at, sequence_no)
  VALUES (s.org_id, s.id, v_time, v_now, v_seq) RETURNING * INTO b;
  UPDATE wtm_attendance_sessions SET session_status = 'On Break', modified_by = p_actor_id, modified_by_label = p_actor_label WHERE id = s.id;
  PERFORM fn_wtm_log_event(s.org_id, s.employee_id, 'BreakStarted', s.id, b.id,
    jsonb_build_object('work_date', s.work_date, 'new', v_time::text, 'sequence', v_seq), p_actor_id, p_actor_label);
  PERFORM fn_wtm_log_event(s.org_id, s.employee_id, 'Break Out', s.id, b.id,
    jsonb_build_object('work_date', s.work_date, 'new', v_time::text), p_actor_id, p_actor_label);
  RETURN b;
END; $$;
GRANT EXECUTE ON FUNCTION fn_wtm_break_out TO authenticated;

CREATE OR REPLACE FUNCTION fn_wtm_break_in(
  p_session uuid, p_time time DEFAULT NULL, p_actor_id uuid DEFAULT NULL, p_actor_label text DEFAULT NULL
) RETURNS wtm_attendance_breaks LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE s wtm_attendance_sessions; b wtm_attendance_breaks;
  v_time time := COALESCE(p_time, current_time); v_now timestamptz := now(); v_dur int;
BEGIN
  SELECT * INTO s FROM wtm_attendance_sessions WHERE id = p_session FOR UPDATE;
  IF s.id IS NULL THEN RAISE EXCEPTION 'Session not found'; END IF;
  IF s.employee_id <> current_employee_id(s.org_id) AND NOT manages_employee(s.org_id, s.employee_id) AND NOT has_perm(s.org_id, 'manage_emp') THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;
  SELECT * INTO b FROM wtm_attendance_breaks WHERE session_id = s.id AND break_in IS NULL ORDER BY sequence_no DESC LIMIT 1 FOR UPDATE;
  IF b.id IS NULL THEN RAISE EXCEPTION 'No open break — break out first'; END IF;
  v_dur := GREATEST(0, FLOOR(EXTRACT(EPOCH FROM (v_now - b.break_out_at)) / 60)::int);
  UPDATE wtm_attendance_breaks SET break_in = v_time, break_in_at = v_now, break_duration_min = v_dur WHERE id = b.id RETURNING * INTO b;
  UPDATE wtm_attendance_sessions SET session_status = 'Working', modified_by = p_actor_id, modified_by_label = p_actor_label WHERE id = s.id;
  PERFORM fn_wtm_recalc_session_durations(s.id);
  PERFORM fn_wtm_sync_attendance_rollup(s.id);
  PERFORM fn_wtm_log_event(s.org_id, s.employee_id, 'BreakEnded', s.id, b.id,
    jsonb_build_object('work_date', s.work_date, 'new', v_time::text, 'duration_min', v_dur), p_actor_id, p_actor_label);
  PERFORM fn_wtm_log_event(s.org_id, s.employee_id, 'Break In', s.id, b.id,
    jsonb_build_object('work_date', s.work_date, 'new', v_time::text), p_actor_id, p_actor_label);
  RETURN b;
END; $$;
GRANT EXECUTE ON FUNCTION fn_wtm_break_in TO authenticated;

CREATE OR REPLACE FUNCTION fn_wtm_get_session(
  p_employee uuid, p_work_date date DEFAULT NULL
) RETURNS wtm_attendance_sessions LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE e employees; v_date date := COALESCE(p_work_date, current_date); s wtm_attendance_sessions;
BEGIN
  SELECT * INTO e FROM employees WHERE id = p_employee;
  IF e.id IS NULL THEN RAISE EXCEPTION 'Employee not found'; END IF;
  IF e.id <> current_employee_id(e.org_id) AND NOT manages_employee(e.org_id, p_employee) AND NOT has_perm(e.org_id, 'manage_emp') AND NOT is_hr(e.org_id) THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;
  SELECT * INTO s FROM wtm_attendance_sessions WHERE employee_id = p_employee AND work_date = v_date;
  RETURN s;
END; $$;
GRANT EXECUTE ON FUNCTION fn_wtm_get_session TO authenticated;