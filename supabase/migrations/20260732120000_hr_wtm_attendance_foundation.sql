-- =====================================================================
-- WTM Pack 2.1 — Attendance Foundation (session model + multi-break)
-- Extends existing attendance rollup — does NOT modify fn_compute_payroll.
-- =====================================================================

DO $$ BEGIN
  CREATE TYPE wtm_session_status AS ENUM (
    'Pending', 'Working', 'On Break', 'Completed', 'Locked'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE wtm_attendance_status AS ENUM (
    'Present', 'Half Day', 'Absent', 'Holiday', 'Weekly Off'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- ---------------------------------------------------------------------
-- 1. Attendance sessions (one per employee per work_date)
-- ---------------------------------------------------------------------
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

CREATE INDEX IF NOT EXISTS idx_wtm_sessions_org_date
  ON wtm_attendance_sessions (org_id, work_date, session_status);

CREATE INDEX IF NOT EXISTS idx_wtm_sessions_emp_date
  ON wtm_attendance_sessions (employee_id, work_date DESC);

ALTER TABLE wtm_attendance_sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY wtm_sessions_select ON wtm_attendance_sessions FOR SELECT
  USING (
    is_hr(org_id)
    OR manages_employee(org_id, employee_id)
    OR employee_id = current_employee_id(org_id)
  );

CREATE POLICY wtm_sessions_write ON wtm_attendance_sessions FOR ALL
  USING (
    employee_id = current_employee_id(org_id)
    OR manages_employee(org_id, employee_id)
    OR has_perm(org_id, 'manage_emp')
  )
  WITH CHECK (
    employee_id = current_employee_id(org_id)
    OR manages_employee(org_id, employee_id)
    OR has_perm(org_id, 'manage_emp')
  );

DROP TRIGGER IF EXISTS trg_wtm_sessions_updated ON wtm_attendance_sessions;
CREATE TRIGGER trg_wtm_sessions_updated
  BEFORE UPDATE ON wtm_attendance_sessions
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ---------------------------------------------------------------------
-- 2. Multiple break records per session
-- ---------------------------------------------------------------------
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

CREATE INDEX IF NOT EXISTS idx_wtm_breaks_session
  ON wtm_attendance_breaks (session_id, sequence_no);

ALTER TABLE wtm_attendance_breaks ENABLE ROW LEVEL SECURITY;

CREATE POLICY wtm_breaks_select ON wtm_attendance_breaks FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM wtm_attendance_sessions s
      WHERE s.id = session_id
        AND (is_hr(org_id) OR manages_employee(org_id, s.employee_id)
             OR s.employee_id = current_employee_id(org_id))
    )
  );

CREATE POLICY wtm_breaks_write ON wtm_attendance_breaks FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM wtm_attendance_sessions s
      WHERE s.id = session_id
        AND (s.employee_id = current_employee_id(org_id)
             OR manages_employee(org_id, s.employee_id)
             OR has_perm(org_id, 'manage_emp'))
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM wtm_attendance_sessions s
      WHERE s.id = session_id
        AND (s.employee_id = current_employee_id(org_id)
             OR manages_employee(org_id, s.employee_id)
             OR has_perm(org_id, 'manage_emp'))
    )
  );

-- ---------------------------------------------------------------------
-- 3. Workforce timeline events
-- ---------------------------------------------------------------------
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

CREATE INDEX IF NOT EXISTS idx_workforce_timeline_emp
  ON workforce_timeline_events (org_id, employee_id, created_at DESC);

ALTER TABLE workforce_timeline_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY wtm_timeline_select ON workforce_timeline_events FOR SELECT
  USING (is_hr(org_id) OR employee_id = current_employee_id(org_id));

CREATE POLICY wtm_timeline_insert ON workforce_timeline_events FOR INSERT
  WITH CHECK (current_hr_role(org_id) IS NOT NULL OR employee_id = current_employee_id(org_id));

-- ---------------------------------------------------------------------
-- 4. Helpers — log event + audit + notification
-- ---------------------------------------------------------------------
CREATE OR REPLACE FUNCTION fn_wtm_log_event(
  p_org uuid,
  p_employee_id uuid,
  p_event_type text,
  p_session_id uuid DEFAULT NULL,
  p_break_id uuid DEFAULT NULL,
  p_payload jsonb DEFAULT '{}'::jsonb,
  p_actor_id uuid DEFAULT NULL,
  p_actor_label text DEFAULT NULL
) RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_id uuid;
  v_label text;
  v_emp_name text;
