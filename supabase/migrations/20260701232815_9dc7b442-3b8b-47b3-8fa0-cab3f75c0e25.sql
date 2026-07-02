-- =====================================================================
-- HR Training completion workflow + extension audit
-- Does not modify payroll rollup / fn_compute_payroll maths.
-- =====================================================================

ALTER TYPE training_status ADD VALUE IF NOT EXISTS 'Pending Manager Approval';
ALTER TYPE training_status ADD VALUE IF NOT EXISTS 'Pending HR Approval';
ALTER TYPE training_status ADD VALUE IF NOT EXISTS 'Rejected';

ALTER TABLE training_records
  ADD COLUMN IF NOT EXISTS training_ref text,
  ADD COLUMN IF NOT EXISTS end_date date,
  ADD COLUMN IF NOT EXISTS original_end_date date,
  ADD COLUMN IF NOT EXISTS extended_end_date date,
  ADD COLUMN IF NOT EXISTS extension_reason text,
  ADD COLUMN IF NOT EXISTS extended_by_id uuid,
  ADD COLUMN IF NOT EXISTS extended_by_label text,
  ADD COLUMN IF NOT EXISTS extended_at timestamptz,
  ADD COLUMN IF NOT EXISTS completion_reason text,
  ADD COLUMN IF NOT EXISTS completion_date date,
  ADD COLUMN IF NOT EXISTS completion_requested_by_id uuid,
  ADD COLUMN IF NOT EXISTS completion_requested_by_label text,
  ADD COLUMN IF NOT EXISTS completion_requested_at timestamptz,
  ADD COLUMN IF NOT EXISTS manager_approved_by_label text,
  ADD COLUMN IF NOT EXISTS manager_approved_at timestamptz,
  ADD COLUMN IF NOT EXISTS hr_approved_by_label text,
  ADD COLUMN IF NOT EXISTS hr_approved_at timestamptz,
  ADD COLUMN IF NOT EXISTS created_by_id uuid,
  ADD COLUMN IF NOT EXISTS created_by_label text;

CREATE TABLE IF NOT EXISTS training_extension_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid NOT NULL,
  training_id uuid NOT NULL REFERENCES training_records(id) ON DELETE CASCADE,
  original_end_date date,
  extended_end_date date NOT NULL,
  extension_reason text NOT NULL,
  extended_by_id uuid,
  extended_by_label text,
  extended_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.training_extension_history TO authenticated;
GRANT ALL ON public.training_extension_history TO service_role;

CREATE INDEX IF NOT EXISTS idx_training_extension_history_training
  ON training_extension_history (training_id, extended_at DESC);

ALTER TABLE training_extension_history ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS train_ext_hist_select ON training_extension_history;
CREATE POLICY train_ext_hist_select ON training_extension_history FOR SELECT USING (
  is_hr(org_id)
  OR EXISTS (
    SELECT 1 FROM training_records tr
    WHERE tr.id = training_extension_history.training_id
      AND (
        manages_employee(tr.org_id, tr.employee_id)
        OR tr.employee_id = current_employee_id(tr.org_id)
      )
  )
);
DROP POLICY IF EXISTS train_ext_hist_write ON training_extension_history;
CREATE POLICY train_ext_hist_write ON training_extension_history FOR ALL USING (
  has_perm(org_id, 'approve')
) WITH CHECK (has_perm(org_id, 'approve'));

CREATE OR REPLACE FUNCTION trg_training_unpaid_cap()
RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE
  v_total int;
BEGIN
  SELECT COALESCE(SUM(unpaid_days), 0) INTO v_total
  FROM training_records
  WHERE employee_id = NEW.employee_id
    AND status NOT IN ('Cancelled', 'Rejected')
    AND id <> COALESCE(NEW.id, '00000000-0000-0000-0000-000000000000'::uuid);

  IF v_total + COALESCE(NEW.unpaid_days, 0) > 7 THEN
    RAISE EXCEPTION 'Maximum 7 unpaid training days allowed per employee';
  END IF;
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION fn_extend_training(
  p_training_id uuid,
  p_extended_until date,
  p_reason text
) RETURNS training_records LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  r training_records;
  v_actor uuid;
  v_label text;
  v_prev_end date;
