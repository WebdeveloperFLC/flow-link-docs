-- =====================================================================
-- HR Approval — Clarification workflow (never reject on clarify)
-- Extends request_status; does NOT modify payroll engine.
-- =====================================================================

ALTER TYPE request_status ADD VALUE IF NOT EXISTS 'Clarification Required';
ALTER TYPE request_status ADD VALUE IF NOT EXISTS 'Pending Employee Response';

CREATE OR REPLACE FUNCTION fn_request_clarification(
  p_entity_type text,
  p_entity_id uuid,
  p_comment text
) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_org uuid;
  v_emp uuid;
  v_status request_status;
  v_label text;
BEGIN
  IF NULLIF(trim(COALESCE(p_comment, '')), '') IS NULL THEN
    RAISE EXCEPTION 'Clarification comment is required';
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
  ELSE
    RAISE EXCEPTION 'Clarification not supported for entity type %', p_entity_type;
  END IF;

  IF v_org IS NULL THEN RAISE EXCEPTION 'Request not found'; END IF;
  IF v_status NOT IN ('Pending', 'Clarification Required', 'Pending Employee Response') THEN
    RAISE EXCEPTION 'Cannot request clarification for status %', v_status;
  END IF;
  IF NOT has_perm(v_org, 'approve') THEN
    RAISE EXCEPTION 'Not authorized to request clarification';
  END IF;

  SELECT COALESCE(p.full_name, p.email, 'HR User') INTO v_label
  FROM profiles p WHERE p.id = auth.uid();

  UPDATE approvals
  SET comment = trim(p_comment)
  WHERE entity_type = p_entity_type AND entity_id = p_entity_id AND decision = 'Pending';

  IF p_entity_type = 'leave' THEN
    UPDATE leave_requests SET status = 'Clarification Required' WHERE id = p_entity_id;
  ELSIF p_entity_type = 'compoff' THEN
    UPDATE compoff_requests SET status = 'Clarification Required' WHERE id = p_entity_id;
  ELSIF p_entity_type = 'late' THEN
    UPDATE late_exemptions SET status = 'Clarification Required' WHERE id = p_entity_id;
  ELSIF p_entity_type = 'mispunch' THEN
    UPDATE mispunch_requests SET status = 'Clarification Required' WHERE id = p_entity_id;
  END IF;

  INSERT INTO audit_log (org_id, actor_id, actor_label, action, target, new_value)
  VALUES (
    v_org, auth.uid(), v_label,
    'Clarification Requested',
    p_entity_id::text,
    trim(p_comment)
  );

  RETURN jsonb_build_object(
    'entity_type', p_entity_type,
    'entity_id', p_entity_id,
    'status', 'Clarification Required'
  );
END;
$$;

CREATE OR REPLACE FUNCTION fn_resubmit_after_clarification(
  p_entity_type text,
  p_entity_id uuid
) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_org uuid;
  v_emp uuid;
  v_status request_status;
  v_actor uuid;
BEGIN
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
    RAISE EXCEPTION 'Resubmit not supported for entity type %', p_entity_type;
  END IF;

  IF v_org IS NULL THEN RAISE EXCEPTION 'Request not found'; END IF;
  IF v_status NOT IN ('Clarification Required', 'Pending Employee Response') THEN
    RAISE EXCEPTION 'Request is not awaiting employee clarification';
  END IF;

  v_actor := current_employee_id(v_org);
  IF v_actor IS NULL OR v_actor <> v_emp THEN
    IF NOT (has_perm(v_org, 'approve') OR has_perm(v_org, 'apply')) THEN
      RAISE EXCEPTION 'Not authorized to resubmit this request';
    END IF;
    IF NOT has_perm(v_org, 'approve') AND v_actor <> v_emp THEN
      RAISE EXCEPTION 'Only the employee may resubmit after clarification';
    END IF;
  END IF;

  IF p_entity_type = 'leave' THEN
    UPDATE leave_requests SET status = 'Pending' WHERE id = p_entity_id;
  ELSIF p_entity_type = 'compoff' THEN
    UPDATE compoff_requests SET status = 'Pending' WHERE id = p_entity_id;
  ELSIF p_entity_type = 'late' THEN
    UPDATE late_exemptions SET status = 'Pending' WHERE id = p_entity_id;
  ELSIF p_entity_type = 'mispunch' THEN
    UPDATE mispunch_requests SET status = 'Pending' WHERE id = p_entity_id;
  END IF;

  INSERT INTO audit_log (org_id, actor_id, actor_label, action, target, new_value)
  VALUES (
    v_org, auth.uid(), fn_hr_actor_label(),
    'Clarification Resubmitted',
    p_entity_id::text,
    'Pending'
  );

  RETURN jsonb_build_object(
    'entity_type', p_entity_type,
    'entity_id', p_entity_id,
    'status', 'Pending'
  );
