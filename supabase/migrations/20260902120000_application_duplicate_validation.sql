-- Application duplicate validation: client + institution + program + campus + intake
-- Allows same institution with different program; blocks exact composite match unless override.

ALTER TABLE public.client_institution_qualifications
  ADD COLUMN IF NOT EXISTS duplicate_override_reason text,
  ADD COLUMN IF NOT EXISTS duplicate_override_at timestamptz,
  ADD COLUMN IF NOT EXISTS duplicate_override_by uuid REFERENCES auth.users(id) ON DELETE SET NULL;

DROP INDEX IF EXISTS public.idx_client_institution_qualifications_active_unique;

CREATE UNIQUE INDEX IF NOT EXISTS idx_client_institution_qualifications_program_unique
  ON public.client_institution_qualifications (
    client_id,
    institution_id,
    lower(trim(coalesce(program_name, ''))),
    lower(trim(coalesce(campus_name, ''))),
    lower(trim(intake_term))
  )
  WHERE status IN ('DRAFT', 'ACTIVE', 'ON_HOLD', 'COMPLETED')
    AND duplicate_override_reason IS NULL;

CREATE OR REPLACE FUNCTION public.fn_find_duplicate_application(
  p_client_id uuid,
  p_institution_id uuid,
  p_program_name text,
  p_campus_name text,
  p_intake_term text,
  p_exclude_qualification_id uuid DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_row public.client_institution_qualifications%ROWTYPE;
  v_institution_name text;
BEGIN
  IF p_client_id IS NULL OR p_institution_id IS NULL OR p_intake_term IS NULL THEN
    RETURN NULL;
  END IF;

  IF auth.uid() IS NOT NULL
     AND NOT public.can_view_client(auth.uid(), p_client_id) THEN
    RAISE EXCEPTION 'Permission denied';
  END IF;

  SELECT q.* INTO v_row
  FROM public.client_institution_qualifications q
  WHERE q.client_id = p_client_id
    AND q.institution_id = p_institution_id
    AND lower(trim(coalesce(q.program_name, ''))) = lower(trim(coalesce(p_program_name, '')))
    AND lower(trim(coalesce(q.campus_name, ''))) = lower(trim(coalesce(p_campus_name, '')))
    AND lower(trim(q.intake_term)) = lower(trim(p_intake_term))
    AND q.status IN ('DRAFT', 'ACTIVE', 'ON_HOLD', 'COMPLETED')
    AND (p_exclude_qualification_id IS NULL OR q.id <> p_exclude_qualification_id)
  ORDER BY q.created_at DESC
  LIMIT 1;

  IF NOT FOUND THEN
    RETURN NULL;
  END IF;

  SELECT i.name INTO v_institution_name
  FROM public.upi_institutions i
  WHERE i.id = v_row.institution_id;

  RETURN jsonb_build_object(
    'qualification_id', v_row.id,
    'status', v_row.status,
    'program_name', v_row.program_name,
    'campus_name', v_row.campus_name,
    'intake_term', v_row.intake_term,
    'institution_id', v_row.institution_id,
    'institution_name', v_institution_name,
    'client_service_case_id', v_row.client_service_case_id,
    'application_source', v_row.application_source,
    'created_at', v_row.created_at
  );
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
  v_duplicate jsonb;
  v_allow_override boolean := false;
  v_override_reason text;
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
  v_allow_override := COALESCE((p_payload->>'allow_duplicate_override')::boolean, false);
  v_override_reason := NULLIF(trim(p_payload->>'duplicate_override_reason'), '');

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
    v_duplicate := public.fn_find_duplicate_application(
      v_client_id, v_institution_id, v_program_name, v_campus_name, v_intake_term, NULL
    );

    IF v_duplicate IS NOT NULL THEN
      IF NOT v_allow_override OR v_override_reason IS NULL THEN
        RAISE EXCEPTION
          'Duplicate application exists for this client, institution, program, campus, and intake (application %)',
          v_duplicate->>'qualification_id'
          USING ERRCODE = '23505';
      END IF;
    END IF;

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
      status_changed_at, status_changed_by,
      duplicate_override_reason, duplicate_override_at, duplicate_override_by
    ) VALUES (
      v_client_id, v_case_id, v_institution_id, v_program_name, v_program_code, v_campus_name,
      v_intake_term, v_intake_date, v_intake_year, v_study_level, v_duration_months,
      v_tuition_fee, v_tuition_currency, v_destination_country,
      v_institution_name, v_institution_city,
      v_cf_client_program_id, v_cf_course_id, v_application_source,
      'DRAFT', v_owner, v_app_status, auth.uid(), now(), auth.uid(),
      CASE WHEN v_allow_override THEN v_override_reason ELSE NULL END,
      CASE WHEN v_allow_override THEN now() ELSE NULL END,
      CASE WHEN v_allow_override THEN auth.uid() ELSE NULL END
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
        'program_name', v_program_name,
        'campus_name', v_campus_name,
        'owner_user_id', v_owner,
        'owner_assignment_fallback', v_owner_fallback,
        'application_source', v_application_source,
        'duplicate_override', v_allow_override,
        'duplicate_override_reason', v_override_reason,
        'duplicate_of_qualification_id', v_duplicate->>'qualification_id'
      ),
      'qual:created:' || v_id::text
    );

    IF v_allow_override AND v_duplicate IS NOT NULL THEN
      PERFORM public.fn_qualification_ingest_event(
        v_id,
        'APPLICATION_DUPLICATE_OVERRIDE',
        jsonb_build_object(
          'duplicate_of_qualification_id', v_duplicate->>'qualification_id',
          'reason', v_override_reason
        ),
        'qual:dup_override:' || v_id::text
      );
    END IF;
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

    v_duplicate := public.fn_find_duplicate_application(
      v_client_id, v_institution_id, v_program_name, v_campus_name, v_intake_term, v_id
    );

    IF v_duplicate IS NOT NULL THEN
      RAISE EXCEPTION
        'Duplicate application exists for this client, institution, program, campus, and intake (application %)',
        v_duplicate->>'qualification_id'
        USING ERRCODE = '23505';
    END IF;

    UPDATE public.client_institution_qualifications q SET
      program_name = COALESCE(v_program_name, q.program_name),
      program_code = COALESCE(v_program_code, q.program_code),
      campus_name = COALESCE(v_campus_name, q.campus_name),
      intake_term = COALESCE(v_intake_term, q.intake_term),
      intake_date = COALESCE(v_intake_date, q.intake_date),
      intake_year = COALESCE(v_intake_year, q.intake_year),
      study_level = COALESCE(v_study_level, q.study_level),
      duration_months = COALESCE(v_duration_months, q.duration_months),
      tuition_fee = COALESCE(v_tuition_fee, q.tuition_fee),
      tuition_currency = COALESCE(v_tuition_currency, q.tuition_currency),
      updated_at = now()
    WHERE q.id = v_id;

    PERFORM public.fn_qualification_ingest_event(
      v_id, 'QUALIFICATION_UPDATED', p_payload, NULL
    );
  END IF;

  RETURN v_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.fn_mark_final_and_create_application(
  p_client_program_id uuid,
  p_client_service_case_id uuid,
  p_intake_term text,
  p_campus_name text DEFAULT NULL,
  p_owner_user_id uuid DEFAULT NULL,
  p_set_primary boolean DEFAULT true,
  p_allow_duplicate_override boolean DEFAULT false,
  p_duplicate_override_reason text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_program public.cf_client_programs%ROWTYPE;
  v_course public.cf_courses%ROWTYPE;
  v_uni public.cf_universities%ROWTYPE;
  v_institution_id uuid;
  v_qualification_id uuid;
  v_owner uuid;
  v_intake_term text;
  v_campus text;
  v_program_code text;
  v_primary_count integer;
  v_make_primary boolean;
  v_country_name text;
  v_duplicate jsonb;
  v_override_reason text;
BEGIN
  v_intake_term := NULLIF(trim(p_intake_term), '');
  v_campus := NULLIF(trim(p_campus_name), '');
  v_override_reason := NULLIF(trim(p_duplicate_override_reason), '');

  IF p_client_program_id IS NULL OR p_client_service_case_id IS NULL OR v_intake_term IS NULL THEN
    RAISE EXCEPTION 'client_program_id, client_service_case_id, and intake_term are required';
  END IF;

  SELECT * INTO v_program
  FROM public.cf_client_programs cp
  WHERE cp.id = p_client_program_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Client program not found';
  END IF;

  IF NOT public.can_edit_client(auth.uid(), v_program.client_id) THEN
    RAISE EXCEPTION 'Permission denied';
  END IF;

  IF v_program.status = 'final' AND v_program.qualification_id IS NOT NULL THEN
    RETURN jsonb_build_object(
      'qualification_id', v_program.qualification_id,
      'client_program_id', v_program.id,
      'already_linked', true
    );
  END IF;

  IF v_program.status <> 'shortlisted' THEN
    RAISE EXCEPTION 'Only shortlisted programs can be marked final with application create';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM public.client_service_cases cs
    WHERE cs.id = p_client_service_case_id
      AND cs.client_id = v_program.client_id
  ) THEN
    RAISE EXCEPTION 'Service case does not belong to client';
  END IF;

  SELECT * INTO v_course FROM public.cf_courses c WHERE c.id = v_program.course_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Course not found';
  END IF;

  SELECT * INTO v_uni FROM public.cf_universities u WHERE u.id = v_course.university_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'University not found';
  END IF;

  v_institution_id := v_uni.upi_institution_id;

  IF v_institution_id IS NULL THEN
    SELECT i.id INTO v_institution_id
    FROM public.upi_institutions i
    WHERE lower(trim(i.name)) = lower(trim(v_uni.name))
      AND (
        i.country_name IS NULL
        OR EXISTS (
          SELECT 1 FROM public.cf_countries cc
          WHERE cc.code = v_uni.country_code
            AND lower(trim(coalesce(i.country_name, ''))) = lower(trim(cc.name))
        )
      )
    ORDER BY i.is_partner DESC, i.updated_at DESC NULLS LAST
    LIMIT 1;
  END IF;

  IF v_institution_id IS NULL THEN
    RAISE EXCEPTION 'Institution is not linked to UPI master — publish from Institution Review first';
  END IF;

  v_duplicate := public.fn_find_duplicate_application(
    v_program.client_id,
    v_institution_id,
    v_course.name,
    v_campus,
    v_intake_term,
    NULL
  );

  IF v_duplicate IS NOT NULL THEN
    IF NOT COALESCE(p_allow_duplicate_override, false) OR v_override_reason IS NULL THEN
      RAISE EXCEPTION
        'Duplicate application exists for this client, institution, program, campus, and intake (application %)',
        v_duplicate->>'qualification_id'
        USING ERRCODE = '23505';
    END IF;
  END IF;

  v_program_code := NULLIF(trim(coalesce(v_course.program_code, '')), '');

  v_owner := COALESCE(p_owner_user_id, public.fn_resolve_qualification_owner(v_program.client_id, auth.uid()));

  SELECT count(*)::integer INTO v_primary_count
  FROM public.cf_client_programs cp
  WHERE cp.client_id = v_program.client_id
    AND cp.country_code = v_program.country_code
    AND cp.status = 'final'
    AND cp.is_primary = true;

  v_make_primary := COALESCE(p_set_primary, (v_primary_count = 0));

  IF v_make_primary THEN
    UPDATE public.cf_client_programs cp SET
      is_primary = false,
      updated_at = now()
    WHERE cp.client_id = v_program.client_id
      AND cp.country_code = v_program.country_code
      AND cp.status = 'final'
      AND cp.is_primary = true;
  END IF;

  INSERT INTO public.client_institution_qualifications (
    client_id, client_service_case_id, institution_id,
    program_name, program_code, campus_name,
    intake_term, intake_year, study_level, duration_months,
    tuition_fee, tuition_currency, destination_country,
    institution_name_snapshot, institution_city_snapshot,
    cf_client_program_id, cf_course_id, application_source,
    status, qualification_owner_user_id, institution_application_status,
    created_by, status_changed_at, status_changed_by,
    duplicate_override_reason, duplicate_override_at, duplicate_override_by
  )
  SELECT
    v_program.client_id,
    p_client_service_case_id,
    v_institution_id,
    v_course.name,
    v_program_code,
    v_campus,
    v_intake_term,
    v_course.intake_year,
    v_course.study_level,
    v_course.duration_months,
    v_course.tuition_fee,
    v_course.currency,
    i.country_name,
    i.name,
    i.city,
    v_program.id,
    v_course.id,
    'MARK_FINAL'::public.application_source,
    'DRAFT'::public.qualification_lifecycle_status,
    v_owner,
    'APPLIED'::public.institution_application_status,
    auth.uid(),
    now(),
    auth.uid(),
    CASE WHEN COALESCE(p_allow_duplicate_override, false) THEN v_override_reason ELSE NULL END,
    CASE WHEN COALESCE(p_allow_duplicate_override, false) THEN now() ELSE NULL END,
    CASE WHEN COALESCE(p_allow_duplicate_override, false) THEN auth.uid() ELSE NULL END
  FROM public.upi_institutions i
  WHERE i.id = v_institution_id
  RETURNING id INTO v_qualification_id;

  INSERT INTO public.qualification_application_offer (qualification_id, client_id, offer_status)
  VALUES (v_qualification_id, v_program.client_id, 'NONE'::public.application_offer_status);

  INSERT INTO public.qualification_application_milestones (qualification_id, client_id, application_created_at)
  VALUES (v_qualification_id, v_program.client_id, now());

  PERFORM public.fn_qualification_ingest_event(
    v_qualification_id,
    'QUALIFICATION_CREATED',
    jsonb_build_object(
      'application_source', 'MARK_FINAL',
      'cf_client_program_id', v_program.id,
      'cf_course_id', v_course.id,
      'intake_term', v_intake_term,
      'campus_name', v_campus,
      'program_name', v_course.name,
      'owner_user_id', v_owner,
      'duplicate_override', COALESCE(p_allow_duplicate_override, false),
      'duplicate_override_reason', v_override_reason,
      'duplicate_of_qualification_id', v_duplicate->>'qualification_id'
    ),
    'qual:mark_final:' || v_program.id::text
  );

  IF COALESCE(p_allow_duplicate_override, false) AND v_duplicate IS NOT NULL THEN
    PERFORM public.fn_qualification_ingest_event(
      v_qualification_id,
      'APPLICATION_DUPLICATE_OVERRIDE',
      jsonb_build_object(
        'duplicate_of_qualification_id', v_duplicate->>'qualification_id',
        'reason', v_override_reason
      ),
      'qual:dup_override:' || v_qualification_id::text
    );
  END IF;

  UPDATE public.cf_client_programs cp SET
    status = 'final',
    finalized_by = auth.uid(),
    finalized_at = now(),
    is_primary = v_make_primary,
    qualification_id = v_qualification_id,
    selected_intake_term = v_intake_term,
    selected_campus = v_campus,
    program_code_snapshot = v_program_code,
    updated_at = now()
  WHERE cp.id = v_program.id;

  SELECT cc.name INTO v_country_name
  FROM public.cf_countries cc
  WHERE cc.code = v_program.country_code;

  RETURN jsonb_build_object(
    'qualification_id', v_qualification_id,
    'client_program_id', v_program.id,
    'country_name', v_country_name,
    'is_primary', v_make_primary
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.fn_find_duplicate_application(uuid, uuid, text, text, text, uuid) TO authenticated;

GRANT EXECUTE ON FUNCTION public.fn_mark_final_and_create_application(
  uuid, uuid, text, text, uuid, boolean, boolean, text
) TO authenticated;

COMMENT ON FUNCTION public.fn_find_duplicate_application IS
  'Find active application matching client + institution + program + campus + intake (case-agnostic).';