BEGIN
  v_label := COALESCE(p_actor_label, 'HR User');
  SELECT full_name INTO v_emp_name FROM employees WHERE id = p_employee_id;

  INSERT INTO workforce_timeline_events (
    org_id, employee_id, event_type, session_id, break_id, payload, actor_id, actor_label
  ) VALUES (
    p_org, p_employee_id, p_event_type, p_session_id, p_break_id,
    COALESCE(p_payload, '{}'::jsonb), p_actor_id, v_label
  ) RETURNING id INTO v_id;

  INSERT INTO audit_log (org_id, actor_id, actor_label, action, target, prev_value, new_value)
  VALUES (
    p_org, p_actor_id, v_label, p_event_type,
    COALESCE(v_emp_name, p_employee_id::text) || ' · ' || COALESCE(p_payload->>'work_date', ''),
    COALESCE(p_payload->>'prev', '—'),
    COALESCE(p_payload->>'new', '—')
  );

  INSERT INTO notification_delivery_log (user_id, category, channel, status, metadata)
  VALUES (
    p_actor_id, 'hr_wtm', 'inapp', 'sent',
    jsonb_build_object(
      'event_type', p_event_type,
      'employee_id', p_employee_id,
      'session_id', p_session_id,
      'timeline_event_id', v_id
    )
  );

  RETURN v_id;
END;
$$;

GRANT EXECUTE ON FUNCTION fn_wtm_log_event TO authenticated;

-- Sync session → legacy attendance rollup row (backward compat)
CREATE OR REPLACE FUNCTION fn_wtm_sync_attendance_rollup(p_session_id uuid)
RETURNS attendance
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  s wtm_attendance_sessions;
  row attendance;
  v_first_break_out time;
  v_first_break_in time;
  v_total_break int;
BEGIN
  SELECT * INTO s FROM wtm_attendance_sessions WHERE id = p_session_id;
  IF s.id IS NULL THEN RAISE EXCEPTION 'Session not found'; END IF;

  SELECT COALESCE(SUM(break_duration_min), 0) INTO v_total_break
  FROM wtm_attendance_breaks WHERE session_id = s.id AND break_in IS NOT NULL;

  SELECT break_out, break_in INTO v_first_break_out, v_first_break_in
  FROM wtm_attendance_breaks
  WHERE session_id = s.id
  ORDER BY sequence_no
  LIMIT 1;

  INSERT INTO attendance (org_id, employee_id, work_date, check_in, check_out,
    break_start, break_end, break_min, status, is_mispunch, source)
  VALUES (
    s.org_id, s.employee_id, s.work_date, s.clock_in, s.clock_out,
    v_first_break_out, v_first_break_in, v_total_break,
    CASE s.attendance_status::text
      WHEN 'Weekly Off' THEN 'Week Off'::att_status
      WHEN 'Holiday' THEN 'Holiday'::att_status
      WHEN 'Half Day' THEN 'Half Day'::att_status
      WHEN 'Absent' THEN 'Absent'::att_status
      ELSE 'Present'::att_status
    END,
    false, 'self'
  )
  ON CONFLICT (employee_id, work_date) DO UPDATE SET
    check_in = EXCLUDED.check_in,
    check_out = EXCLUDED.check_out,
    break_start = EXCLUDED.break_start,
    break_end = EXCLUDED.break_end,
    break_min = EXCLUDED.break_min,
    status = CASE
      WHEN attendance.status IN ('Week Off', 'Holiday', 'Leave', 'Sick Leave') THEN attendance.status
      ELSE EXCLUDED.status
    END,
    source = 'self'
  RETURNING * INTO row;

  UPDATE wtm_attendance_sessions SET attendance_id = row.id WHERE id = s.id;

  RETURN row;
END;
$$;

GRANT EXECUTE ON FUNCTION fn_wtm_sync_attendance_rollup TO authenticated;

CREATE OR REPLACE FUNCTION fn_wtm_recalc_session_durations(p_session_id uuid)
RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  s wtm_attendance_sessions;
  v_break_total int := 0;
  v_gross int := 0;
