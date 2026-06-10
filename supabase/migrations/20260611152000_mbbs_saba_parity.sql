-- MBBS Saba: checklist download, application forms, submission tracker (visa parity)
-- library_id: b2000001-0001-4000-8000-0000000000d1
-- Run after frontend deploy (public/specimens/checklists/mbbs-saba-university.html)

-- Branded downloadable checklist
INSERT INTO public.service_library_checklist_files
  (library_id, file_name, file_path, mime_type, size_bytes, version, is_current, notes)
SELECT
  'b2000001-0001-4000-8000-0000000000d1'::uuid,
  'Saba University School of Medicine — Caribbean — Document Checklist.html',
  '/specimens/checklists/mbbs-saba-university.html',
  'text/html',
  113066,
  1,
  true,
  'Future Link branded checklist — fields auto-fill when linked to client'
WHERE NOT EXISTS (
  SELECT 1 FROM public.service_library_checklist_files c
  WHERE c.library_id = 'b2000001-0001-4000-8000-0000000000d1'
    AND c.file_path = '/specimens/checklists/mbbs-saba-university.html'
    AND c.is_current = true
);

UPDATE public.service_library_checklist_files
SET is_current = true, updated_at = now()
WHERE library_id = 'b2000001-0001-4000-8000-0000000000d1'
  AND file_path = '/specimens/checklists/mbbs-saba-university.html';

-- Application / immigration forms (online portals)
INSERT INTO public.service_library_visa_form_files
  (library_id, form_code, file_name, file_path, mime_type, sort_order, version, is_current, notes)
SELECT v.library_id, v.form_code, v.file_name, v.file_path, v.mime_type, v.sort_order, v.version, v.is_current, v.notes
FROM (VALUES
  ('b2000001-0001-4000-8000-0000000000d1'::uuid, 'SUSOM Apply', 'SUSOM online application — How to apply', 'https://www.saba.edu/admissions/how-to-apply/', 'text/html', 1, 1, true, 'Create account on SUSOM application portal · rolling admissions Jan/May/Sep'),
  ('b2000001-0001-4000-8000-0000000000d1'::uuid, 'Requirements', 'Admissions requirements', 'https://www.saba.edu/admissions/admissions-requirements/', 'text/html', 2, 1, true, 'Verify eligibility before quoting clients'),
  ('b2000001-0001-4000-8000-0000000000d1'::uuid, 'Tuition', 'Tuition and fees (official)', 'https://www.saba.edu/admissions/tuition-and-fees/', 'text/html', 3, 1, true, 'Always quote from official fee page'),
  ('b2000001-0001-4000-8000-0000000000d1'::uuid, 'IND', 'Netherlands immigration — IND (Caribbean Netherlands context)', 'https://ind.nl/en', 'text/html', 4, 1, true, 'Student residence for Saba basic-science years — verify current rules'),
  ('b2000001-0001-4000-8000-0000000000d1'::uuid, 'DS-160', 'US Nonimmigrant Visa Application (DS-160)', 'https://ceac.state.gov/genniv/', 'text/html', 5, 1, true, 'US clinical rotation years — case-specific visa strategy'),
  ('b2000001-0001-4000-8000-0000000000d1'::uuid, 'NMC', 'NMC India — foreign medical graduates', 'https://www.nmc.org.in/', 'text/html', 6, 1, true, 'Verify institution on NMC list · FMGE/NExT pathway for India practice')
) AS v(library_id, form_code, file_name, file_path, mime_type, sort_order, version, is_current, notes)
WHERE NOT EXISTS (
  SELECT 1 FROM public.service_library_visa_form_files f
  WHERE f.library_id = v.library_id AND f.form_code = v.form_code AND f.file_path = v.file_path AND f.is_current = true
);

UPDATE public.service_library_visa_form_files f
SET is_current = true, updated_at = now()
FROM (VALUES
  ('b2000001-0001-4000-8000-0000000000d1'::uuid, 'SUSOM Apply', 'https://www.saba.edu/admissions/how-to-apply/'),
  ('b2000001-0001-4000-8000-0000000000d1'::uuid, 'Requirements', 'https://www.saba.edu/admissions/admissions-requirements/'),
  ('b2000001-0001-4000-8000-0000000000d1'::uuid, 'Tuition', 'https://www.saba.edu/admissions/tuition-and-fees/'),
  ('b2000001-0001-4000-8000-0000000000d1'::uuid, 'IND', 'https://ind.nl/en'),
  ('b2000001-0001-4000-8000-0000000000d1'::uuid, 'DS-160', 'https://ceac.state.gov/genniv/'),
  ('b2000001-0001-4000-8000-0000000000d1'::uuid, 'NMC', 'https://www.nmc.org.in/')
) AS v(library_id, form_code, file_path)
WHERE f.library_id = v.library_id AND f.form_code = v.form_code AND f.file_path = v.file_path;

-- Submission tracker (Checklist tab interactive list)
INSERT INTO public.service_library_submission_checklist
  (library_id, item_key, item_label, is_mandatory, sort_order, is_active)
SELECT 'b2000001-0001-4000-8000-0000000000d1'::uuid, x.item_key, x.item_label, x.is_mandatory, x.sort_order, true
FROM (VALUES
  ('susom_application', 'SUSOM online application submitted', true, 1),
  ('transcripts', 'Official transcripts collected', true, 2),
  ('neet_nmc', 'NEET / NMC rules verified (Indian applicants)', false, 3),
  ('lor_personal', 'Personal statement & letters of recommendation', true, 4),
  ('admission_letter', 'Admission / enrollment letter received', true, 5),
  ('tuition_proof', 'Tuition payment or financial guarantee', true, 6),
  ('saba_visa', 'Saba / Dutch Caribbean student visa filed', true, 7),
  ('insurance', 'Health insurance proof', true, 8),
  ('us_clinical_plan', 'US clinical-year visa strategy documented', false, 9),
  ('fees_collected', 'Consultancy fee collected (separate from tuition)', true, 10),
  ('client_approval', 'Client approval on final file', true, 11),
  ('quality_review', 'Quality review sign-off', true, 12)
) AS x(item_key, item_label, is_mandatory, sort_order)
WHERE NOT EXISTS (
  SELECT 1 FROM public.service_library_submission_checklist c
  WHERE c.library_id = 'b2000001-0001-4000-8000-0000000000d1'::uuid AND c.item_key = x.item_key
);

-- Fix broken accreditation URLs in stored metadata
UPDATE public.service_library
SET academy_metadata = jsonb_set(
  academy_metadata,
  '{resources}',
  (
    SELECT jsonb_agg(
      CASE
        WHEN elem->>'url' LIKE '%accreditation-and-approvals%'
        THEN jsonb_set(elem, '{url}', '"https://www.saba.edu/why-saba/"')
        ELSE elem
      END
    )
    FROM jsonb_array_elements(academy_metadata->'resources') AS elem
  ),
  true
),
updated_at = now()
WHERE id = 'b2000001-0001-4000-8000-0000000000d1'
  AND academy_metadata->'resources' IS NOT NULL;