BEGIN
  IF trim(COALESCE(p_reason, '')) = '' THEN
    RAISE EXCEPTION 'Extension reason is required';
  END IF;
  IF p_extended_until IS NULL THEN
    RAISE EXCEPTION 'Extended until date is required';
  END IF;

  SELECT * INTO r FROM training_records WHERE id = p_training_id FOR UPDATE;
  IF r.id IS NULL THEN RAISE EXCEPTION 'Training record not found'; END IF;
  IF NOT has_perm(r.org_id, 'approve') THEN RAISE EXCEPTION 'Not authorized'; END IF;
  IF r.status IN ('Completed', 'Cancelled', 'Rejected', 'Pending Manager Approval', 'Pending HR Approval') THEN
    RAISE EXCEPTION 'Cannot extend training in status %', r.status;
  END IF;

  v_actor := current_employee_id(r.org_id);
  SELECT COALESCE(p.full_name, p.email, 'HR User') INTO v_label
  FROM profiles p WHERE p.id = auth.uid();

  v_prev_end := COALESCE(r.extended_end_date, r.end_date, r.start_date);
  IF v_prev_end IS NOT NULL AND p_extended_until < v_prev_end THEN
    RAISE EXCEPTION 'Extended until date must be on or after current end date';
  END IF;

  UPDATE training_records
  SET
    original_end_date = COALESCE(original_end_date, end_date),
    extended_end_date = p_extended_until,
    extension_reason = trim(p_reason),
    extended_by_id = v_actor,
    extended_by_label = v_label,
    extended_at = now(),
    status = 'Extended'
  WHERE id = p_training_id
  RETURNING * INTO r;

  INSERT INTO training_extension_history (
    org_id, training_id, original_end_date, extended_end_date,
    extension_reason, extended_by_id, extended_by_label
  ) VALUES (
    r.org_id, r.id, COALESCE(r.original_end_date, r.end_date),
    p_extended_until, trim(p_reason), v_actor, v_label
  );

  RETURN r;
END;
$$;

CREATE OR REPLACE FUNCTION fn_finalize_training_on_approve(p_training_id uuid)
RETURNS training_records LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  r training_records;
  v_label text;
BEGIN
  SELECT * INTO r FROM training_records WHERE id = p_training_id FOR UPDATE;
  IF r.id IS NULL THEN RAISE EXCEPTION 'Training record not found'; END IF;

  SELECT COALESCE(p.full_name, p.email, 'HR User') INTO v_label
  FROM profiles p WHERE p.id = auth.uid();

  UPDATE training_records
  SET
    status = 'Completed',
    hr_approved_by_label = v_label,
    hr_approved_at = now()
  WHERE id = p_training_id
  RETURNING * INTO r;

  RETURN r;
END;
$$;

CREATE OR REPLACE FUNCTION fn_request_training_completion(
  p_training_id uuid,
  p_completion_date date,
  p_reason text
) RETURNS training_records LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  r training_records;
  v_actor uuid;
  v_label text;
  v_mgr_pending int;
