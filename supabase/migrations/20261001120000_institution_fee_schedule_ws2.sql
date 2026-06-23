-- Sprint 2 (ws-2) — Institution Fee Schedule + qualification fee snapshots

-- ---------------------------------------------------------------------------
-- institution_fee_schedule
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.institution_fee_schedule (
  id                        uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  upi_institution_id        uuid NOT NULL REFERENCES public.upi_institutions(id) ON DELETE CASCADE,
  fee_type                  text NOT NULL,
  amount                    numeric(15,2) NOT NULL,
  currency                  text NOT NULL DEFAULT 'CAD',
  fee_accuracy              text NOT NULL DEFAULT 'APPROXIMATE',
  verification_method       text,
  source_url                text,
  last_verified_at          timestamptz,
  verified_by               uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  confidence_score          numeric(5,2),
  detected_source_reference text,
  effective_from            date NOT NULL DEFAULT CURRENT_DATE,
  effective_to              date,
  program_id                uuid,
  partnership_route_id      uuid REFERENCES public.upi_partnership_routes(id) ON DELETE SET NULL,
  status                    text NOT NULL DEFAULT 'DRAFT',
  notes                     text,
  collection_category_id    uuid,
  created_by                uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at                timestamptz NOT NULL DEFAULT now(),
  updated_at                timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT institution_fee_schedule_fee_type_chk CHECK (
    fee_type IN ('APPLICATION', 'TUITION', 'DEPOSIT', 'RESIDENCE', 'INSURANCE', 'GIC', 'OTHER')
  ),
  CONSTRAINT institution_fee_schedule_fee_accuracy_chk CHECK (
    fee_accuracy IN ('EXACT', 'APPROXIMATE', 'AI_DETECTED', 'NEEDS_VERIFICATION')
  ),
  CONSTRAINT institution_fee_schedule_verification_method_chk CHECK (
    verification_method IS NULL OR verification_method IN (
      'WEBSITE', 'LOA', 'EMAIL', 'AGREEMENT', 'MANUAL', 'AI_DETECTED', 'PARTNER_PORTAL'
    )
  ),
  CONSTRAINT institution_fee_schedule_status_chk CHECK (
    status IN ('DRAFT', 'ACTIVE', 'ARCHIVED')
  ),
  CONSTRAINT institution_fee_schedule_application_exact_chk CHECK (
    fee_type <> 'APPLICATION' OR fee_accuracy = 'EXACT'
  ),
  CONSTRAINT institution_fee_schedule_confidence_score_chk CHECK (
    confidence_score IS NULL OR (confidence_score >= 0 AND confidence_score <= 100)
  )
);

CREATE INDEX IF NOT EXISTS idx_institution_fee_schedule_institution
  ON public.institution_fee_schedule (upi_institution_id, fee_type, status);

CREATE UNIQUE INDEX IF NOT EXISTS idx_institution_fee_schedule_institution_default_active
  ON public.institution_fee_schedule (upi_institution_id, fee_type)
  WHERE status = 'ACTIVE' AND program_id IS NULL AND partnership_route_id IS NULL;

DROP TRIGGER IF EXISTS trg_institution_fee_schedule_updated_at ON public.institution_fee_schedule;
CREATE TRIGGER trg_institution_fee_schedule_updated_at
  BEFORE UPDATE ON public.institution_fee_schedule
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

ALTER TABLE public.institution_fee_schedule ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS institution_fee_schedule_catalog_select ON public.institution_fee_schedule;
DROP POLICY IF EXISTS institution_fee_schedule_catalog_insert ON public.institution_fee_schedule;
DROP POLICY IF EXISTS institution_fee_schedule_catalog_update ON public.institution_fee_schedule;
DROP POLICY IF EXISTS institution_fee_schedule_catalog_delete ON public.institution_fee_schedule;

CREATE POLICY institution_fee_schedule_catalog_select ON public.institution_fee_schedule
  FOR SELECT TO authenticated
  USING (public.can_view_upi_catalog(auth.uid()) OR public.can_view_upi_confidential(auth.uid()));

