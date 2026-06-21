-- Admin / Super Admin can extend or complete training without manager/HR approval chain.

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
  v_admin boolean;
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

  v_admin := current_hr_role(r.org_id) IN ('Super Admin', 'Admin');

  IF NOT v_admin AND r.status IN (
    'Completed', 'Cancelled', 'Rejected', 'Pending Manager Approval', 'Pending HR Approval'
  ) THEN
    RAISE EXCEPTION 'Cannot extend training in status %', r.status;
  END IF;

  IF v_admin AND r.status IN ('Completed', 'Cancelled') THEN
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
    status = CASE
      WHEN status IN ('Pending Manager Approval', 'Pending HR Approval', 'Rejected') THEN 'Extended'
      ELSE 'Extended'
    END
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

DO $$
DECLARE r record;
BEGIN
  FOR r IN
    SELECT p.oid::regprocedure AS sig FROM pg_proc p
    WHERE p.proname IN ('fn_complete_training_direct', 'fn_extend_training')
  LOOP
    EXECUTE format('GRANT EXECUTE ON FUNCTION %s TO authenticated', r.sig);
  END LOOP;
END $$;
