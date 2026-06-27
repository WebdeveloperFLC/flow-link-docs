-- =====================================================================
-- WTM Pack 2.2 — Attendance Exception Management System (AEMS)
-- Extends WTM sessions — does NOT modify fn_compute_payroll.
-- =====================================================================

DO $$ BEGIN
  CREATE TYPE aems_exception_status AS ENUM (
    'Draft', 'Submitted', 'Under Review', 'Approved', 'Rejected',
    'Returned for Clarification', 'Closed'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE aems_incident_status AS ENUM ('Open', 'Active', 'Closed');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- ---------------------------------------------------------------------
-- 1. Workforce Incident Register (branch-level operational incidents)
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS workforce_incidents (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id            uuid NOT NULL,
  incident_code     text NOT NULL,
  branch_id         uuid,
  start_at          timestamptz NOT NULL,
  end_at            timestamptz,
  incident_type_code text NOT NULL,
  description       text NOT NULL,
  status            aems_incident_status NOT NULL DEFAULT 'Open',
  created_by        uuid,
  created_by_label  text,
  closed_by         uuid,
  closed_by_label   text,
  closed_at         timestamptz,
  created_at        timestamptz NOT NULL DEFAULT now(),
  updated_at        timestamptz NOT NULL DEFAULT now(),
  UNIQUE (org_id, incident_code)
);

CREATE INDEX IF NOT EXISTS idx_workforce_incidents_org_branch
  ON workforce_incidents (org_id, branch_id, start_at DESC);

ALTER TABLE workforce_incidents ENABLE ROW LEVEL SECURITY;

CREATE POLICY workforce_incidents_select ON workforce_incidents FOR SELECT
  USING (is_hr(org_id) OR current_hr_role(org_id) IS NOT NULL);

CREATE POLICY workforce_incidents_write ON workforce_incidents FOR ALL
  USING (has_perm(org_id, 'configure') OR has_perm(org_id, 'manage_emp'))
  WITH CHECK (has_perm(org_id, 'configure') OR has_perm(org_id, 'manage_emp'));

DROP TRIGGER IF EXISTS trg_workforce_incidents_updated ON workforce_incidents;
CREATE TRIGGER trg_workforce_incidents_updated
  BEFORE UPDATE ON workforce_incidents
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ---------------------------------------------------------------------
-- 2. Attendance exceptions
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS attendance_exceptions (
  id                    uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id                uuid NOT NULL,
  employee_id           uuid NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  branch_id             uuid,
  session_id            uuid REFERENCES wtm_attendance_sessions(id) ON DELETE SET NULL,
  work_date             date NOT NULL,
  exception_type_code   text NOT NULL,
  requested_clock_in    time,
  requested_clock_out   time,
  description           text NOT NULL,
  incident_id           uuid REFERENCES workforce_incidents(id) ON DELETE SET NULL,
  status                aems_exception_status NOT NULL DEFAULT 'Draft',
  original_clock_in     time,
  original_clock_out    time,
  approved_clock_in     time,
  approved_clock_out    time,
  is_manual             boolean NOT NULL DEFAULT false,
  is_bulk               boolean NOT NULL DEFAULT false,
  submitted_at          timestamptz,
  resolved_at           timestamptz,
  resolved_by           uuid,
  resolved_by_label     text,
  latest_comment        text,
  created_by            uuid,
  created_by_label      text,
  modified_by           uuid,
  modified_by_label     text,
  created_at            timestamptz NOT NULL DEFAULT now(),
  updated_at            timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_aems_exceptions_org_status
  ON attendance_exceptions (org_id, status, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_aems_exceptions_emp
  ON attendance_exceptions (employee_id, work_date DESC);

CREATE INDEX IF NOT EXISTS idx_aems_exceptions_session
  ON attendance_exceptions (session_id) WHERE session_id IS NOT NULL;

ALTER TABLE attendance_exceptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY aems_exceptions_select ON attendance_exceptions FOR SELECT
  USING (
    is_hr(org_id)
    OR manages_employee(org_id, employee_id)
    OR employee_id = current_employee_id(org_id)
  );

CREATE POLICY aems_exceptions_insert ON attendance_exceptions FOR INSERT
  WITH CHECK (
    employee_id = current_employee_id(org_id)
    OR manages_employee(org_id, employee_id)
    OR has_perm(org_id, 'manage_emp')
  );

CREATE POLICY aems_exceptions_update ON attendance_exceptions FOR UPDATE
  USING (
    (employee_id = current_employee_id(org_id) AND status IN ('Draft', 'Returned for Clarification'))
    OR has_perm(org_id, 'manage_emp')
    OR has_perm(org_id, 'approve')
  );

DROP TRIGGER IF EXISTS trg_aems_exceptions_updated ON attendance_exceptions;
CREATE TRIGGER trg_aems_exceptions_updated
  BEFORE UPDATE ON attendance_exceptions
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ---------------------------------------------------------------------
-- 3. Exception evidence (hr-docs storage metadata)
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS aems_exception_evidence (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id              uuid NOT NULL,
  exception_id        uuid NOT NULL REFERENCES attendance_exceptions(id) ON DELETE CASCADE,
  employee_id         uuid NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  file_name           text NOT NULL,
  storage_path        text NOT NULL,
  mime                text,
  file_size_bytes     int,
  notes               text,
  uploaded_by         uuid,
  uploaded_by_label   text,
  created_at          timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_aems_evidence_exception
  ON aems_exception_evidence (exception_id);

ALTER TABLE aems_exception_evidence ENABLE ROW LEVEL SECURITY;

CREATE POLICY aems_evidence_select ON aems_exception_evidence FOR SELECT
  USING (
    is_hr(org_id)
    OR manages_employee(org_id, employee_id)
    OR employee_id = current_employee_id(org_id)
  );

CREATE POLICY aems_evidence_write ON aems_exception_evidence FOR ALL
  USING (
    employee_id = current_employee_id(org_id)
    OR has_perm(org_id, 'manage_emp')
    OR has_perm(org_id, 'approve')
  )
  WITH CHECK (
    employee_id = current_employee_id(org_id)
    OR has_perm(org_id, 'manage_emp')
    OR has_perm(org_id, 'approve')
  );

-- ---------------------------------------------------------------------
-- 4. Exception history (immutable approval / status trail)
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS aems_exception_history (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id              uuid NOT NULL,
  exception_id        uuid NOT NULL REFERENCES attendance_exceptions(id) ON DELETE CASCADE,
  action              text NOT NULL,
  prev_status         aems_exception_status,
  new_status          aems_exception_status,
  prev_clock_in       time,
  prev_clock_out      time,
  new_clock_in        time,
  new_clock_out       time,
  comment             text,
  actor_id            uuid,
  actor_label         text,
  created_at          timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_aems_exception_hist
  ON aems_exception_history (exception_id, created_at DESC);

ALTER TABLE aems_exception_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY aems_hist_select ON aems_exception_history FOR SELECT
  USING (is_hr(org_id) OR EXISTS (
    SELECT 1 FROM attendance_exceptions e
    WHERE e.id = exception_id
      AND (e.employee_id = current_employee_id(org_id) OR manages_employee(org_id, e.employee_id))
  ));

CREATE POLICY aems_hist_insert ON aems_exception_history FOR INSERT
  WITH CHECK (current_hr_role(org_id) IS NOT NULL OR current_employee_id(org_id) IS NOT NULL);

-- ---------------------------------------------------------------------
-- 5. Helpers
-- ---------------------------------------------------------------------
CREATE OR REPLACE FUNCTION fn_aems_log_history(
  p_exception_id uuid,
  p_action text,
  p_prev_status aems_exception_status DEFAULT NULL,
  p_new_status aems_exception_status DEFAULT NULL,
  p_prev_in time DEFAULT NULL,
  p_prev_out time DEFAULT NULL,
  p_new_in time DEFAULT NULL,
  p_new_out time DEFAULT NULL,
  p_comment text DEFAULT NULL,
  p_actor_id uuid DEFAULT NULL,
  p_actor_label text DEFAULT NULL
) RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_org uuid;
  v_id uuid;
BEGIN
  SELECT org_id INTO v_org FROM attendance_exceptions WHERE id = p_exception_id;
  INSERT INTO aems_exception_history (
    org_id, exception_id, action, prev_status, new_status,
    prev_clock_in, prev_clock_out, new_clock_in, new_clock_out,
    comment, actor_id, actor_label
  ) VALUES (
    v_org, p_exception_id, p_action, p_prev_status, p_new_status,
    p_prev_in, p_prev_out, p_new_in, p_new_out,
    p_comment, p_actor_id, p_actor_label
  ) RETURNING id INTO v_id;
  RETURN v_id;
END;
$$;

GRANT EXECUTE ON FUNCTION fn_aems_log_history TO authenticated;

CREATE OR REPLACE FUNCTION fn_aems_find_matching_incidents(
  p_org uuid,
  p_branch_id uuid,
  p_at timestamptz DEFAULT now()
) RETURNS SETOF workforce_incidents
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT * FROM workforce_incidents
  WHERE org_id = p_org
    AND status IN ('Open', 'Active')
    AND (branch_id IS NULL OR branch_id = p_branch_id OR p_branch_id IS NULL)
    AND start_at <= p_at
    AND (end_at IS NULL OR end_at >= p_at)
  ORDER BY start_at DESC;
$$;

GRANT EXECUTE ON FUNCTION fn_aems_find_matching_incidents TO authenticated;

CREATE OR REPLACE FUNCTION fn_aems_apply_session_correction(
  p_exception_id uuid,
  p_clock_in time,
  p_clock_out time,
  p_actor_id uuid DEFAULT NULL,
  p_actor_label text DEFAULT NULL
) RETURNS wtm_attendance_sessions
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  ex attendance_exceptions;
  s wtm_attendance_sessions;
  v_shift uuid;
BEGIN
  SELECT * INTO ex FROM attendance_exceptions WHERE id = p_exception_id FOR UPDATE;
  IF ex.id IS NULL THEN RAISE EXCEPTION 'Exception not found'; END IF;

  SELECT * INTO s FROM wtm_attendance_sessions
  WHERE employee_id = ex.employee_id AND work_date = ex.work_date;

  v_shift := fn_employee_shift_at(ex.employee_id, ex.work_date);

  IF s.id IS NULL THEN
    INSERT INTO wtm_attendance_sessions (
      org_id, employee_id, shift_id, work_date,
      clock_in, clock_out, clock_in_at, clock_out_at,
      session_status, attendance_status,
      created_by, created_by_label, modified_by, modified_by_label
    ) VALUES (
      ex.org_id, ex.employee_id, v_shift, ex.work_date,
      p_clock_in, p_clock_out,
      (ex.work_date + p_clock_in)::timestamptz,
      CASE WHEN p_clock_out IS NOT NULL THEN (ex.work_date + p_clock_out)::timestamptz ELSE NULL END,
      CASE WHEN p_clock_out IS NOT NULL THEN 'Completed'::wtm_session_status ELSE 'Working'::wtm_session_status END,
      'Present'::wtm_attendance_status,
      p_actor_id, p_actor_label, p_actor_id, p_actor_label
    ) RETURNING * INTO s;
    UPDATE attendance_exceptions SET session_id = s.id WHERE id = ex.id;
  ELSE
    UPDATE wtm_attendance_sessions SET
      clock_in = COALESCE(p_clock_in, clock_in),
      clock_out = p_clock_out,
      clock_in_at = COALESCE((ex.work_date + p_clock_in)::timestamptz, clock_in_at),
      clock_out_at = CASE WHEN p_clock_out IS NOT NULL THEN (ex.work_date + p_clock_out)::timestamptz ELSE clock_out_at END,
      session_status = CASE WHEN p_clock_out IS NOT NULL THEN 'Completed'::wtm_session_status ELSE session_status END,
      modified_by = p_actor_id,
      modified_by_label = p_actor_label
    WHERE id = s.id RETURNING * INTO s;
  END IF;

  PERFORM fn_wtm_recalc_session_durations(s.id);
  SELECT * INTO s FROM wtm_attendance_sessions WHERE id = s.id;
  PERFORM fn_wtm_sync_attendance_rollup(s.id);

  PERFORM fn_wtm_log_event(
    ex.org_id, ex.employee_id, 'Attendance Corrected', s.id, NULL,
    jsonb_build_object(
      'exception_id', ex.id,
      'clock_in', p_clock_in::text,
      'clock_out', COALESCE(p_clock_out::text, 'null'),
      'work_date', ex.work_date
    ),
    p_actor_id, p_actor_label
  );

  RETURN s;
END;
$$;

GRANT EXECUTE ON FUNCTION fn_aems_apply_session_correction TO authenticated;

-- Submit exception (employee or HR draft)
CREATE OR REPLACE FUNCTION fn_aems_submit_exception(
  p_employee uuid,
  p_work_date date,
  p_exception_type_code text,
  p_description text,
  p_requested_clock_in time DEFAULT NULL,
  p_requested_clock_out time DEFAULT NULL,
  p_incident_id uuid DEFAULT NULL,
  p_submit boolean DEFAULT true,
  p_actor_id uuid DEFAULT NULL,
  p_actor_label text DEFAULT NULL
) RETURNS attendance_exceptions
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  e employees;
  s wtm_attendance_sessions;
  ex attendance_exceptions;
  v_branch uuid;
  v_status aems_exception_status;
BEGIN
  SELECT * INTO e FROM employees WHERE id = p_employee;
  IF e.id IS NULL THEN RAISE EXCEPTION 'Employee not found'; END IF;

  IF e.id <> current_employee_id(e.org_id)
     AND NOT manages_employee(e.org_id, p_employee)
     AND NOT has_perm(e.org_id, 'manage_emp') THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;

  v_branch := e.branch_id;
  SELECT * INTO s FROM wtm_attendance_sessions
  WHERE employee_id = p_employee AND work_date = p_work_date;

  v_status := CASE WHEN p_submit THEN 'Submitted'::aems_exception_status ELSE 'Draft'::aems_exception_status END;

  INSERT INTO attendance_exceptions (
    org_id, employee_id, branch_id, session_id, work_date,
    exception_type_code, requested_clock_in, requested_clock_out,
    description, incident_id, status,
    original_clock_in, original_clock_out,
    submitted_at, created_by, created_by_label, modified_by, modified_by_label
  ) VALUES (
    e.org_id, p_employee, v_branch, s.id, p_work_date,
    p_exception_type_code, p_requested_clock_in, p_requested_clock_out,
    p_description, p_incident_id, v_status,
    s.clock_in, s.clock_out,
    CASE WHEN p_submit THEN now() ELSE NULL END,
    p_actor_id, p_actor_label, p_actor_id, p_actor_label
  ) RETURNING * INTO ex;

  PERFORM fn_aems_log_history(
    ex.id, 'Submitted', NULL, v_status,
    s.clock_in, s.clock_out, p_requested_clock_in, p_requested_clock_out,
    p_description, p_actor_id, p_actor_label
  );

  INSERT INTO audit_log (org_id, actor_id, actor_label, action, target, new_value)
  VALUES (e.org_id, p_actor_id, p_actor_label, 'Attendance Exception Submitted',
    e.full_name || ' · ' || p_work_date::text, p_exception_type_code);

  PERFORM fn_wtm_log_event(
    e.org_id, p_employee, 'Attendance Exception Submitted', s.id, NULL,
    jsonb_build_object('exception_id', ex.id, 'type', p_exception_type_code, 'work_date', p_work_date),
    p_actor_id, p_actor_label
  );

  IF p_incident_id IS NOT NULL THEN
    PERFORM fn_wtm_log_event(
      e.org_id, p_employee, 'Incident Linked', s.id, NULL,
      jsonb_build_object('exception_id', ex.id, 'incident_id', p_incident_id),
      p_actor_id, p_actor_label
    );
  END IF;

  INSERT INTO notification_delivery_log (user_id, category, channel, status, metadata)
  VALUES (p_actor_id, 'hr_aems', 'inapp', 'sent',
    jsonb_build_object('event', 'exception_submitted', 'exception_id', ex.id));

  RETURN ex;
END;
$$;

GRANT EXECUTE ON FUNCTION fn_aems_submit_exception TO authenticated;

-- HR review action
CREATE OR REPLACE FUNCTION fn_aems_hr_action(
  p_exception_id uuid,
  p_action text,
  p_comment text,
  p_modified_clock_in time DEFAULT NULL,
  p_modified_clock_out time DEFAULT NULL,
  p_actor_id uuid DEFAULT NULL,
  p_actor_label text DEFAULT NULL
) RETURNS attendance_exceptions
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  ex attendance_exceptions;
  v_old_status aems_exception_status;
  v_new_status aems_exception_status;
  v_in time;
  v_out time;
BEGIN
  IF p_comment IS NULL OR trim(p_comment) = '' THEN
    RAISE EXCEPTION 'Comment is required for HR actions';
  END IF;

  SELECT * INTO ex FROM attendance_exceptions WHERE id = p_exception_id FOR UPDATE;
  IF ex.id IS NULL THEN RAISE EXCEPTION 'Exception not found'; END IF;
  v_old_status := ex.status;

  IF NOT (has_perm(ex.org_id, 'approve') OR has_perm(ex.org_id, 'manage_emp')) THEN
    RAISE EXCEPTION 'Not authorized to review exceptions';
  END IF;

  IF ex.status NOT IN ('Submitted', 'Under Review', 'Returned for Clarification') THEN
    RAISE EXCEPTION 'Exception is not in a reviewable state';
  END IF;

  IF p_action = 'approve' THEN
    v_new_status := 'Approved';
    v_in := COALESCE(ex.approved_clock_in, ex.requested_clock_in);
    v_out := COALESCE(ex.approved_clock_out, ex.requested_clock_out);
  ELSIF p_action = 'approve_modified' THEN
    v_new_status := 'Approved';
    v_in := COALESCE(p_modified_clock_in, ex.requested_clock_in);
    v_out := COALESCE(p_modified_clock_out, ex.requested_clock_out);
  ELSIF p_action = 'reject' THEN
    v_new_status := 'Rejected';
    v_in := NULL; v_out := NULL;
  ELSIF p_action = 'clarify' THEN
    v_new_status := 'Returned for Clarification';
    v_in := NULL; v_out := NULL;
  ELSIF p_action = 'review' THEN
    v_new_status := 'Under Review';
    v_in := NULL; v_out := NULL;
  ELSE
    RAISE EXCEPTION 'Unknown action %', p_action;
  END IF;

  UPDATE attendance_exceptions SET
    status = v_new_status,
    approved_clock_in = CASE WHEN p_action IN ('approve', 'approve_modified') THEN v_in ELSE approved_clock_in END,
    approved_clock_out = CASE WHEN p_action IN ('approve', 'approve_modified') THEN v_out ELSE approved_clock_out END,
    latest_comment = p_comment,
    resolved_at = CASE WHEN v_new_status IN ('Approved', 'Rejected', 'Closed') THEN now() ELSE resolved_at END,
    resolved_by = CASE WHEN v_new_status IN ('Approved', 'Rejected', 'Closed') THEN p_actor_id ELSE resolved_by END,
    resolved_by_label = CASE WHEN v_new_status IN ('Approved', 'Rejected', 'Closed') THEN p_actor_label ELSE resolved_by_label END,
    modified_by = p_actor_id,
    modified_by_label = p_actor_label
  WHERE id = p_exception_id RETURNING * INTO ex;

  PERFORM fn_aems_log_history(
    ex.id, initcap(p_action), v_old_status, v_new_status,
    ex.original_clock_in, ex.original_clock_out, v_in, v_out,
    p_comment, p_actor_id, p_actor_label
  );

  INSERT INTO audit_log (org_id, actor_id, actor_label, action, target, prev_value, new_value)
  VALUES (ex.org_id, p_actor_id, p_actor_label,
    CASE p_action
      WHEN 'approve' THEN 'Exception Approved'
      WHEN 'approve_modified' THEN 'Exception Approved (Modified Time)'
      WHEN 'reject' THEN 'Exception Rejected'
      WHEN 'clarify' THEN 'Clarification Requested'
      ELSE 'Exception Review'
    END,
    ex.work_date::text || ' · ' || ex.exception_type_code,
    ex.status::text, v_new_status::text);

  IF v_new_status = 'Approved' AND (v_in IS NOT NULL OR v_out IS NOT NULL) THEN
    PERFORM fn_aems_apply_session_correction(p_exception_id, v_in, v_out, p_actor_id, p_actor_label);
    PERFORM fn_wtm_log_event(
      ex.org_id, ex.employee_id, 'Approved', ex.session_id, NULL,
      jsonb_build_object('exception_id', ex.id, 'comment', p_comment),
      p_actor_id, p_actor_label
    );
  ELSIF v_new_status = 'Rejected' THEN
    PERFORM fn_wtm_log_event(
      ex.org_id, ex.employee_id, 'Rejected', ex.session_id, NULL,
      jsonb_build_object('exception_id', ex.id, 'comment', p_comment),
      p_actor_id, p_actor_label
    );
  ELSIF v_new_status = 'Returned for Clarification' THEN
    PERFORM fn_wtm_log_event(
      ex.org_id, ex.employee_id, 'Clarification Requested', ex.session_id, NULL,
      jsonb_build_object('exception_id', ex.id, 'comment', p_comment),
      p_actor_id, p_actor_label
    );
  END IF;

  INSERT INTO notification_delivery_log (user_id, category, channel, status, metadata)
  VALUES (p_actor_id, 'hr_aems', 'inapp', 'sent',
    jsonb_build_object('event', p_action, 'exception_id', ex.id, 'status', v_new_status));

  RETURN ex;
END;
$$;

GRANT EXECUTE ON FUNCTION fn_aems_hr_action TO authenticated;

-- Manual attendance (HR)
CREATE OR REPLACE FUNCTION fn_aems_manual_attendance(
  p_employee uuid,
  p_work_date date,
  p_clock_in time,
  p_clock_out time,
  p_reason text,
  p_comment text,
  p_actor_id uuid DEFAULT NULL,
  p_actor_label text DEFAULT NULL
) RETURNS attendance_exceptions
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  ex attendance_exceptions;
BEGIN
  IF NOT has_perm((SELECT org_id FROM employees WHERE id = p_employee), 'manage_emp') THEN
    RAISE EXCEPTION 'Manage employee permission required';
  END IF;
  IF trim(p_comment) = '' OR trim(p_reason) = '' THEN
    RAISE EXCEPTION 'Reason and comments are required';
  END IF;

  ex := fn_aems_submit_exception(
    p_employee, p_work_date, 'manual_attendance_request', p_reason,
    p_clock_in, p_clock_out, NULL, false, p_actor_id, p_actor_label
  );

  UPDATE attendance_exceptions SET is_manual = true WHERE id = ex.id;

  ex := fn_aems_hr_action(
    ex.id, 'approve_modified', p_comment, p_clock_in, p_clock_out, p_actor_id, p_actor_label
  );

  RETURN ex;
END;
$$;

GRANT EXECUTE ON FUNCTION fn_aems_manual_attendance TO authenticated;

-- Bulk approve/reject
CREATE OR REPLACE FUNCTION fn_aems_bulk_process(
  p_exception_ids uuid[],
  p_action text,
  p_comment text,
  p_actor_id uuid DEFAULT NULL,
  p_actor_label text DEFAULT NULL
) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_id uuid;
  v_count int := 0;
BEGIN
  IF trim(p_comment) = '' THEN RAISE EXCEPTION 'Comment required for bulk actions'; END IF;

  FOREACH v_id IN ARRAY COALESCE(p_exception_ids, ARRAY[]::uuid[]) LOOP
    PERFORM fn_aems_hr_action(v_id, p_action, p_comment, NULL, NULL, p_actor_id, p_actor_label);
    v_count := v_count + 1;
  END LOOP;

  INSERT INTO audit_log (org_id, actor_id, actor_label, action, target, new_value)
  SELECT e.org_id, p_actor_id, p_actor_label, 'Bulk Exception ' || initcap(p_action),
    'bulk', v_count::text
  FROM employees e WHERE e.id = current_employee_id(e.org_id) LIMIT 1;

  RETURN jsonb_build_object('count', v_count, 'action', p_action);
END;
$$;

GRANT EXECUTE ON FUNCTION fn_aems_bulk_process TO authenticated;

-- Register evidence metadata (after client upload to hr-docs)
CREATE OR REPLACE FUNCTION fn_aems_register_evidence(
  p_exception_id uuid,
  p_file_name text,
  p_storage_path text,
  p_mime text DEFAULT NULL,
  p_file_size int DEFAULT NULL,
  p_notes text DEFAULT NULL,
  p_actor_id uuid DEFAULT NULL,
  p_actor_label text DEFAULT NULL
) RETURNS aems_exception_evidence
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  ex attendance_exceptions;
  ev aems_exception_evidence;
BEGIN
  SELECT * INTO ex FROM attendance_exceptions WHERE id = p_exception_id;
  IF ex.id IS NULL THEN RAISE EXCEPTION 'Exception not found'; END IF;

  INSERT INTO aems_exception_evidence (
    org_id, exception_id, employee_id, file_name, storage_path,
    mime, file_size_bytes, notes, uploaded_by, uploaded_by_label
  ) VALUES (
    ex.org_id, ex.id, ex.employee_id, p_file_name, p_storage_path,
    p_mime, p_file_size, p_notes, p_actor_id, p_actor_label
  ) RETURNING * INTO ev;

  PERFORM fn_wtm_log_event(
    ex.org_id, ex.employee_id, 'Evidence Uploaded', ex.session_id, NULL,
    jsonb_build_object('exception_id', ex.id, 'file', p_file_name),
    p_actor_id, p_actor_label
  );

  INSERT INTO notification_delivery_log (user_id, category, channel, status, metadata)
  VALUES (p_actor_id, 'hr_aems', 'inapp', 'sent',
    jsonb_build_object('event', 'evidence_uploaded', 'exception_id', ex.id));

  RETURN ev;
END;
$$;

GRANT EXECUTE ON FUNCTION fn_aems_register_evidence TO authenticated;

-- ---------------------------------------------------------------------
-- 6. Seed master data + demo incidents
-- ---------------------------------------------------------------------
DO $$
DECLARE
  v_org uuid := '00000000-0000-0000-0000-0000000000f1';
BEGIN
  INSERT INTO hr_masters (org_id, domain, code, label, display_order, config) VALUES
    (v_org, 'attendance_exception_type', 'internet_down', 'Internet Down', 10, '{}'),
    (v_org, 'attendance_exception_type', 'power_failure', 'Power Failure', 20, '{}'),
    (v_org, 'attendance_exception_type', 'office_system_down', 'Office System Down', 30, '{}'),
    (v_org, 'attendance_exception_type', 'forgot_clock_in', 'Forgot Clock In', 40, '{}'),
    (v_org, 'attendance_exception_type', 'forgot_clock_out', 'Forgot Clock Out', 50, '{}'),
    (v_org, 'attendance_exception_type', 'late_system_login', 'Late System Login', 60, '{}'),
    (v_org, 'attendance_exception_type', 'manual_attendance_request', 'Manual Attendance Request', 70, '{}'),
    (v_org, 'attendance_exception_type', 'browser_issue', 'Browser Issue', 80, '{}'),
    (v_org, 'attendance_exception_type', 'device_issue', 'Device Issue', 90, '{}'),
    (v_org, 'attendance_exception_type', 'other', 'Other', 100, '{}'),
    (v_org, 'workforce_incident_type', 'internet_down', 'Internet Down', 10, '{}'),
    (v_org, 'workforce_incident_type', 'power_failure', 'Power Failure', 20, '{}'),
    (v_org, 'workforce_incident_type', 'server_down', 'Server Down', 30, '{}'),
    (v_org, 'workforce_incident_type', 'office_closed', 'Office Closed', 40, '{}'),
    (v_org, 'workforce_incident_type', 'building_maintenance', 'Building Maintenance', 50, '{}'),
    (v_org, 'workforce_incident_type', 'network_failure', 'Network Failure', 60, '{}'),
    (v_org, 'workforce_incident_type', 'other', 'Other', 100, '{}')
  ON CONFLICT (org_id, domain, code) DO NOTHING;
END $$;

-- RBAC screens
UPDATE role_permissions
SET screens = screens || '{"attendanceExceptions":true,"incidentRegister":true}'::jsonb
WHERE org_id = '00000000-0000-0000-0000-0000000000f1'
  AND role IN ('Super Admin', 'Admin', 'HR Manager', 'HR Executive');

UPDATE role_permissions
SET screens = screens || '{"attendanceExceptions":true,"incidentRegister":false}'::jsonb
WHERE org_id = '00000000-0000-0000-0000-0000000000f1'
  AND role = 'Manager';

UPDATE role_permissions
SET screens = screens || '{"attendanceExceptions":true,"incidentRegister":false}'::jsonb
WHERE org_id = '00000000-0000-0000-0000-0000000000f1'
  AND role = 'Employee';
