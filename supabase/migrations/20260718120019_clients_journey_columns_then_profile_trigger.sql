-- Fix: 20260718120018 trigger failed when clients.sponsor missing (20260718120015 not applied).
-- Safe to re-run after a partial 18 failure.

ALTER TABLE public.leads
  ADD COLUMN IF NOT EXISTS sponsor text,
  ADD COLUMN IF NOT EXISTS sponsor_other text,
  ADD COLUMN IF NOT EXISTS has_budget text,
  ADD COLUMN IF NOT EXISTS budget_currency text DEFAULT 'INR',
  ADD COLUMN IF NOT EXISTS budget_min numeric,
  ADD COLUMN IF NOT EXISTS budget_max numeric;

ALTER TABLE public.clients
  ADD COLUMN IF NOT EXISTS sponsor text,
  ADD COLUMN IF NOT EXISTS sponsor_other text,
  ADD COLUMN IF NOT EXISTS has_budget text,
  ADD COLUMN IF NOT EXISTS budget_currency text DEFAULT 'INR',
  ADD COLUMN IF NOT EXISTS budget_min numeric,
  ADD COLUMN IF NOT EXISTS budget_max numeric,
  ADD COLUMN IF NOT EXISTS start_timeline text,
  ADD COLUMN IF NOT EXISTS phone_alternate_country_code text;

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

  INSERT INTO public.client_profile (
    client_id, date_of_birth, gender, marital_status, nationality,
    passport_number, passport_expiry, address_country, spouse_name,
    highest_qualification, institution_name, graduation_year, gpa_or_percentage,
    sponsor, sponsor_other, start_timeline, has_budget, budget_currency,
    budget_min, budget_max, interested_countries, lead_source, counselor_notes
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
    c.lead_source, c.counselor_notes
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
    updated_at = now();
END;
$$;

CREATE TRIGGER clients_sync_client_profile
  AFTER INSERT OR UPDATE OF
    date_of_birth, gender, marital_status, country_of_citizenship, country_of_residence,
    passport_number, passport_expiry, last_education, institution_name, year_of_passing,
    percentage_cgpa, sponsor, sponsor_other, start_timeline, has_budget, budget_currency,
    budget_min, budget_max, interested_countries, lead_source, counselor_notes
  ON public.clients
  FOR EACH ROW
  EXECUTE FUNCTION public.trg_sync_client_profile_from_client();

DO $$
DECLARE cid uuid;
BEGIN
  FOR cid IN SELECT id FROM public.clients LOOP
    PERFORM public.sync_client_profile_from_client(cid);
  END LOOP;
END;
$$;
