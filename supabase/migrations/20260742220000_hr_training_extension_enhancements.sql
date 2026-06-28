-- =====================================================================
-- HR Training — extension remarks + completion date on finalize
-- Single training record; history in training_extension_history.
-- Does NOT modify fn_compute_payroll.
-- =====================================================================

ALTER TABLE training_records
  ADD COLUMN IF NOT EXISTS extension_remarks text;

ALTER TABLE training_extension_history
  ADD COLUMN IF NOT EXISTS extension_remarks text;

CREATE OR REPLACE FUNCTION fn_extend_training(
  p_training_id uuid,
  p_extended_until date,
  p_reason text,
  p_remarks text DEFAULT NULL,
  p_type_override text DEFAULT NULL
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
    extension_remarks = NULLIF(trim(COALESCE(p_remarks, '')), ''),
    type = CASE
      WHEN NULLIF(trim(COALESCE(p_type_override, '')), '') IS NOT NULL THEN trim(p_type_override)
      ELSE type
    END,
    extended_by_id = v_actor,
    extended_by_label = v_label,
    extended_at = now(),
    status = 'Extended'
  WHERE id = p_training_id
  RETURNING * INTO r;

  INSERT INTO training_extension_history (
    org_id, training_id, original_end_date, extended_end_date,
    extension_reason, extension_remarks, extended_by_id, extended_by_label
  ) VALUES (
    r.org_id, r.id, COALESCE(r.original_end_date, r.end_date),
    p_extended_until, trim(p_reason),
    NULLIF(trim(COALESCE(p_remarks, '')), ''),
    v_actor, v_label
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
    completion_date = COALESCE(completion_date, CURRENT_DATE),
    hr_approved_by_label = v_label,
    hr_approved_at = now()
  WHERE id = p_training_id
  RETURNING * INTO r;

  RETURN r;
END;
$$;

GRANT EXECUTE ON FUNCTION fn_extend_training(uuid, date, text, text, text) TO authenticated;