BEGIN
  SELECT COALESCE(SUM(break_duration_min), 0) INTO v_break_total
  FROM wtm_attendance_breaks WHERE session_id = p_session_id AND break_in IS NOT NULL;

  SELECT * INTO s FROM wtm_attendance_sessions WHERE id = p_session_id;

  IF s.clock_in_at IS NOT NULL AND s.clock_out_at IS NOT NULL THEN
    v_gross := GREATEST(0, FLOOR(EXTRACT(EPOCH FROM (s.clock_out_at - s.clock_in_at)) / 60)::int);
  END IF;

  UPDATE wtm_attendance_sessions SET
    break_duration_min = v_break_total,
    working_duration_min = GREATEST(0, v_gross - v_break_total)
  WHERE id = p_session_id;
END;
$$;

GRANT EXECUTE ON FUNCTION fn_wtm_recalc_session_durations TO authenticated;

-- ---------------------------------------------------------------------
-- 5. Clock In
-- ---------------------------------------------------------------------
CREATE OR REPLACE FUNCTION fn_wtm_clock_in(
  p_employee uuid,
  p_work_date date DEFAULT NULL,
  p_time time DEFAULT NULL,
  p_meta jsonb DEFAULT '{}'::jsonb,
  p_actor_id uuid DEFAULT NULL,
  p_actor_label text DEFAULT NULL
) RETURNS wtm_attendance_sessions
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  e employees;
  v_date date := COALESCE(p_work_date, current_date);
  v_time time := COALESCE(p_time, current_time);
  v_shift uuid;
  s wtm_attendance_sessions;
  v_now timestamptz := now();
BEGIN
  SELECT * INTO e FROM employees WHERE id = p_employee;
  IF e.id IS NULL THEN RAISE EXCEPTION 'Employee not found'; END IF;

  IF e.id <> current_employee_id(e.org_id)
     AND NOT manages_employee(e.org_id, p_employee)
     AND NOT has_perm(e.org_id, 'manage_emp') THEN
    RAISE EXCEPTION 'Not authorized to clock in for this employee';
  END IF;

  SELECT * INTO s FROM wtm_attendance_sessions
  WHERE employee_id = p_employee AND work_date = v_date;

  IF s.id IS NOT NULL AND s.clock_in IS NOT NULL AND s.session_status <> 'Completed' THEN
    RAISE EXCEPTION 'Already clocked in for this date — clock out first';
  END IF;

  IF s.id IS NOT NULL AND s.session_status = 'Completed' THEN
    RAISE EXCEPTION 'Session already completed for this date';
  END IF;

  v_shift := fn_employee_shift_at(p_employee, v_date);

  IF s.id IS NULL THEN
    INSERT INTO wtm_attendance_sessions (
      org_id, employee_id, shift_id, work_date,
      clock_in, clock_in_at, session_status, attendance_status,
      device_info, created_by, created_by_label, modified_by, modified_by_label
    ) VALUES (
      e.org_id, p_employee, v_shift, v_date,
      v_time, v_now, 'Working', 'Present',
      COALESCE(p_meta, '{}'::jsonb), p_actor_id, p_actor_label, p_actor_id, p_actor_label
    ) RETURNING * INTO s;
  ELSE
    UPDATE wtm_attendance_sessions SET
      shift_id = v_shift,
      clock_in = v_time,
      clock_in_at = v_now,
      clock_out = NULL,
      clock_out_at = NULL,
      working_duration_min = 0,
      break_duration_min = 0,
      session_status = 'Working',
      attendance_status = 'Present',
      device_info = COALESCE(p_meta, '{}'::jsonb),
      modified_by = p_actor_id,
      modified_by_label = p_actor_label
    WHERE id = s.id RETURNING * INTO s;
  END IF;

  PERFORM fn_wtm_sync_attendance_rollup(s.id);

  PERFORM fn_wtm_log_event(
    e.org_id, p_employee, 'AttendanceSessionStarted', s.id, NULL,
    jsonb_build_object('work_date', v_date, 'new', v_time::text, 'shift_id', v_shift),
    p_actor_id, p_actor_label
  );

  PERFORM fn_wtm_log_event(
    e.org_id, p_employee, 'Clock In', s.id, NULL,
    jsonb_build_object('work_date', v_date, 'new', v_time::text),
    p_actor_id, p_actor_label
  );

  RETURN s;
END;
$$;

GRANT EXECUTE ON FUNCTION fn_wtm_clock_in TO authenticated;

-- ---------------------------------------------------------------------
-- 6. Clock Out
-- ---------------------------------------------------------------------
CREATE OR REPLACE FUNCTION fn_wtm_clock_out(
  p_session uuid,
  p_time time DEFAULT NULL,
  p_meta jsonb DEFAULT '{}'::jsonb,
  p_actor_id uuid DEFAULT NULL,
  p_actor_label text DEFAULT NULL
) RETURNS wtm_attendance_sessions
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  s wtm_attendance_sessions;
  v_time time := COALESCE(p_time, current_time);
  v_now timestamptz := now();
  v_open_break int;
