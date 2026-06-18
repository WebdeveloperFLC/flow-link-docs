-- Extend client_profile sync to carry english tests, other tests, and work experience from clients JSON.

DROP TRIGGER IF EXISTS clients_sync_client_profile ON public.clients;

CREATE OR REPLACE FUNCTION public.sync_client_profile_from_client(_client_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  c public.clients%ROWTYPE;
  spouse text;
  v_employer text;
  v_job_title text;
  v_gre numeric;
  v_gmat numeric;
  v_ielts_overall numeric;
  v_ielts_listening numeric;
  v_ielts_reading numeric;
  v_ielts_writing numeric;
  v_ielts_speaking numeric;
  v_pte numeric;
  v_toefl numeric;
  v_duolingo numeric;
BEGIN
  SELECT * INTO c FROM public.clients WHERE id = _client_id;
  IF NOT FOUND THEN
    RETURN;
  END IF;

  SELECT trim(concat_ws(' ', fm.first_name, fm.last_name))
    INTO spouse
    FROM public.client_family_members fm
   WHERE fm.primary_client_id = _client_id
     AND fm.relationship = 'spouse'
   ORDER BY fm.created_at
   LIMIT 1;

  SELECT NULLIF(trim(x->>'company'), '')
    INTO v_employer
    FROM jsonb_array_elements(COALESCE(c.work_experience, '[]'::jsonb)) x
   LIMIT 1;

  SELECT NULLIF(trim(x->>'role'), '')
    INTO v_job_title
    FROM jsonb_array_elements(COALESCE(c.work_experience, '[]'::jsonb)) x
   LIMIT 1;

  SELECT NULLIF(trim(x->>'score'), '')::numeric
    INTO v_gre
    FROM jsonb_array_elements(COALESCE(c.other_tests, '[]'::jsonb)) x
   WHERE upper(coalesce(x->>'type', '')) = 'GRE'
   LIMIT 1;

  SELECT NULLIF(trim(x->>'score'), '')::numeric
    INTO v_gmat
    FROM jsonb_array_elements(COALESCE(c.other_tests, '[]'::jsonb)) x
   WHERE upper(coalesce(x->>'type', '')) = 'GMAT'
   LIMIT 1;

  IF upper(coalesce(c.english_test, '')) IN ('IELTS', 'CELPIP') THEN
    v_ielts_overall := NULLIF(trim(c.english_overall), '')::numeric;
    v_ielts_listening := NULLIF(trim(c.english_sections->>'listening'), '')::numeric;
    v_ielts_reading := NULLIF(trim(c.english_sections->>'reading'), '')::numeric;
    v_ielts_writing := NULLIF(trim(c.english_sections->>'writing'), '')::numeric;
    v_ielts_speaking := NULLIF(trim(c.english_sections->>'speaking'), '')::numeric;
  ELSIF upper(coalesce(c.english_test, '')) = 'PTE' THEN
    v_pte := NULLIF(trim(c.english_overall), '')::numeric;
  ELSIF upper(coalesce(c.english_test, '')) = 'TOEFL' THEN
    v_toefl := NULLIF(trim(c.english_overall), '')::numeric;
  ELSIF upper(coalesce(c.english_test, '')) IN ('DUOLINGO', 'DUO LINGO') THEN
    v_duolingo := NULLIF(trim(c.english_overall), '')::numeric;
  END IF;

  INSERT INTO public.client_profile (
    client_id, date_of_birth, gender, marital_status, nationality,
    passport_number, passport_expiry, address_country, spouse_name,
    highest_qualification, institution_name, graduation_year, gpa_or_percentage,
    sponsor, sponsor_other, start_timeline, has_budget, budget_currency,
    budget_min, budget_max, interested_countries, lead_source, counselor_notes,
    ielts_overall, ielts_listening, ielts_reading, ielts_writing, ielts_speaking, ielts_test_date,
    pte_score, toefl_score, duolingo_score, gre_score, gmat_score,
    employer_name, job_title
  )
  VALUES (
    _client_id, c.date_of_birth, c.gender, c.marital_status, c.country_of_citizenship,
    c.passport_number, c.passport_expiry, c.country_of_residence, spouse,
    c.last_education, c.institution_name,
    CASE WHEN c.year_of_passing IS NULL THEN NULL ELSE EXTRACT(YEAR FROM c.year_of_passing)::int END,
    c.percentage_cgpa,
    c.sponsor, c.sponsor_other, c.start_timeline, c.has_budget, c.budget_currency,
    c.budget_min, c.budget_max,
    COALESCE(c.interested_countries, '{}'::text[]),
    c.lead_source, c.counselor_notes,
    v_ielts_overall, v_ielts_listening, v_ielts_reading, v_ielts_writing, v_ielts_speaking, c.english_test_date,
    v_pte, v_toefl, v_duolingo, v_gre, v_gmat,
    v_employer, v_job_title
  )
  ON CONFLICT (client_id) DO UPDATE SET
    date_of_birth = COALESCE(public.client_profile.date_of_birth, EXCLUDED.date_of_birth),
    gender = COALESCE(NULLIF(public.client_profile.gender, ''), EXCLUDED.gender),
    marital_status = COALESCE(NULLIF(public.client_profile.marital_status, ''), EXCLUDED.marital_status),
    nationality = COALESCE(NULLIF(public.client_profile.nationality, ''), EXCLUDED.nationality),
    passport_number = COALESCE(NULLIF(public.client_profile.passport_number, ''), EXCLUDED.passport_number),
    passport_expiry = COALESCE(public.client_profile.passport_expiry, EXCLUDED.passport_expiry),
    address_country = COALESCE(NULLIF(public.client_profile.address_country, ''), EXCLUDED.address_country),
    spouse_name = COALESCE(NULLIF(public.client_profile.spouse_name, ''), EXCLUDED.spouse_name),
    highest_qualification = COALESCE(NULLIF(public.client_profile.highest_qualification, ''), EXCLUDED.highest_qualification),
    institution_name = COALESCE(NULLIF(public.client_profile.institution_name, ''), EXCLUDED.institution_name),
    graduation_year = COALESCE(public.client_profile.graduation_year, EXCLUDED.graduation_year),
    gpa_or_percentage = COALESCE(NULLIF(public.client_profile.gpa_or_percentage, ''), EXCLUDED.gpa_or_percentage),
    sponsor = COALESCE(NULLIF(public.client_profile.sponsor, ''), EXCLUDED.sponsor),
    sponsor_other = COALESCE(NULLIF(public.client_profile.sponsor_other, ''), EXCLUDED.sponsor_other),
    start_timeline = COALESCE(NULLIF(public.client_profile.start_timeline, ''), EXCLUDED.start_timeline),
    has_budget = COALESCE(NULLIF(public.client_profile.has_budget, ''), EXCLUDED.has_budget),
    budget_currency = COALESCE(NULLIF(public.client_profile.budget_currency, ''), EXCLUDED.budget_currency),
    budget_min = COALESCE(public.client_profile.budget_min, EXCLUDED.budget_min),
    budget_max = COALESCE(public.client_profile.budget_max, EXCLUDED.budget_max),
    interested_countries = CASE
      WHEN COALESCE(array_length(public.client_profile.interested_countries, 1), 0) = 0
        THEN EXCLUDED.interested_countries
      ELSE public.client_profile.interested_countries
    END,
    lead_source = COALESCE(NULLIF(public.client_profile.lead_source, ''), EXCLUDED.lead_source),
    counselor_notes = COALESCE(NULLIF(public.client_profile.counselor_notes, ''), EXCLUDED.counselor_notes),
    ielts_overall = COALESCE(public.client_profile.ielts_overall, EXCLUDED.ielts_overall),
    ielts_listening = COALESCE(public.client_profile.ielts_listening, EXCLUDED.ielts_listening),
    ielts_reading = COALESCE(public.client_profile.ielts_reading, EXCLUDED.ielts_reading),
    ielts_writing = COALESCE(public.client_profile.ielts_writing, EXCLUDED.ielts_writing),
    ielts_speaking = COALESCE(public.client_profile.ielts_speaking, EXCLUDED.ielts_speaking),
    ielts_test_date = COALESCE(public.client_profile.ielts_test_date, EXCLUDED.ielts_test_date),
    pte_score = COALESCE(public.client_profile.pte_score, EXCLUDED.pte_score),
    toefl_score = COALESCE(public.client_profile.toefl_score, EXCLUDED.toefl_score),
    duolingo_score = COALESCE(public.client_profile.duolingo_score, EXCLUDED.duolingo_score),
    gre_score = COALESCE(public.client_profile.gre_score, EXCLUDED.gre_score),
    gmat_score = COALESCE(public.client_profile.gmat_score, EXCLUDED.gmat_score),
    employer_name = COALESCE(NULLIF(public.client_profile.employer_name, ''), EXCLUDED.employer_name),
    job_title = COALESCE(NULLIF(public.client_profile.job_title, ''), EXCLUDED.job_title),
    updated_at = now();
END;
$$;

CREATE TRIGGER clients_sync_client_profile
  AFTER INSERT OR UPDATE OF
    date_of_birth, gender, marital_status, country_of_citizenship, country_of_residence,
    passport_number, passport_expiry, last_education, institution_name, year_of_passing,
    percentage_cgpa, sponsor, sponsor_other, start_timeline, has_budget, budget_currency,
    budget_min, budget_max, interested_countries, lead_source, counselor_notes,
    english_test, english_overall, english_test_date, english_test_expiry, english_sections,
    other_tests, education_history, work_experience
  ON public.clients
  FOR EACH ROW
  EXECUTE FUNCTION public.trg_sync_client_profile_from_client();

NOTIFY pgrst, 'reload schema';
