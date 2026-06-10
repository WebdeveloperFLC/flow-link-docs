-- MBBS Saba: seed application / immigration form links (standalone fix)
-- library_id: b2000001-0001-4000-8000-0000000000d1
--
-- Run this if application_forms count is 0 after 20260611152000_mbbs_saba_parity.sql.
-- Common cause: the first parity run failed on submission_checklist and rolled back
-- the whole transaction (including visa form inserts).
--
-- Prerequisites:
--   20260607120000_service_library_visa_form_files.sql  (table)
--   20260611150000_mbbs_saba_university.sql           (library row)

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'service_library_visa_form_files'
  ) THEN
    RAISE EXCEPTION 'Missing table service_library_visa_form_files — run 20260607120000_service_library_visa_form_files.sql first';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM public.service_library WHERE id = 'b2000001-0001-4000-8000-0000000000d1'
  ) THEN
    RAISE EXCEPTION 'Missing Saba MBBS library row — run 20260611150000_mbbs_saba_university.sql first';
  END IF;
END $$;

DELETE FROM public.service_library_visa_form_files
WHERE library_id = 'b2000001-0001-4000-8000-0000000000d1';

INSERT INTO public.service_library_visa_form_files
  (library_id, form_code, file_name, file_path, mime_type, sort_order, version, is_current, notes)
VALUES
  (
    'b2000001-0001-4000-8000-0000000000d1',
    'SUSOM Apply',
    'SUSOM online application — How to apply',
    'https://www.saba.edu/admissions/how-to-apply/',
    'text/html',
    1,
    1,
    true,
    'Create account on SUSOM application portal · rolling admissions Jan/May/Sep'
  ),
  (
    'b2000001-0001-4000-8000-0000000000d1',
    'Requirements',
    'Admissions requirements',
    'https://www.saba.edu/admissions/admissions-requirements/',
    'text/html',
    2,
    1,
    true,
    'Verify eligibility before quoting clients'
  ),
  (
    'b2000001-0001-4000-8000-0000000000d1',
    'Tuition',
    'Tuition and fees (official)',
    'https://www.saba.edu/admissions/tuition-and-fees/',
    'text/html',
    3,
    1,
    true,
    'Always quote from official fee page'
  ),
  (
    'b2000001-0001-4000-8000-0000000000d1',
    'IND',
    'Netherlands immigration — IND (Caribbean Netherlands context)',
    'https://ind.nl/en',
    'text/html',
    4,
    1,
    true,
    'Student residence for Saba basic-science years — verify current rules'
  ),
  (
    'b2000001-0001-4000-8000-0000000000d1',
    'DS-160',
    'US Nonimmigrant Visa Application (DS-160)',
    'https://ceac.state.gov/genniv/',
    'text/html',
    5,
    1,
    true,
    'US clinical rotation years — case-specific visa strategy'
  ),
  (
    'b2000001-0001-4000-8000-0000000000d1',
    'NMC',
    'NMC India — foreign medical graduates',
    'https://www.nmc.org.in/',
    'text/html',
    6,
    1,
    true,
    'Verify institution on NMC list · FMGE/NExT pathway for India practice'
  );

-- Verify (expect application_forms = 6)
SELECT count(*) AS application_forms
FROM public.service_library_visa_form_files
WHERE library_id = 'b2000001-0001-4000-8000-0000000000d1'
  AND is_current;
