-- Application Foundation (Q1): RLS + RPCs — no commission, funding, or external integrations

-- ---------------------------------------------------------------------------
-- RLS
-- ---------------------------------------------------------------------------
ALTER TABLE public.client_institution_qualifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.qualification_deposit_track ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.qualification_tuition_track ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.qualification_events ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS client_institution_qualifications_select ON public.client_institution_qualifications;
CREATE POLICY client_institution_qualifications_select ON public.client_institution_qualifications
  FOR SELECT TO authenticated
  USING (public.can_view_client(auth.uid(), client_id));

DROP POLICY IF EXISTS qualification_deposit_track_select ON public.qualification_deposit_track;
CREATE POLICY qualification_deposit_track_select ON public.qualification_deposit_track
  FOR SELECT TO authenticated
  USING (public.can_view_client(auth.uid(), client_id));

DROP POLICY IF EXISTS qualification_tuition_track_select ON public.qualification_tuition_track;
CREATE POLICY qualification_tuition_track_select ON public.qualification_tuition_track
  FOR SELECT TO authenticated
  USING (public.can_view_client(auth.uid(), client_id));

DROP POLICY IF EXISTS qualification_events_select ON public.qualification_events;
CREATE POLICY qualification_events_select ON public.qualification_events
  FOR SELECT TO authenticated
  USING (public.can_view_client(auth.uid(), client_id));

GRANT SELECT ON public.client_institution_qualifications TO authenticated;
GRANT SELECT ON public.qualification_deposit_track TO authenticated;
GRANT SELECT ON public.qualification_tuition_track TO authenticated;
GRANT SELECT ON public.qualification_events TO authenticated;

-- ---------------------------------------------------------------------------
-- Helpers
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.fn_qualification_track_status(
  p_required numeric,
  p_paid numeric
)
RETURNS public.qualification_track_status
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT CASE
    WHEN COALESCE(p_paid, 0) <= 0 THEN 'NOT_STARTED'::public.qualification_track_status
    WHEN COALESCE(p_paid, 0) >= COALESCE(p_required, 0) AND COALESCE(p_required, 0) > 0
      THEN 'SATISFIED'::public.qualification_track_status
    WHEN COALESCE(p_paid, 0) > 0 THEN 'PARTIAL'::public.qualification_track_status
    ELSE 'NOT_STARTED'::public.qualification_track_status
  END;
$$;

CREATE OR REPLACE FUNCTION public.fn_qualification_is_terminal(p_status public.qualification_lifecycle_status)
RETURNS boolean
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT p_status IN ('CLOSED', 'CANCELLED', 'REFUSED');
$$;

CREATE OR REPLACE FUNCTION public.fn_qualification_transition_allowed(
  p_from public.qualification_lifecycle_status,
  p_to public.qualification_lifecycle_status
)
RETURNS boolean
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT CASE
    WHEN public.fn_qualification_is_terminal(p_from) THEN false
    WHEN p_from = 'DRAFT' AND p_to IN ('ACTIVE', 'CANCELLED', 'REFUSED') THEN true
    WHEN p_from = 'ACTIVE' AND p_to IN ('ON_HOLD', 'COMPLETED', 'CANCELLED', 'REFUSED') THEN true
    WHEN p_from = 'ON_HOLD' AND p_to IN ('ACTIVE', 'CANCELLED', 'REFUSED') THEN true
    WHEN p_from = 'COMPLETED' AND p_to = 'CLOSED' THEN true
    ELSE false
  END;
$$;

