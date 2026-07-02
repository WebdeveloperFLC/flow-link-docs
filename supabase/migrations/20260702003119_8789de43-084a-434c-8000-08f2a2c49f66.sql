DROP FUNCTION IF EXISTS public.fn_mark_final_and_create_application(uuid,uuid,text,text,uuid,boolean,boolean,text);
DROP FUNCTION IF EXISTS public.fn_mark_final_and_create_application(uuid,uuid,text,text,uuid,boolean);

ALTER TABLE public.cf_courses
  ADD COLUMN IF NOT EXISTS program_code text,
  ADD COLUMN IF NOT EXISTS campus_names text[] NOT NULL DEFAULT '{}';

ALTER TABLE public.cf_client_programs
  ADD COLUMN IF NOT EXISTS qualification_id uuid
    REFERENCES public.client_institution_qualifications(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS selected_intake_term text,
  ADD COLUMN IF NOT EXISTS selected_campus text,
  ADD COLUMN IF NOT EXISTS program_code_snapshot text;

CREATE INDEX IF NOT EXISTS idx_cf_client_programs_qualification
  ON public.cf_client_programs (qualification_id)
  WHERE qualification_id IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS idx_cf_client_programs_one_qualification
  ON public.cf_client_programs (qualification_id)
  WHERE qualification_id IS NOT NULL;

CREATE OR REPLACE FUNCTION public.fn_mark_final_and_create_application(
  p_client_program_id uuid,
  p_client_service_case_id uuid,
  p_intake_term text,
  p_campus_name text DEFAULT NULL,
  p_owner_user_id uuid DEFAULT NULL,
  p_set_primary boolean DEFAULT true
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
BEGIN
  v_intake_term := NULLIF(trim(p_intake_term), '');
  v_campus := NULLIF(trim(p_campus_name), '');

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

  IF EXISTS (
    SELECT 1 FROM public.client_institution_qualifications q
    WHERE q.client_id = v_program.client_id
      AND q.client_service_case_id = p_client_service_case_id
      AND q.institution_id = v_institution_id
      AND q.intake_term = v_intake_term
      AND q.status IN ('DRAFT', 'ACTIVE', 'ON_HOLD', 'COMPLETED')
  ) THEN
    RAISE EXCEPTION 'An active application already exists for this institution and intake on this case';
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
    created_by, status_changed_at, status_changed_by
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
    auth.uid()
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
      'owner_user_id', v_owner
    ),
    'qual:mark_final:' || v_program.id::text
  );

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

GRANT EXECUTE ON FUNCTION public.fn_mark_final_and_create_application(uuid, uuid, text, text, uuid, boolean) TO authenticated;

COMMENT ON FUNCTION public.fn_mark_final_and_create_application(uuid, uuid, text, text, uuid, boolean) IS
  'Mark Final on cf_client_programs: finalize program, create DRAFT application (MARK_FINAL source), link qualification_id.';