BEGIN
  IF trim(COALESCE(p_reason, '')) = '' THEN
    RAISE EXCEPTION 'Completion reason is required';
  END IF;
  IF p_completion_date IS NULL THEN
    RAISE EXCEPTION 'Completion date is required';
  END IF;

  SELECT * INTO r FROM training_records WHERE id = p_training_id FOR UPDATE;
  IF r.id IS NULL THEN RAISE EXCEPTION 'Training record not found'; END IF;
  IF NOT has_perm(r.org_id, 'approve') THEN RAISE EXCEPTION 'Not authorized'; END IF;
  IF r.status IN ('Completed', 'Cancelled', 'Rejected', 'Pending Manager Approval', 'Pending HR Approval') THEN
    RAISE EXCEPTION 'Cannot request completion for status %', r.status;
  END IF;

  v_actor := current_employee_id(r.org_id);
  SELECT COALESCE(p.full_name, p.email, 'HR User') INTO v_label
  FROM profiles p WHERE p.id = auth.uid();

  UPDATE training_records
  SET
    status = 'Pending Manager Approval',
    completion_reason = trim(p_reason),
    completion_date = p_completion_date,
    completion_requested_by_id = v_actor,
    completion_requested_by_label = v_label,
    completion_requested_at = now()
  WHERE id = p_training_id
  RETURNING * INTO r;

  DELETE FROM approvals WHERE entity_type = 'training' AND entity_id = r.id;
  PERFORM fn_init_entity_approvals(r.org_id, 'training', r.id, r.employee_id);

  SELECT COUNT(*) INTO v_mgr_pending
  FROM approvals
  WHERE entity_type = 'training'
    AND entity_id = r.id
    AND stage = 'Manager'
    AND decision = 'Pending';

  IF v_mgr_pending = 0 THEN
    UPDATE training_records SET status = 'Pending HR Approval' WHERE id = r.id;
    SELECT * INTO r FROM training_records WHERE id = p_training_id;
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
  v_label text;
  v_can_decide boolean;
BEGIN
  IF p_decision NOT IN ('Approved', 'Rejected', 'Pending') THEN
    RAISE EXCEPTION 'Invalid decision %', p_decision;
  END IF;

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
  ELSIF p_entity_type = 'training' THEN
    SELECT org_id, employee_id INTO v_org, v_emp
    FROM training_records WHERE id = p_entity_id FOR UPDATE;
  ELSE
    RAISE EXCEPTION 'Unknown entity type %', p_entity_type;
  END IF;

  IF v_org IS NULL THEN RAISE EXCEPTION 'Request not found'; END IF;

  v_actor := current_employee_id(v_org);
  SELECT COALESCE(p.full_name, p.email, 'HR User') INTO v_label
  FROM profiles p WHERE p.id = auth.uid();

  SELECT COUNT(*) INTO v_pending
  FROM approvals
  WHERE entity_type = p_entity_type AND entity_id = p_entity_id AND decision = 'Pending';

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
    ELSIF p_entity_type = 'training' THEN
      IF p_decision = 'Approved' THEN
        PERFORM fn_finalize_training_on_approve(p_entity_id);
      ELSE
        UPDATE training_records SET status = 'Rejected' WHERE id = p_entity_id;
      END IF;
    END IF;

    RETURN jsonb_build_object('entity_type', p_entity_type, 'entity_id', p_entity_id, 'status', p_decision, 'stage', 'HR');
  END IF;

  SELECT * INTO v_appr
  FROM approvals
  WHERE entity_type = p_entity_type AND entity_id = p_entity_id AND decision = 'Pending'
  ORDER BY CASE stage WHEN 'Manager' THEN 1 WHEN 'HR' THEN 2 WHEN 'Final' THEN 3 ELSE 4 END
  LIMIT 1 FOR UPDATE;

  v_can_decide := fn_can_approve_stage(v_org, v_emp, v_appr.stage);
  IF p_entity_type = 'training' AND has_perm(v_org, 'approve') THEN
    v_can_decide := true;
  END IF;

  IF NOT v_can_decide THEN
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
    ELSIF p_entity_type = 'training' THEN
      UPDATE training_records SET status = 'Rejected' WHERE id = p_entity_id;
    END IF;
    RETURN jsonb_build_object('entity_type', p_entity_type, 'entity_id', p_entity_id, 'status', 'Rejected', 'stage', v_appr.stage);
  END IF;

  IF p_entity_type = 'training' AND v_appr.stage = 'Manager' THEN
    UPDATE training_records
    SET manager_approved_by_label = v_label, manager_approved_at = now(), status = 'Pending HR Approval'
    WHERE id = p_entity_id;
  END IF;

  SELECT COUNT(*) INTO v_pending
  FROM approvals
  WHERE entity_type = p_entity_type AND entity_id = p_entity_id AND decision = 'Pending';

  IF v_pending > 0 THEN
    RETURN jsonb_build_object('entity_type', p_entity_type, 'entity_id', p_entity_id, 'status', 'Pending', 'stage', v_appr.stage);
  END IF;

  IF p_entity_type = 'leave' THEN
    PERFORM fn_finalize_leave_on_approve(p_entity_id);
  ELSIF p_entity_type = 'compoff' THEN
    UPDATE compoff_requests SET status = 'Approved' WHERE id = p_entity_id;
  ELSIF p_entity_type = 'late' THEN
    UPDATE late_exemptions SET status = 'Approved' WHERE id = p_entity_id;
  ELSIF p_entity_type = 'mispunch' THEN
    UPDATE mispunch_requests SET status = 'Approved' WHERE id = p_entity_id;
  ELSIF p_entity_type = 'training' THEN
    PERFORM fn_finalize_training_on_approve(p_entity_id);
  END IF;

  RETURN jsonb_build_object('entity_type', p_entity_type, 'entity_id', p_entity_id, 'status', 'Approved', 'stage', v_appr.stage);
