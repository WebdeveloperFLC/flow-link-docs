-- Application Foundation Step 0: revised create flow + offer/milestone RPCs

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
  v_owner uuid;
  v_owner_fallback boolean := false;
  v_app_status public.institution_application_status;
  v_existing_status public.qualification_lifecycle_status;
  v_program_code text;
  v_campus_name text;
  v_intake_year integer;
  v_study_level text;
  v_duration_months integer;
  v_tuition_fee numeric;
  v_tuition_currency text;
  v_destination_country text;
  v_institution_name text;
  v_institution_city text;
  v_cf_client_program_id uuid;
  v_cf_course_id uuid;
  v_application_source public.application_source;
BEGIN
  v_id := NULLIF(p_payload->>'id', '')::uuid;
  v_client_id := (p_payload->>'client_id')::uuid;
  v_case_id := (p_payload->>'client_service_case_id')::uuid;
  v_institution_id := (p_payload->>'institution_id')::uuid;
  v_intake_term := NULLIF(trim(p_payload->>'intake_term'), '');
  v_program_name := NULLIF(trim(p_payload->>'program_name'), '');
  v_intake_date := NULLIF(p_payload->>'intake_date', '')::date;
  v_program_code := NULLIF(trim(p_payload->>'program_code'), '');
  v_campus_name := NULLIF(trim(p_payload->>'campus_name'), '');
  v_intake_year := NULLIF(p_payload->>'intake_year', '')::integer;
  v_study_level := NULLIF(trim(p_payload->>'study_level'), '');
  v_duration_months := NULLIF(p_payload->>'duration_months', '')::integer;
  v_tuition_fee := NULLIF(p_payload->>'tuition_fee', '')::numeric;
  v_tuition_currency := NULLIF(trim(p_payload->>'tuition_currency'), '');
  v_destination_country := NULLIF(trim(p_payload->>'destination_country'), '');
  v_cf_client_program_id := NULLIF(p_payload->>'cf_client_program_id', '')::uuid;
  v_cf_course_id := NULLIF(p_payload->>'cf_course_id', '')::uuid;
  v_application_source := COALESCE(
    NULLIF(p_payload->>'application_source', '')::public.application_source,
    'MANUAL'::public.application_source
  );
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

  SELECT i.name, i.city, i.country_name
  INTO v_institution_name, v_institution_city, v_destination_country
  FROM public.upi_institutions i
  WHERE i.id = v_institution_id;

  IF v_destination_country IS NULL THEN
    v_destination_country := NULLIF(trim(p_payload->>'destination_country'), '');
  END IF;

  IF v_id IS NULL THEN
    v_owner := public.fn_resolve_qualification_owner(v_client_id, auth.uid());
    v_owner_fallback := NOT EXISTS (
      SELECT 1 FROM public.clients c WHERE c.id = v_client_id AND c.assigned_counselor_id IS NOT NULL
    );

    INSERT INTO public.client_institution_qualifications (
      client_id, client_service_case_id, institution_id, program_name, program_code, campus_name,
      intake_term, intake_date, intake_year, study_level, duration_months,
      tuition_fee, tuition_currency, destination_country,
      institution_name_snapshot, institution_city_snapshot,
      cf_client_program_id, cf_course_id, application_source,
      status, qualification_owner_user_id, institution_application_status, created_by,
      status_changed_at, status_changed_by
    ) VALUES (
      v_client_id, v_case_id, v_institution_id, v_program_name, v_program_code, v_campus_name,
      v_intake_term, v_intake_date, v_intake_year, v_study_level, v_duration_months,
      v_tuition_fee, v_tuition_currency, v_destination_country,
      v_institution_name, v_institution_city,
      v_cf_client_program_id, v_cf_course_id, v_application_source,
      'DRAFT', v_owner, v_app_status, auth.uid(), now(), auth.uid()
    )
    RETURNING id INTO v_id;

    INSERT INTO public.qualification_application_offer (
      qualification_id, client_id, offer_status
    ) VALUES (
      v_id, v_client_id, 'NONE'::public.application_offer_status
    );

    INSERT INTO public.qualification_application_milestones (
      qualification_id, client_id, application_created_at
    ) VALUES (
      v_id, v_client_id, now()
    );

    PERFORM public.fn_qualification_ingest_event(
      v_id,
      'QUALIFICATION_CREATED',
      jsonb_build_object(
        'institution_id', v_institution_id,
        'intake_term', v_intake_term,
        'owner_user_id', v_owner,
        'owner_assignment_fallback', v_owner_fallback,
        'application_source', v_application_source
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

    PERFORM public.fn_qualification_ingest_event(
      v_id, 'QUALIFICATION_UPDATED', p_payload, NULL
    );
  END IF;

  RETURN v_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.fn_update_application_offer(
  p_qualification_id uuid,
  p_payload jsonb
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_client_id uuid;
  v_lifecycle public.qualification_lifecycle_status;
  v_offer_type public.application_offer_type;
  v_offer_status public.application_offer_status;
  v_offer_number text;
  v_offer_date date;
  v_offer_expiry_date date;
  v_notes text;
  v_old_status public.application_offer_status;
  v_had_offer boolean;
BEGIN
  SELECT q.client_id, q.status
  INTO v_client_id, v_lifecycle
  FROM public.client_institution_qualifications q
  WHERE q.id = p_qualification_id;

  IF v_client_id IS NULL THEN
    RAISE EXCEPTION 'Application not found';
  END IF;

  IF NOT public.can_edit_client(auth.uid(), v_client_id) THEN
    RAISE EXCEPTION 'Permission denied';
  END IF;

  IF public.fn_qualification_is_terminal(v_lifecycle) THEN
    RAISE EXCEPTION 'Cannot edit offer on a closed application';
  END IF;

  v_offer_type := NULLIF(p_payload->>'offer_type', '')::public.application_offer_type;
  v_offer_status := COALESCE(
    NULLIF(p_payload->>'offer_status', '')::public.application_offer_status,
    'NONE'::public.application_offer_status
  );
  v_offer_number := NULLIF(trim(p_payload->>'offer_number'), '');
  v_offer_date := NULLIF(p_payload->>'offer_date', '')::date;
  v_offer_expiry_date := NULLIF(p_payload->>'offer_expiry_date', '')::date;
  v_notes := NULLIF(trim(p_payload->>'notes'), '');

  SELECT o.offer_status,
         o.offer_status NOT IN ('NONE'::public.application_offer_status)
         OR o.offer_type IS NOT NULL
  INTO v_old_status, v_had_offer
  FROM public.qualification_application_offer o
  WHERE o.qualification_id = p_qualification_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Offer record not found';
  END IF;

  UPDATE public.qualification_application_offer SET
    offer_type = v_offer_type,
    offer_status = v_offer_status,
    offer_number = v_offer_number,
    offer_date = v_offer_date,
    offer_expiry_date = v_offer_expiry_date,
    notes = v_notes,
    updated_at = now()
  WHERE qualification_id = p_qualification_id;

  IF v_offer_status IN ('RECEIVED', 'ACCEPTED')
     AND (v_old_status IS NULL OR v_old_status NOT IN ('RECEIVED', 'ACCEPTED')) THEN
    UPDATE public.qualification_application_milestones m SET
      offer_received_at = COALESCE(m.offer_received_at, COALESCE(v_offer_date, CURRENT_DATE)),
      updated_at = now()
    WHERE m.qualification_id = p_qualification_id;
  END IF;

  PERFORM public.fn_qualification_ingest_event(
    p_qualification_id,
    'APPLICATION_OFFER_UPDATED',
    jsonb_build_object(
      'offer_type', v_offer_type,
      'offer_status', v_offer_status,
      'offer_number', v_offer_number,
      'actor_id', auth.uid()
    ),
    NULL
  );

  RETURN p_qualification_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.fn_update_application_milestones(
  p_qualification_id uuid,
  p_payload jsonb
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_client_id uuid;
  v_lifecycle public.qualification_lifecycle_status;
BEGIN
  SELECT q.client_id, q.status
  INTO v_client_id, v_lifecycle
  FROM public.client_institution_qualifications q
  WHERE q.id = p_qualification_id;

  IF v_client_id IS NULL THEN
    RAISE EXCEPTION 'Application not found';
  END IF;

  IF NOT public.can_edit_client(auth.uid(), v_client_id) THEN
    RAISE EXCEPTION 'Permission denied';
  END IF;

  IF public.fn_qualification_is_terminal(v_lifecycle) THEN
    RAISE EXCEPTION 'Cannot edit milestones on a closed application';
  END IF;

  UPDATE public.qualification_application_milestones m SET
    offer_received_at = CASE
      WHEN p_payload ? 'offer_received_at' THEN NULLIF(p_payload->>'offer_received_at', '')::date
      ELSE m.offer_received_at
    END,
    visa_filed_at = CASE
      WHEN p_payload ? 'visa_filed_at' THEN NULLIF(p_payload->>'visa_filed_at', '')::date
      ELSE m.visa_filed_at
    END,
    visa_approved_at = CASE
      WHEN p_payload ? 'visa_approved_at' THEN NULLIF(p_payload->>'visa_approved_at', '')::date
      ELSE m.visa_approved_at
    END,
    enrollment_at = CASE
      WHEN p_payload ? 'enrollment_at' THEN NULLIF(p_payload->>'enrollment_at', '')::date
      ELSE m.enrollment_at
    END,
    updated_at = now()
  WHERE m.qualification_id = p_qualification_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Milestone record not found';
  END IF;

  PERFORM public.fn_qualification_ingest_event(
    p_qualification_id,
    'MILESTONE_UPDATED',
    COALESCE(p_payload, '{}'::jsonb) || jsonb_build_object('actor_id', auth.uid()),
    NULL
  );

  RETURN p_qualification_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.fn_record_application_submitted(
  p_qualification_id uuid,
  p_submitted_date date DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_client_id uuid;
  v_lifecycle public.qualification_lifecycle_status;
  v_submitted date;
BEGIN
  SELECT q.client_id, q.status
  INTO v_client_id, v_lifecycle
  FROM public.client_institution_qualifications q
  WHERE q.id = p_qualification_id;

  IF v_client_id IS NULL THEN
    RAISE EXCEPTION 'Application not found';
  END IF;

  IF NOT public.can_edit_client(auth.uid(), v_client_id) THEN
    RAISE EXCEPTION 'Permission denied';
  END IF;

  IF public.fn_qualification_is_terminal(v_lifecycle) THEN
    RAISE EXCEPTION 'Cannot record submission on a closed application';
  END IF;

  v_submitted := COALESCE(p_submitted_date, CURRENT_DATE);

  IF EXISTS (
    SELECT 1 FROM public.qualification_application_milestones m
    WHERE m.qualification_id = p_qualification_id
      AND m.application_submitted_date IS NOT NULL
  ) THEN
    RAISE EXCEPTION 'Application submission already recorded';
  END IF;

  UPDATE public.qualification_application_milestones m SET
    application_submitted_date = v_submitted,
    submitted_by_user_id = auth.uid(),
    updated_at = now()
  WHERE m.qualification_id = p_qualification_id;

  PERFORM public.fn_qualification_ingest_event(
    p_qualification_id,
    'APPLICATION_SUBMITTED',
    jsonb_build_object(
      'application_submitted_date', v_submitted,
      'submitted_by_user_id', auth.uid()
    ),
    NULL
  );

  RETURN p_qualification_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.fn_upsert_client_qualification(jsonb) TO authenticated;
GRANT EXECUTE ON FUNCTION public.fn_update_application_offer(uuid, jsonb) TO authenticated;
GRANT EXECUTE ON FUNCTION public.fn_update_application_milestones(uuid, jsonb) TO authenticated;
GRANT EXECUTE ON FUNCTION public.fn_record_application_submitted(uuid, date) TO authenticated;