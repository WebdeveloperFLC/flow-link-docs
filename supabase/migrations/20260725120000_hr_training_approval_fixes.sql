-- Fix training completion approvals: actor lookup order, HR can act on manager step, skip-manager status.

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

DO $$
DECLARE r record;
BEGIN
  FOR r IN
    SELECT p.oid::regprocedure AS sig FROM pg_proc p
    WHERE p.proname IN (
      'fn_request_training_completion',
      'fn_process_approval_decision'
    )
  LOOP
    EXECUTE format('GRANT EXECUTE ON FUNCTION %s TO authenticated', r.sig);
  END LOOP;
END $$;