END;
$$;

CREATE OR REPLACE FUNCTION trg_leave_resubmit_on_update()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF OLD.status IN ('Clarification Required', 'Pending Employee Response')
     AND NEW.status = OLD.status
     AND (
       NEW.reason IS DISTINCT FROM OLD.reason
       OR NEW.from_date IS DISTINCT FROM OLD.from_date
       OR NEW.to_date IS DISTINCT FROM OLD.to_date
       OR NEW.document_id IS DISTINCT FROM OLD.document_id
     ) THEN
    NEW.status := 'Pending';
  END IF;
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION trg_compoff_resubmit_on_update()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF OLD.status IN ('Clarification Required', 'Pending Employee Response')
     AND NEW.status = OLD.status
     AND (
       NEW.reason IS DISTINCT FROM OLD.reason
       OR NEW.worked_date IS DISTINCT FROM OLD.worked_date
       OR NEW.occasion IS DISTINCT FROM OLD.occasion
     ) THEN
    NEW.status := 'Pending';
  END IF;
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION trg_late_resubmit_on_update()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF OLD.status IN ('Clarification Required', 'Pending Employee Response')
     AND NEW.status = OLD.status
     AND (
       NEW.reason IS DISTINCT FROM OLD.reason
       OR NEW.delay_min IS DISTINCT FROM OLD.delay_min
       OR NEW.late_date IS DISTINCT FROM OLD.late_date
     ) THEN
    NEW.status := 'Pending';
  END IF;
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION trg_mispunch_resubmit_on_update()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF OLD.status IN ('Clarification Required', 'Pending Employee Response')
     AND NEW.status = OLD.status
     AND (
       NEW.issue IS DISTINCT FROM OLD.issue
       OR NEW.evidence IS DISTINCT FROM OLD.evidence
       OR NEW.punch_date IS DISTINCT FROM OLD.punch_date
     ) THEN
    NEW.status := 'Pending';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_leave_resubmit_clarify ON leave_requests;
CREATE TRIGGER trg_leave_resubmit_clarify
  BEFORE UPDATE ON leave_requests
  FOR EACH ROW EXECUTE FUNCTION trg_leave_resubmit_on_update();

DROP TRIGGER IF EXISTS trg_compoff_resubmit_clarify ON compoff_requests;
CREATE TRIGGER trg_compoff_resubmit_clarify
  BEFORE UPDATE ON compoff_requests
  FOR EACH ROW EXECUTE FUNCTION trg_compoff_resubmit_on_update();

DROP TRIGGER IF EXISTS trg_late_resubmit_clarify ON late_exemptions;
CREATE TRIGGER trg_late_resubmit_clarify
  BEFORE UPDATE ON late_exemptions
  FOR EACH ROW EXECUTE FUNCTION trg_late_resubmit_on_update();

DROP TRIGGER IF EXISTS trg_mispunch_resubmit_clarify ON mispunch_requests;
CREATE TRIGGER trg_mispunch_resubmit_clarify
  BEFORE UPDATE ON mispunch_requests
  FOR EACH ROW EXECUTE FUNCTION trg_mispunch_resubmit_on_update();

GRANT EXECUTE ON FUNCTION fn_request_clarification(text, uuid, text) TO authenticated;
GRANT EXECUTE ON FUNCTION fn_resubmit_after_clarification(text, uuid) TO authenticated;