END;
$$;

CREATE OR REPLACE FUNCTION fn_complete_training_direct(
  p_training_id uuid,
  p_completion_date date,
  p_reason text
) RETURNS training_records LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  r training_records;
  v_actor uuid;
  v_label text;
BEGIN
  IF trim(COALESCE(p_reason, '')) = '' THEN
    RAISE EXCEPTION 'Completion reason is required';
  END IF;
  IF p_completion_date IS NULL THEN
    RAISE EXCEPTION 'Completion date is required';
  END IF;

  SELECT * INTO r FROM training_records WHERE id = p_training_id FOR UPDATE;
  IF r.id IS NULL THEN RAISE EXCEPTION 'Training record not found'; END IF;

  IF current_hr_role(r.org_id) NOT IN ('Super Admin', 'Admin') THEN
    RAISE EXCEPTION 'Only Admin or Super Admin can complete training without approval';
  END IF;

  IF r.status IN ('Completed', 'Cancelled') THEN
    RAISE EXCEPTION 'Training is already %', r.status;
  END IF;

  v_actor := current_employee_id(r.org_id);
  SELECT COALESCE(p.full_name, p.email, 'HR User') INTO v_label
  FROM profiles p WHERE p.id = auth.uid();

  UPDATE approvals
  SET decision = 'Approved', acted_at = now(), approver_id = v_actor, comment = 'Admin direct completion'
  WHERE entity_type = 'training' AND entity_id = r.id AND decision = 'Pending';

  UPDATE training_records
  SET
    status = 'Completed',
    completion_reason = trim(p_reason),
    completion_date = p_completion_date,
    completion_requested_by_id = v_actor,
    completion_requested_by_label = v_label,
    completion_requested_at = COALESCE(completion_requested_at, now()),
    hr_approved_by_label = v_label,
    hr_approved_at = now()
  WHERE id = p_training_id
  RETURNING * INTO r;

  RETURN r;
END;
$$;

DO $$
DECLARE r record;
BEGIN
  FOR r IN
    SELECT p.oid::regprocedure AS sig FROM pg_proc p
    WHERE p.proname IN (
      'fn_extend_training',
      'fn_request_training_completion',
      'fn_finalize_training_on_approve',
      'fn_complete_training_direct',
      'fn_process_approval_decision'
    )
  LOOP
    EXECUTE format('GRANT EXECUTE ON FUNCTION %s TO authenticated', r.sig);
  END LOOP;
END $$;