BEGIN
  SELECT * INTO s FROM wtm_attendance_sessions WHERE id = p_session FOR UPDATE;
  IF s.id IS NULL THEN RAISE EXCEPTION 'Session not found'; END IF;

  IF s.employee_id <> current_employee_id(s.org_id)
     AND NOT manages_employee(s.org_id, s.employee_id)
     AND NOT has_perm(s.org_id, 'manage_emp') THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;

  IF s.clock_in IS NULL THEN
    RAISE EXCEPTION 'Clock in before clock out';
  END IF;

  IF s.clock_out IS NOT NULL OR s.session_status = 'Completed' THEN
    RAISE EXCEPTION 'Already clocked out';
  END IF;

  SELECT COUNT(*) INTO v_open_break
  FROM wtm_attendance_breaks WHERE session_id = s.id AND break_in IS NULL;

  IF v_open_break > 0 THEN
    RAISE EXCEPTION 'End break before clocking out';
  END IF;

  UPDATE wtm_attendance_sessions SET
    clock_out = v_time,
    clock_out_at = v_now,
    session_status = 'Completed',
    device_info = device_info || COALESCE(p_meta, '{}'::jsonb),
    modified_by = p_actor_id,
    modified_by_label = p_actor_label
  WHERE id = s.id RETURNING * INTO s;

  PERFORM fn_wtm_recalc_session_durations(s.id);
  SELECT * INTO s FROM wtm_attendance_sessions WHERE id = s.id;
  PERFORM fn_wtm_sync_attendance_rollup(s.id);

  PERFORM fn_wtm_log_event(
    s.org_id, s.employee_id, 'AttendanceSessionCompleted', s.id, NULL,
    jsonb_build_object(
      'work_date', s.work_date,
      'new', v_time::text,
      'working_min', s.working_duration_min
    ),
    p_actor_id, p_actor_label
  );

  PERFORM fn_wtm_log_event(
    s.org_id, s.employee_id, 'Clock Out', s.id, NULL,
    jsonb_build_object('work_date', s.work_date, 'new', v_time::text),
    p_actor_id, p_actor_label
  );

  RETURN s;
END;
$$;

GRANT EXECUTE ON FUNCTION fn_wtm_clock_out TO authenticated;

-- ---------------------------------------------------------------------
-- 7. Break Out / Break In
-- ---------------------------------------------------------------------
CREATE OR REPLACE FUNCTION fn_wtm_break_out(
  p_session uuid,
  p_time time DEFAULT NULL,
  p_actor_id uuid DEFAULT NULL,
  p_actor_label text DEFAULT NULL
) RETURNS wtm_attendance_breaks
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  s wtm_attendance_sessions;
  b wtm_attendance_breaks;
  v_time time := COALESCE(p_time, current_time);
  v_now timestamptz := now();
  v_seq int;
  v_open int;
BEGIN
  SELECT * INTO s FROM wtm_attendance_sessions WHERE id = p_session FOR UPDATE;
  IF s.id IS NULL THEN RAISE EXCEPTION 'Session not found'; END IF;

  IF s.employee_id <> current_employee_id(s.org_id)
     AND NOT manages_employee(s.org_id, s.employee_id)
     AND NOT has_perm(s.org_id, 'manage_emp') THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;

  IF s.clock_in IS NULL OR s.session_status NOT IN ('Working', 'On Break') THEN
    RAISE EXCEPTION 'Clock in before taking a break';
  END IF;

  IF s.session_status = 'Completed' THEN
    RAISE EXCEPTION 'Session already completed';
  END IF;

  SELECT COUNT(*) INTO v_open FROM wtm_attendance_breaks
  WHERE session_id = s.id AND break_in IS NULL;

  IF v_open > 0 THEN
    RAISE EXCEPTION 'Already on break — break in first';
  END IF;

  SELECT COALESCE(MAX(sequence_no), 0) + 1 INTO v_seq
  FROM wtm_attendance_breaks WHERE session_id = s.id;

  INSERT INTO wtm_attendance_breaks (
    org_id, session_id, break_out, break_out_at, sequence_no
  ) VALUES (
    s.org_id, s.id, v_time, v_now, v_seq
  ) RETURNING * INTO b;

  UPDATE wtm_attendance_sessions SET
    session_status = 'On Break',
    modified_by = p_actor_id,
    modified_by_label = p_actor_label
  WHERE id = s.id;

  PERFORM fn_wtm_log_event(
    s.org_id, s.employee_id, 'BreakStarted', s.id, b.id,
    jsonb_build_object('work_date', s.work_date, 'new', v_time::text, 'sequence', v_seq),
    p_actor_id, p_actor_label
  );

  PERFORM fn_wtm_log_event(
    s.org_id, s.employee_id, 'Break Out', s.id, b.id,
    jsonb_build_object('work_date', s.work_date, 'new', v_time::text),
    p_actor_id, p_actor_label
  );

  RETURN b;