CREATE POLICY institution_fee_schedule_catalog_insert ON public.institution_fee_schedule
  FOR INSERT TO authenticated
  WITH CHECK (public.can_manage_upi_catalog(auth.uid()));

CREATE POLICY institution_fee_schedule_catalog_update ON public.institution_fee_schedule
  FOR UPDATE TO authenticated
  USING (public.can_manage_upi_catalog(auth.uid()))
  WITH CHECK (public.can_manage_upi_catalog(auth.uid()));

CREATE POLICY institution_fee_schedule_catalog_delete ON public.institution_fee_schedule
  FOR DELETE TO authenticated
  USING (public.can_manage_upi_catalog(auth.uid()) OR public.has_role(auth.uid(), 'admin'::app_role));

COMMENT ON TABLE public.institution_fee_schedule IS
  'Institution fee defaults (ws-2). Route overrides via upi_partnership_routes; program fees via staging/cf_courses.';

-- ---------------------------------------------------------------------------
-- cf_courses.application_fee
-- ---------------------------------------------------------------------------

ALTER TABLE public.cf_courses
  ADD COLUMN IF NOT EXISTS application_fee numeric(10,2);

-- ---------------------------------------------------------------------------
-- client_institution_qualifications fee snapshots
-- ---------------------------------------------------------------------------

ALTER TABLE public.client_institution_qualifications
  ADD COLUMN IF NOT EXISTS application_fee numeric(14,2),
  ADD COLUMN IF NOT EXISTS application_fee_currency text,
  ADD COLUMN IF NOT EXISTS partnership_route_id uuid REFERENCES public.upi_partnership_routes(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS fee_snapshot_jsonb jsonb;

COMMENT ON COLUMN public.client_institution_qualifications.fee_snapshot_jsonb IS
  'Frozen InstitutionFeeResolution[] from ws-2 resolver at application create.';

-- ---------------------------------------------------------------------------
-- Extend fn_upsert_client_qualification for fee snapshot fields
-- ---------------------------------------------------------------------------

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
  v_application_fee numeric;
  v_application_fee_currency text;
  v_partnership_route_id uuid;
  v_fee_snapshot jsonb;
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
  v_application_fee := NULLIF(p_payload->>'application_fee', '')::numeric;
  v_application_fee_currency := NULLIF(trim(p_payload->>'application_fee_currency'), '');
  v_partnership_route_id := NULLIF(p_payload->>'partnership_route_id', '')::uuid;
  v_fee_snapshot := p_payload->'fee_snapshot_jsonb';
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
      tuition_fee, tuition_currency, application_fee, application_fee_currency,
      partnership_route_id, fee_snapshot_jsonb, destination_country,
      institution_name_snapshot, institution_city_snapshot,
      cf_client_program_id, cf_course_id, application_source,
      status, qualification_owner_user_id, institution_application_status, created_by,
      status_changed_at, status_changed_by,
      duplicate_override_reason, duplicate_override_at, duplicate_override_by
    ) VALUES (
      v_client_id, v_case_id, v_institution_id, v_program_name, v_program_code, v_campus_name,
      v_intake_term, v_intake_date, v_intake_year, v_study_level, v_duration_months,
      v_tuition_fee, v_tuition_currency, v_application_fee, v_application_fee_currency,
      v_partnership_route_id, v_fee_snapshot, v_destination_country,
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
        'duplicate_of_qualification_id', v_duplicate->>'qualification_id',
        'fee_snapshot', v_fee_snapshot
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
      application_fee = COALESCE(v_application_fee, q.application_fee),
      application_fee_currency = COALESCE(v_application_fee_currency, q.application_fee_currency),
      partnership_route_id = COALESCE(v_partnership_route_id, q.partnership_route_id),
      fee_snapshot_jsonb = COALESCE(v_fee_snapshot, q.fee_snapshot_jsonb),
      updated_at = now()
    WHERE q.id = v_id;

    PERFORM public.fn_qualification_ingest_event(
      v_id, 'QUALIFICATION_UPDATED', p_payload, NULL
    );
  END IF;

  RETURN v_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.fn_upsert_client_qualification(jsonb) TO authenticated;