CREATE OR REPLACE FUNCTION public.fn_qualification_ingest_event(
  p_qualification_id uuid,
  p_event_type text,
  p_payload jsonb DEFAULT '{}'::jsonb,
  p_idempotency_key text DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_client_id uuid;
  v_event_id uuid;
BEGIN
  SELECT q.client_id INTO v_client_id
  FROM public.client_institution_qualifications q
  WHERE q.id = p_qualification_id;

  IF v_client_id IS NULL THEN
    RAISE EXCEPTION 'Application not found';
  END IF;

  IF NOT public.can_edit_client(auth.uid(), v_client_id) AND auth.uid() IS NOT NULL THEN
    RAISE EXCEPTION 'Permission denied';
  END IF;

  IF p_idempotency_key IS NOT NULL THEN
    SELECT e.id INTO v_event_id
    FROM public.qualification_events e
    WHERE e.idempotency_key = p_idempotency_key;
    IF v_event_id IS NOT NULL THEN
      RETURN v_event_id;
    END IF;
  END IF;

  INSERT INTO public.qualification_events (
    qualification_id, client_id, event_type, actor_id, payload_jsonb, idempotency_key
  ) VALUES (
    p_qualification_id, v_client_id, p_event_type, auth.uid(), COALESCE(p_payload, '{}'::jsonb), p_idempotency_key
  )
  RETURNING id INTO v_event_id;

  RETURN v_event_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.fn_resolve_qualification_owner(
  p_client_id uuid,
  p_creating_user_id uuid
)
RETURNS uuid
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_counselor uuid;
BEGIN
  SELECT c.assigned_counselor_id INTO v_counselor
  FROM public.clients c
  WHERE c.id = p_client_id;

  IF v_counselor IS NOT NULL THEN
    RETURN v_counselor;
  END IF;

  RETURN p_creating_user_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.fn_upsert_client_qualification(
  p_payload jsonb
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_id uuid;
  v_client_id uuid;
  v_case_id uuid;
  v_institution_id uuid;
  v_intake_term text;
  v_program_name text;
  v_intake_date date;
  v_deposit_required numeric;
  v_tuition_total numeric;
  v_currency text;
  v_owner uuid;
  v_owner_fallback boolean := false;
  v_app_status public.institution_application_status;
  v_existing_status public.qualification_lifecycle_status;
BEGIN
  v_id := NULLIF(p_payload->>'id', '')::uuid;
  v_client_id := (p_payload->>'client_id')::uuid;
  v_case_id := (p_payload->>'client_service_case_id')::uuid;
  v_institution_id := (p_payload->>'institution_id')::uuid;
  v_intake_term := NULLIF(trim(p_payload->>'intake_term'), '');
  v_program_name := NULLIF(trim(p_payload->>'program_name'), '');
  v_intake_date := NULLIF(p_payload->>'intake_date', '')::date;
  v_deposit_required := COALESCE(NULLIF(p_payload->>'deposit_required', '')::numeric, 0);
  v_tuition_total := COALESCE(NULLIF(p_payload->>'tuition_total', '')::numeric, 0);
  v_currency := COALESCE(NULLIF(p_payload->>'currency', ''), 'CAD');
  v_app_status := COALESCE(
    NULLIF(p_payload->>'institution_application_status', '')::public.institution_application_status,
    'APPLIED'::public.institution_application_status
  );

  IF v_client_id IS NULL OR v_case_id IS NULL OR v_institution_id IS NULL OR v_intake_term IS NULL THEN
    RAISE EXCEPTION 'client_id, client_service_case_id, institution_id, and intake_term are required';
  END IF;

  IF NOT public.can_edit_client(auth.uid(), v_client_id) THEN
    RAISE EXCEPTION 'Permission denied';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM public.client_service_cases cs
    WHERE cs.id = v_case_id AND cs.client_id = v_client_id
  ) THEN
    RAISE EXCEPTION 'Service case does not belong to client';
  END IF;

  IF v_id IS NULL THEN
    v_owner := public.fn_resolve_qualification_owner(v_client_id, auth.uid());
    v_owner_fallback := NOT EXISTS (
      SELECT 1 FROM public.clients c WHERE c.id = v_client_id AND c.assigned_counselor_id IS NOT NULL
    );

    INSERT INTO public.client_institution_qualifications (
      client_id, client_service_case_id, institution_id, program_name, intake_term, intake_date,
      status, qualification_owner_user_id, institution_application_status, created_by,
      status_changed_at, status_changed_by
    ) VALUES (
      v_client_id, v_case_id, v_institution_id, v_program_name, v_intake_term, v_intake_date,
      'DRAFT', v_owner, v_app_status, auth.uid(), now(), auth.uid()
    )
    RETURNING id INTO v_id;

    INSERT INTO public.qualification_deposit_track (
      qualification_id, client_id, required_amount, paid_amount, outstanding_amount, currency, status
    ) VALUES (
      v_id, v_client_id, v_deposit_required, 0, v_deposit_required,
      v_currency, public.fn_qualification_track_status(v_deposit_required, 0)
    );

    INSERT INTO public.qualification_tuition_track (
      qualification_id, client_id, total_tuition, paid_amount, outstanding_amount, currency, status
    ) VALUES (
      v_id, v_client_id, v_tuition_total, 0, v_tuition_total,
      v_currency, public.fn_qualification_track_status(v_tuition_total, 0)
    );

    PERFORM public.fn_qualification_ingest_event(
      v_id,
      'QUALIFICATION_CREATED',
      jsonb_build_object(
        'institution_id', v_institution_id,
        'intake_term', v_intake_term,
        'owner_user_id', v_owner,
        'owner_assignment_fallback', v_owner_fallback
      ),
      'qual:created:' || v_id::text
    );
  ELSE
    SELECT q.status INTO v_existing_status
    FROM public.client_institution_qualifications q
    WHERE q.id = v_id AND q.client_id = v_client_id;

    IF v_existing_status IS NULL THEN
      RAISE EXCEPTION 'Application not found';
    END IF;

    IF public.fn_qualification_is_terminal(v_existing_status) THEN
      RAISE EXCEPTION 'Cannot update terminal application';
    END IF;

    IF v_existing_status <> 'DRAFT'::public.qualification_lifecycle_status
       AND (p_payload ? 'institution_id')
       AND (p_payload->>'institution_id')::uuid <> (
         SELECT institution_id FROM public.client_institution_qualifications WHERE id = v_id
       ) THEN
      RAISE EXCEPTION 'Institution cannot change after Draft';
    END IF;

    UPDATE public.client_institution_qualifications q SET
      program_name = COALESCE(v_program_name, q.program_name),
      intake_term = COALESCE(v_intake_term, q.intake_term),
      intake_date = COALESCE(v_intake_date, q.intake_date),
      updated_at = now()
    WHERE q.id = v_id;

    IF p_payload ? 'deposit_required' OR p_payload ? 'tuition_total' OR p_payload ? 'currency' THEN
      UPDATE public.qualification_deposit_track dt SET
        required_amount = COALESCE(v_deposit_required, dt.required_amount),
        outstanding_amount = GREATEST(COALESCE(v_deposit_required, dt.required_amount) - dt.paid_amount, 0),
        currency = COALESCE(v_currency, dt.currency),
        status = public.fn_qualification_track_status(COALESCE(v_deposit_required, dt.required_amount), dt.paid_amount),
        updated_at = now()
      WHERE dt.qualification_id = v_id;

      UPDATE public.qualification_tuition_track tt SET
        total_tuition = COALESCE(v_tuition_total, tt.total_tuition),
        outstanding_amount = GREATEST(COALESCE(v_tuition_total, tt.total_tuition) - tt.paid_amount, 0),
        currency = COALESCE(v_currency, tt.currency),
        status = public.fn_qualification_track_status(COALESCE(v_tuition_total, tt.total_tuition), tt.paid_amount),
        updated_at = now()
      WHERE tt.qualification_id = v_id;

      PERFORM public.fn_qualification_ingest_event(
        v_id, 'TRACK_AMOUNT_UPDATED', p_payload, 'qual:track:' || v_id::text || ':' || floor(extract(epoch from now()))::text
      );
    END IF;

    PERFORM public.fn_qualification_ingest_event(
      v_id, 'QUALIFICATION_UPDATED', p_payload, NULL
    );
  END IF;

  RETURN v_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.fn_transition_qualification_status(
  p_qualification_id uuid,
  p_to_status public.qualification_lifecycle_status,
  p_reason_code text DEFAULT NULL,
  p_reason_notes text DEFAULT NULL,
  p_hold_reason_code public.qualification_hold_reason_code DEFAULT NULL,
  p_transfer_target_case_id uuid DEFAULT NULL,
  p_transfer_target_institution_id uuid DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_row public.client_institution_qualifications%ROWTYPE;
BEGIN
  SELECT * INTO v_row
  FROM public.client_institution_qualifications
  WHERE id = p_qualification_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Application not found';
  END IF;

  IF NOT public.can_edit_client(auth.uid(), v_row.client_id) THEN
    RAISE EXCEPTION 'Permission denied';
  END IF;

  IF NOT public.fn_qualification_transition_allowed(v_row.status, p_to_status) THEN
    RAISE EXCEPTION 'Transition from % to % is not allowed', v_row.status, p_to_status;
  END IF;

  IF p_to_status = 'ON_HOLD' AND p_hold_reason_code IS NULL THEN
    RAISE EXCEPTION 'hold_reason_code is required when moving to ON_HOLD';
  END IF;

  IF p_to_status = 'ON_HOLD' AND p_hold_reason_code = 'OTHER_OPERATIONAL'
     AND COALESCE(trim(p_reason_notes), '') = '' THEN
    RAISE EXCEPTION 'reason_notes required for OTHER_OPERATIONAL hold';
  END IF;

  IF p_to_status IN ('CANCELLED', 'REFUSED', 'CLOSED')
     AND COALESCE(trim(p_reason_code), '') = '' THEN
    RAISE EXCEPTION 'reason_code is required for this transition';
  END IF;

  UPDATE public.client_institution_qualifications SET
    status = p_to_status,
    status_reason_code = p_reason_code,
    status_reason_notes = p_reason_notes,
    hold_reason_code = CASE WHEN p_to_status = 'ON_HOLD' THEN p_hold_reason_code ELSE NULL END,
    status_changed_at = now(),
    status_changed_by = auth.uid(),
    updated_at = now()
  WHERE id = p_qualification_id;

  PERFORM public.fn_qualification_ingest_event(
    p_qualification_id,
    'QUALIFICATION_STATUS_CHANGED',
    jsonb_build_object(
      'from_status', v_row.status,
      'to_status', p_to_status,
      'reason_code', p_reason_code,
      'reason_notes', p_reason_notes,
      'hold_reason_code', p_hold_reason_code,
      'actor_id', auth.uid(),
      'transitioned_at', now()
    ),
    'qual:status:' || p_qualification_id::text || ':' || p_to_status::text || ':' || floor(extract(epoch from now()))::text
  );

  RETURN p_qualification_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.fn_reassign_qualification_owner(
  p_qualification_id uuid,
  p_new_owner_user_id uuid,
  p_reason_notes text DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_client_id uuid;
  v_old_owner uuid;
BEGIN
  SELECT q.client_id, q.qualification_owner_user_id
  INTO v_client_id, v_old_owner
  FROM public.client_institution_qualifications q
  WHERE q.id = p_qualification_id;

  IF v_client_id IS NULL THEN
    RAISE EXCEPTION 'Application not found';
  END IF;

  IF NOT public.can_edit_client(auth.uid(), v_client_id) THEN
    RAISE EXCEPTION 'Permission denied';
  END IF;

  IF p_new_owner_user_id IS NULL THEN
    RAISE EXCEPTION 'new owner is required';
  END IF;

  UPDATE public.client_institution_qualifications SET
    qualification_owner_user_id = p_new_owner_user_id,
    updated_at = now()
  WHERE id = p_qualification_id;

  PERFORM public.fn_qualification_ingest_event(
    p_qualification_id,
    'QUALIFICATION_OWNER_CHANGED',
    jsonb_build_object(
      'from_user_id', v_old_owner,
      'to_user_id', p_new_owner_user_id,
      'reason_notes', p_reason_notes,
      'actor_id', auth.uid()
    ),
    'qual:owner:' || p_qualification_id::text || ':' || p_new_owner_user_id::text || ':' || floor(extract(epoch from now()))::text
  );

  RETURN p_qualification_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.fn_update_application_status(
  p_qualification_id uuid,
  p_application_status public.institution_application_status
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_client_id uuid;
  v_old public.institution_application_status;
BEGIN
  SELECT q.client_id, q.institution_application_status
  INTO v_client_id, v_old
  FROM public.client_institution_qualifications q
  WHERE q.id = p_qualification_id;

  IF v_client_id IS NULL THEN
    RAISE EXCEPTION 'Application not found';
  END IF;

  IF NOT public.can_edit_client(auth.uid(), v_client_id) THEN
    RAISE EXCEPTION 'Permission denied';
  END IF;

  UPDATE public.client_institution_qualifications SET
    institution_application_status = p_application_status,
    updated_at = now()
  WHERE id = p_qualification_id;

  PERFORM public.fn_qualification_ingest_event(
    p_qualification_id,
    'APPLICATION_STATUS_UPDATED',
    jsonb_build_object(
      'from_status', v_old,
      'to_status', p_application_status,
      'actor_id', auth.uid()
    ),
    NULL
  );

  RETURN p_qualification_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.fn_upsert_client_qualification(jsonb) TO authenticated;
GRANT EXECUTE ON FUNCTION public.fn_transition_qualification_status(uuid, public.qualification_lifecycle_status, text, text, public.qualification_hold_reason_code, uuid, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.fn_reassign_qualification_owner(uuid, uuid, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.fn_update_application_status(uuid, public.institution_application_status) TO authenticated;
GRANT EXECUTE ON FUNCTION public.fn_qualification_ingest_event(uuid, text, jsonb, text) TO authenticated;