END;
$$;

GRANT EXECUTE ON FUNCTION fn_wtm_break_out TO authenticated;

CREATE OR REPLACE FUNCTION fn_wtm_break_in(
  p_session uuid,
  p_time time DEFAULT NULL,
  p_actor_id uuid DEFAULT NULL,
  p_actor_label text DEFAULT NULL
) RETURNS wtm_attendance_breaks
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  s wtm_attendance_sessions;
  b wtm_attendance_breaks;
  v_time time := COALESCE(p_time, current_time);
  v_now timestamptz := now();
  v_dur int;
BEGIN
  SELECT * INTO s FROM wtm_attendance_sessions WHERE id = p_session FOR UPDATE;
  IF s.id IS NULL THEN RAISE EXCEPTION 'Session not found'; END IF;

  IF s.employee_id <> current_employee_id(s.org_id)
     AND NOT manages_employee(s.org_id, s.employee_id)
     AND NOT has_perm(s.org_id, 'manage_emp') THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;

  SELECT * INTO b FROM wtm_attendance_breaks
  WHERE session_id = s.id AND break_in IS NULL
  ORDER BY sequence_no DESC
  LIMIT 1 FOR UPDATE;

  IF b.id IS NULL THEN
    RAISE EXCEPTION 'No open break — break out first';
  END IF;

  v_dur := GREATEST(0, FLOOR(EXTRACT(EPOCH FROM (v_now - b.break_out_at)) / 60)::int);

  UPDATE wtm_attendance_breaks SET
    break_in = v_time,
    break_in_at = v_now,
    break_duration_min = v_dur
  WHERE id = b.id RETURNING * INTO b;

  UPDATE wtm_attendance_sessions SET
    session_status = 'Working',
    modified_by = p_actor_id,
    modified_by_label = p_actor_label
  WHERE id = s.id;

  PERFORM fn_wtm_recalc_session_durations(s.id);
  PERFORM fn_wtm_sync_attendance_rollup(s.id);

  PERFORM fn_wtm_log_event(
    s.org_id, s.employee_id, 'BreakEnded', s.id, b.id,
    jsonb_build_object('work_date', s.work_date, 'new', v_time::text, 'duration_min', v_dur),
    p_actor_id, p_actor_label
  );

  PERFORM fn_wtm_log_event(
    s.org_id, s.employee_id, 'Break In', s.id, b.id,
    jsonb_build_object('work_date', s.work_date, 'new', v_time::text),
    p_actor_id, p_actor_label
  );

  RETURN b;
END;
$$;

GRANT EXECUTE ON FUNCTION fn_wtm_break_in TO authenticated;

-- ---------------------------------------------------------------------
-- 8. Query helpers
-- ---------------------------------------------------------------------
CREATE OR REPLACE FUNCTION fn_wtm_get_session(
  p_employee uuid,
  p_work_date date DEFAULT NULL
) RETURNS wtm_attendance_sessions
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  e employees;
  v_date date := COALESCE(p_work_date, current_date);
  s wtm_attendance_sessions;
BEGIN
  SELECT * INTO e FROM employees WHERE id = p_employee;
  IF e.id IS NULL THEN RAISE EXCEPTION 'Employee not found'; END IF;

  IF e.id <> current_employee_id(e.org_id)
     AND NOT manages_employee(e.org_id, p_employee)
     AND NOT has_perm(e.org_id, 'manage_emp')
     AND NOT is_hr(e.org_id) THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;

  SELECT * INTO s FROM wtm_attendance_sessions
  WHERE employee_id = p_employee AND work_date = v_date;

  RETURN s;
END;
$$;

GRANT EXECUTE ON FUNCTION fn_wtm_get_session TO authenticated;
