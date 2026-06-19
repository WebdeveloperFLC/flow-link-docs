-- Fix Register as Client: call_queue_status has no 'done' — use 'enrolled' when closing queue on conversion.

CREATE OR REPLACE FUNCTION public.convert_lead_to_client(
  _lead_id uuid,
  _opts jsonb DEFAULT '{}'::jsonb
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  uid uuid := auth.uid();
  v_lead public.leads%ROWTYPE;
  v_client public.clients%ROWTYPE;
  v_existing_id uuid;
  v_counselor_notes text;
  v_full_name text;
  v_app_type text;
  v_e0 jsonb;
  v_institution text;
  v_pct text;
  v_year_date date;
  v_year_raw text;
  v_last_education text;
BEGIN
  IF uid IS NULL THEN
    RAISE EXCEPTION 'Not authenticated' USING ERRCODE = '28000';
  END IF;

  PERFORM public._assert_can_edit_lead(uid, _lead_id);

  SELECT * INTO v_lead FROM public.leads WHERE id = _lead_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Lead not found' USING ERRCODE = 'P0002';
  END IF;

  IF v_lead.converted_to_client_id IS NOT NULL THEN
    SELECT registration_number INTO v_client.registration_number
      FROM public.clients WHERE id = v_lead.converted_to_client_id;
    RETURN jsonb_build_object(
      'client_id', v_lead.converted_to_client_id,
      'registration_number', v_client.registration_number,
      'already_converted', true
    );
  END IF;

  SELECT id INTO v_existing_id FROM public.clients WHERE source_lead_id = _lead_id LIMIT 1;
  IF v_existing_id IS NOT NULL THEN
    UPDATE public.leads
       SET status = 'converted',
           converted_to_client_id = v_existing_id,
           converted_at = COALESCE(converted_at, now())
     WHERE id = _lead_id
       AND converted_to_client_id IS DISTINCT FROM v_existing_id;

    SELECT registration_number INTO v_client.registration_number
      FROM public.clients WHERE id = v_existing_id;
    RETURN jsonb_build_object(
      'client_id', v_existing_id,
      'registration_number', v_client.registration_number,
      'already_converted', true
    );
  END IF;

  v_counselor_notes := COALESCE(
    NULLIF(btrim(_opts ->> 'counselor_notes'), ''),
    NULLIF(btrim(v_lead.notes), '')
  );
  v_full_name := btrim(concat_ws(' ', v_lead.first_name, v_lead.middle_name, v_lead.last_name));

  IF v_full_name = '' THEN
    RAISE EXCEPTION 'Lead name required for conversion' USING ERRCODE = '22023';
  END IF;

  v_e0 := CASE
    WHEN jsonb_array_length(COALESCE(v_lead.education_history, '[]'::jsonb)) > 0
      THEN v_lead.education_history -> 0
    ELSE NULL
  END;
  v_institution := NULLIF(btrim(v_e0 ->> 'institution'), '');
  v_pct := NULLIF(btrim(v_e0 ->> 'percentage_cgpa'), '');
  v_year_raw := NULLIF(
    btrim(COALESCE(v_e0 ->> 'end_year', v_e0 ->> 'year')),
    ''
  );
  v_year_date := CASE
    WHEN v_e0 IS NULL OR v_year_raw IS NULL THEN NULL
    WHEN v_year_raw ~ '^\d{4}-\d{2}-\d{2}$' THEN v_year_raw::date
    WHEN substring(v_year_raw from '\d{4}') IS NOT NULL
      THEN make_date(substring(v_year_raw from '\d{4}')::int, 6, 30)
    ELSE NULL
  END;
  v_last_education := COALESCE(NULLIF(v_lead.last_education, ''), NULLIF(v_e0 ->> 'level', ''));

  v_app_type := CASE
    WHEN COALESCE(v_lead.visa_services[1], '') LIKE '%::%' THEN 'Visa application'
    WHEN COALESCE(v_lead.visa_services[1], '') <> '' THEN v_lead.visa_services[1]
    ELSE 'Student Visa'
  END;

  INSERT INTO public.clients (
    source_lead_id,
    first_name, middle_name, last_name, full_name,
    email, phone, phone_country_code,
    gender, marital_status,
    country_of_citizenship, country_of_residence, country,
    last_education, last_education_other, institution_name, year_of_passing, percentage_cgpa,
    education_history,
    english_test, english_test_status, english_overall,
    english_test_date, english_test_expiry, english_sections, other_tests, work_experience, language_tests,
    test_attempts, active_attempt_ids,
    interested_countries, branch, branch_id, department,
    assigned_counselor_id, owner_id, created_by, converted_by,
    coaching_services, visa_services, admission_services, allied_services, travel_financial_services,
    application_type, lead_source, counselor_notes, lead_temperature,
    sponsor, sponsor_other, start_timeline,
    has_budget, budget_currency, budget_min, budget_max, budget,
    next_followup_at
  )
  VALUES (
    v_lead.id,
    v_lead.first_name, v_lead.middle_name, v_lead.last_name, v_full_name,
    v_lead.email, v_lead.phone, v_lead.phone_country_code,
    v_lead.gender, v_lead.marital_status,
    v_lead.country_of_citizenship,
    v_lead.country_of_residence,
    COALESCE(v_lead.country_of_residence, 'India'),
    v_last_education, v_lead.last_education_other, v_institution, v_year_date, v_pct,
    COALESCE(v_lead.education_history, '[]'::jsonb),
    v_lead.english_test, v_lead.english_test_status, v_lead.english_overall,
    v_lead.english_test_date, v_lead.english_test_expiry,
    COALESCE(v_lead.english_sections, '{}'::jsonb),
    COALESCE(v_lead.other_tests, '[]'::jsonb),
    COALESCE(v_lead.work_experience, '[]'::jsonb),
    COALESCE(v_lead.language_tests, '{}'::jsonb),
    COALESCE(v_lead.test_attempts, '[]'::jsonb),
    COALESCE(v_lead.active_attempt_ids, '{}'::jsonb),
    COALESCE(v_lead.interested_countries, '{}'::text[]),
    v_lead.branch, v_lead.branch_id, v_lead.department,
    v_lead.assigned_counselor_id,
    COALESCE(v_lead.assigned_counselor_id, uid),
    uid, uid,
    COALESCE(v_lead.coaching_services, '{}'::text[]),
    COALESCE(v_lead.visa_services, '{}'::text[]),
    COALESCE(v_lead.admission_services, '{}'::text[]),
    COALESCE(v_lead.allied_services, '{}'::text[]),
    COALESCE(v_lead.travel_financial_services, '{}'::text[]),
    v_app_type,
    v_lead.lead_source,
    v_counselor_notes,
    v_lead.lead_temperature,
    v_lead.sponsor, v_lead.sponsor_other, v_lead.start_timeline,
    v_lead.has_budget, v_lead.budget_currency, v_lead.budget_min, v_lead.budget_max,
    CASE
      WHEN v_lead.has_budget = 'yes' AND (v_lead.budget_max IS NOT NULL OR v_lead.budget_min IS NOT NULL)
        THEN COALESCE(v_lead.budget_max, v_lead.budget_min)
      ELSE NULL
    END,
    v_lead.next_followup_at
  )
  RETURNING * INTO v_client;

  PERFORM public.assign_client_registration_number(v_client.id);
  PERFORM public.sync_client_profile_from_client(v_client.id);

  UPDATE public.call_queue_items
     SET status = 'enrolled',
         lead_status = 'converted',
         updated_at = now()
   WHERE lead_id = _lead_id
     AND status IN ('queued', 'calling', 'callback');

  SELECT * INTO v_client FROM public.clients WHERE id = v_client.id;

  RETURN jsonb_build_object(
    'client_id', v_client.id,
    'registration_number', v_client.registration_number,
    'already_converted', false
  );
END;
$$;

REVOKE ALL ON FUNCTION public.convert_lead_to_client(uuid, jsonb) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.convert_lead_to_client(uuid, jsonb) TO authenticated;

NOTIFY pgrst, 'reload schema';
