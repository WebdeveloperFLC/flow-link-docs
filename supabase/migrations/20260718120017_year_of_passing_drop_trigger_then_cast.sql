-- Repair: year_of_passing ALTER blocked by clients_sync_client_profile trigger (0A000).
-- Drop trigger → convert int→date → fix profile sync mapping → recreate trigger.

DROP TRIGGER IF EXISTS clients_sync_client_profile ON public.clients;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
      FROM information_schema.columns
     WHERE table_schema = 'public'
       AND table_name = 'clients'
       AND column_name = 'year_of_passing'
       AND udt_name = 'int4'
  ) THEN
    ALTER TABLE public.clients
      ALTER COLUMN year_of_passing TYPE date
      USING (
        CASE
          WHEN year_of_passing IS NULL THEN NULL
          ELSE make_date(year_of_passing, 6, 30)
        END
      );
  END IF;
END $$;

-- graduation_year on client_profile is int; map from clients.year_of_passing (date).
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
    client_id,
    date_of_birth,
    gender,
    marital_status,
    nationality,
    passport_number,
    passport_expiry,
    address_country,
    spouse_name,
    highest_qualification,
    institution_name,
    graduation_year,
    gpa_or_percentage
  )
  VALUES (
    _client_id,
    c.date_of_birth,
    c.gender,
    c.marital_status,
    c.country_of_citizenship,
    c.passport_number,
    c.passport_expiry,
    c.country_of_residence,
    spouse,
    c.last_education,
    c.institution_name,
    CASE WHEN c.year_of_passing IS NULL THEN NULL ELSE EXTRACT(YEAR FROM c.year_of_passing)::int END,
    c.percentage_cgpa
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
    updated_at = now()
  WHERE
    public.client_profile.date_of_birth IS NULL
    OR public.client_profile.gender IS NULL OR public.client_profile.gender = ''
    OR public.client_profile.marital_status IS NULL OR public.client_profile.marital_status = ''
    OR public.client_profile.nationality IS NULL OR public.client_profile.nationality = ''
    OR public.client_profile.passport_number IS NULL OR public.client_profile.passport_number = ''
    OR public.client_profile.passport_expiry IS NULL
    OR public.client_profile.address_country IS NULL OR public.client_profile.address_country = ''
    OR public.client_profile.spouse_name IS NULL OR public.client_profile.spouse_name = ''
    OR public.client_profile.highest_qualification IS NULL OR public.client_profile.highest_qualification = ''
    OR public.client_profile.institution_name IS NULL OR public.client_profile.institution_name = ''
    OR public.client_profile.graduation_year IS NULL
    OR public.client_profile.gpa_or_percentage IS NULL OR public.client_profile.gpa_or_percentage = '';
END;
$$;

CREATE TRIGGER clients_sync_client_profile
  AFTER INSERT OR UPDATE OF
    date_of_birth, gender, marital_status, country_of_citizenship, country_of_residence,
    passport_number, passport_expiry, last_education, institution_name, year_of_passing, percentage_cgpa
  ON public.clients
  FOR EACH ROW
  EXECUTE FUNCTION public.trg_sync_client_profile_from_client();
