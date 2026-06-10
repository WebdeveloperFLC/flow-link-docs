-- MBBS institutions parity — checklist files, application forms, submission tracker
-- Run after frontend deploy (public/specimens/checklists/mbbs-*.html)
-- Update size_bytes in checklist_files after generating HTML (optional)


-- Synergy University (b2000001-0001-4000-8000-0000000000d2)
INSERT INTO public.service_library_checklist_files
  (library_id, file_name, file_path, mime_type, size_bytes, version, is_current, notes)
SELECT
  'b2000001-0001-4000-8000-0000000000d2'::uuid,
  'Synergy University — Russia — Document Checklist.html',
  '/specimens/checklists/mbbs-synergy-university.html',
  'text/html',
  111193,
  1,
  true,
  'Future Link branded checklist — fields auto-fill when linked to client'
WHERE NOT EXISTS (
  SELECT 1 FROM public.service_library_checklist_files c
  WHERE c.library_id = 'b2000001-0001-4000-8000-0000000000d2'::uuid
    AND c.file_path = '/specimens/checklists/mbbs-synergy-university.html'
    AND c.is_current = true
);

UPDATE public.service_library_checklist_files
SET is_current = true, updated_at = now()
WHERE library_id = 'b2000001-0001-4000-8000-0000000000d2'::uuid
  AND file_path = '/specimens/checklists/mbbs-synergy-university.html';

DELETE FROM public.service_library_visa_form_files
WHERE library_id = 'b2000001-0001-4000-8000-0000000000d2'::uuid;

INSERT INTO public.service_library_visa_form_files
  (library_id, form_code, file_name, file_path, mime_type, sort_order, version, is_current, notes)
VALUES
  ('b2000001-0001-4000-8000-0000000000d2', 'Apply', 'Admissions office — apply online', 'https://synergy.ru/abiturientam/priemnaya_komissiya', 'text/html', 1, 1, true, 'Official link — verify current version before client use'),
  ('b2000001-0001-4000-8000-0000000000d2', 'Requirements', 'Medical faculty — programmes & requirements', 'https://synergy.ru/abiturientam/faculties/medicine', 'text/html', 2, 1, true, 'Official link — verify current version before client use'),
  ('b2000001-0001-4000-8000-0000000000d2', 'Tuition', 'Medical Doctor programme — fees', 'https://synergy.ru/abiturientam/programmyi_obucheniya/medical_doctor', 'text/html', 3, 1, true, 'Official link — verify current version before client use'),
  ('b2000001-0001-4000-8000-0000000000d2', 'Visa', 'Russian student visa — consulate guidance (India)', 'https://india.mid.ru/en/visa/', 'text/html', 4, 1, true, 'Official link — verify current version before client use'),
  ('b2000001-0001-4000-8000-0000000000d2', 'NMC', 'NMC India — foreign medical graduates', 'https://www.nmc.org.in/', 'text/html', 5, 1, true, 'Official link — verify current version before client use');

INSERT INTO public.service_library_submission_checklist
  (library_id, item_key, item_label, is_mandatory, sort_order, is_active)
SELECT 'b2000001-0001-4000-8000-0000000000d2'::uuid, x.item_key, x.item_label, x.is_mandatory, x.sort_order, true
FROM (VALUES
  ('synergy_univ_application', 'Synergy application submitted', true, 1),
  ('synergy_univ_transcripts', 'Official transcripts collected', true, 2),
  ('synergy_univ_neet_nmc', 'NEET / NMC rules verified (Indian applicants)', false, 3),
  ('synergy_univ_lor_personal', 'Personal statement & letters of recommendation', true, 4),
  ('synergy_univ_admission_letter', 'Admission / enrollment letter received', true, 5),
  ('synergy_univ_tuition_proof', 'Tuition payment or financial guarantee', true, 6),
  ('synergy_univ_visa', 'Russia student visa / permit filed', true, 7),
  ('synergy_univ_insurance', 'Health insurance proof', true, 8),
  ('synergy_univ_clinical_plan', 'Clinical-year / licensing strategy documented', false, 9),
  ('synergy_univ_fees_collected', 'Consultancy fee collected (separate from tuition)', true, 10),
  ('synergy_univ_client_approval', 'Client approval on final file', true, 11),
  ('synergy_univ_quality_review', 'Quality review sign-off', true, 12)
) AS x(item_key, item_label, is_mandatory, sort_order)
WHERE NOT EXISTS (
  SELECT 1 FROM public.service_library_submission_checklist c
  WHERE c.library_id = 'b2000001-0001-4000-8000-0000000000d2'::uuid AND c.item_key = x.item_key
);


-- Medical University of the Americas (b2000001-0001-4000-8000-0000000000d3)
INSERT INTO public.service_library_checklist_files
  (library_id, file_name, file_path, mime_type, size_bytes, version, is_current, notes)
SELECT
  'b2000001-0001-4000-8000-0000000000d3'::uuid,
  'Medical University of the Americas — Caribbean — Document Checklist.html',
  '/specimens/checklists/mbbs-medical-university-americas.html',
  'text/html',
  112598,
  1,
  true,
  'Future Link branded checklist — fields auto-fill when linked to client'
WHERE NOT EXISTS (
  SELECT 1 FROM public.service_library_checklist_files c
  WHERE c.library_id = 'b2000001-0001-4000-8000-0000000000d3'::uuid
    AND c.file_path = '/specimens/checklists/mbbs-medical-university-americas.html'
    AND c.is_current = true
);

UPDATE public.service_library_checklist_files
SET is_current = true, updated_at = now()
WHERE library_id = 'b2000001-0001-4000-8000-0000000000d3'::uuid
  AND file_path = '/specimens/checklists/mbbs-medical-university-americas.html';

DELETE FROM public.service_library_visa_form_files
WHERE library_id = 'b2000001-0001-4000-8000-0000000000d3'::uuid;

INSERT INTO public.service_library_visa_form_files
  (library_id, form_code, file_name, file_path, mime_type, sort_order, version, is_current, notes)
VALUES
  ('b2000001-0001-4000-8000-0000000000d3', 'Apply', 'MUA admissions — apply online', 'https://www.mua.edu/admissions', 'text/html', 1, 1, true, 'Official link — verify current version before client use'),
  ('b2000001-0001-4000-8000-0000000000d3', 'Requirements', 'Admission requirements', 'https://www.mua.edu/admissions/admission-requirements', 'text/html', 2, 1, true, 'Official link — verify current version before client use'),
  ('b2000001-0001-4000-8000-0000000000d3', 'Tuition', 'Tuition and fees (official)', 'https://www.mua.edu/admissions/tuition-and-fees', 'text/html', 3, 1, true, 'Official link — verify current version before client use'),
  ('b2000001-0001-4000-8000-0000000000d3', 'Nevis', 'St Kitts & Nevis — immigration (verify student permit rules)', 'https://www.gov.kn/', 'text/html', 4, 1, true, 'Official link — verify current version before client use'),
  ('b2000001-0001-4000-8000-0000000000d3', 'DS-160', 'US Nonimmigrant Visa Application (DS-160)', 'https://ceac.state.gov/genniv/', 'text/html', 5, 1, true, 'Official link — verify current version before client use'),
  ('b2000001-0001-4000-8000-0000000000d3', 'NMC', 'NMC India — foreign medical graduates', 'https://www.nmc.org.in/', 'text/html', 6, 1, true, 'Official link — verify current version before client use');

INSERT INTO public.service_library_submission_checklist
  (library_id, item_key, item_label, is_mandatory, sort_order, is_active)
SELECT 'b2000001-0001-4000-8000-0000000000d3'::uuid, x.item_key, x.item_label, x.is_mandatory, x.sort_order, true
FROM (VALUES
  ('medical_univ_application', 'MUA application submitted', true, 1),
  ('medical_univ_transcripts', 'Official transcripts collected', true, 2),
  ('medical_univ_neet_nmc', 'NEET / NMC rules verified (Indian applicants)', false, 3),
  ('medical_univ_lor_personal', 'Personal statement & letters of recommendation', true, 4),
  ('medical_univ_admission_letter', 'Admission / enrollment letter received', true, 5),
  ('medical_univ_tuition_proof', 'Tuition payment or financial guarantee', true, 6),
  ('medical_univ_visa', 'Nevis student visa / permit filed', true, 7),
  ('medical_univ_insurance', 'Health insurance proof', true, 8),
  ('medical_univ_clinical_plan', 'Clinical-year / licensing strategy documented', false, 9),
  ('medical_univ_fees_collected', 'Consultancy fee collected (separate from tuition)', true, 10),
  ('medical_univ_client_approval', 'Client approval on final file', true, 11),
  ('medical_univ_quality_review', 'Quality review sign-off', true, 12)
) AS x(item_key, item_label, is_mandatory, sort_order)
WHERE NOT EXISTS (
  SELECT 1 FROM public.service_library_submission_checklist c
  WHERE c.library_id = 'b2000001-0001-4000-8000-0000000000d3'::uuid AND c.item_key = x.item_key
);


-- St. Matthew's University School of Medicine (b2000001-0001-4000-8000-0000000000d4)
INSERT INTO public.service_library_checklist_files
  (library_id, file_name, file_path, mime_type, size_bytes, version, is_current, notes)
SELECT
  'b2000001-0001-4000-8000-0000000000d4'::uuid,
  'St. Matthew''s University — Caribbean — Document Checklist.html',
  '/specimens/checklists/mbbs-st-matthews-university.html',
  'text/html',
  112651,
  1,
  true,
  'Future Link branded checklist — fields auto-fill when linked to client'
WHERE NOT EXISTS (
  SELECT 1 FROM public.service_library_checklist_files c
  WHERE c.library_id = 'b2000001-0001-4000-8000-0000000000d4'::uuid
    AND c.file_path = '/specimens/checklists/mbbs-st-matthews-university.html'
    AND c.is_current = true
);

UPDATE public.service_library_checklist_files
SET is_current = true, updated_at = now()
WHERE library_id = 'b2000001-0001-4000-8000-0000000000d4'::uuid
  AND file_path = '/specimens/checklists/mbbs-st-matthews-university.html';

DELETE FROM public.service_library_visa_form_files
WHERE library_id = 'b2000001-0001-4000-8000-0000000000d4'::uuid;

INSERT INTO public.service_library_visa_form_files
  (library_id, form_code, file_name, file_path, mime_type, sort_order, version, is_current, notes)
VALUES
  ('b2000001-0001-4000-8000-0000000000d4', 'Apply', 'SMUSOM — how to apply', 'https://medicine.stmatthews.edu/admissions/how-to-apply', 'text/html', 1, 1, true, 'Official link — verify current version before client use'),
  ('b2000001-0001-4000-8000-0000000000d4', 'Requirements', 'Admission requirements', 'https://medicine.stmatthews.edu/admissions/how-to-apply/admissions-requirements', 'text/html', 2, 1, true, 'Official link — verify current version before client use'),
  ('b2000001-0001-4000-8000-0000000000d4', 'Tuition', 'Tuition and fees (official)', 'https://medicine.stmatthews.edu/admissions/tuition-and-fees', 'text/html', 3, 1, true, 'Official link — verify current version before client use'),
  ('b2000001-0001-4000-8000-0000000000d4', 'Cayman', 'Cayman Islands immigration — student permits', 'https://www.immigration.gov.ky/', 'text/html', 4, 1, true, 'Official link — verify current version before client use'),
  ('b2000001-0001-4000-8000-0000000000d4', 'DS-160', 'US Nonimmigrant Visa Application (DS-160)', 'https://ceac.state.gov/genniv/', 'text/html', 5, 1, true, 'Official link — verify current version before client use'),
  ('b2000001-0001-4000-8000-0000000000d4', 'NMC', 'NMC India — foreign medical graduates', 'https://www.nmc.org.in/', 'text/html', 6, 1, true, 'Official link — verify current version before client use');

INSERT INTO public.service_library_submission_checklist
  (library_id, item_key, item_label, is_mandatory, sort_order, is_active)
SELECT 'b2000001-0001-4000-8000-0000000000d4'::uuid, x.item_key, x.item_label, x.is_mandatory, x.sort_order, true
FROM (VALUES
  ('st_matthews__application', 'SMUSOM application submitted', true, 1),
  ('st_matthews__transcripts', 'Official transcripts collected', true, 2),
  ('st_matthews__neet_nmc', 'NEET / NMC rules verified (Indian applicants)', false, 3),
  ('st_matthews__lor_personal', 'Personal statement & letters of recommendation', true, 4),
  ('st_matthews__admission_letter', 'Admission / enrollment letter received', true, 5),
  ('st_matthews__tuition_proof', 'Tuition payment or financial guarantee', true, 6),
  ('st_matthews__visa', 'Cayman Islands student visa / permit filed', true, 7),
  ('st_matthews__insurance', 'Health insurance proof', true, 8),
  ('st_matthews__clinical_plan', 'Clinical-year / licensing strategy documented', false, 9),
  ('st_matthews__fees_collected', 'Consultancy fee collected (separate from tuition)', true, 10),
  ('st_matthews__client_approval', 'Client approval on final file', true, 11),
  ('st_matthews__quality_review', 'Quality review sign-off', true, 12)
) AS x(item_key, item_label, is_mandatory, sort_order)
WHERE NOT EXISTS (
  SELECT 1 FROM public.service_library_submission_checklist c
  WHERE c.library_id = 'b2000001-0001-4000-8000-0000000000d4'::uuid AND c.item_key = x.item_key
);


-- Georgian National University SEU (b2000001-0001-4000-8000-0000000000d5)
INSERT INTO public.service_library_checklist_files
  (library_id, file_name, file_path, mime_type, size_bytes, version, is_current, notes)
SELECT
  'b2000001-0001-4000-8000-0000000000d5'::uuid,
  'Georgian National University SEU — Georgia — Document Checklist.html',
  '/specimens/checklists/mbbs-georgian-national-university-seu.html',
  'text/html',
  110794,
  1,
  true,
  'Future Link branded checklist — fields auto-fill when linked to client'
WHERE NOT EXISTS (
  SELECT 1 FROM public.service_library_checklist_files c
  WHERE c.library_id = 'b2000001-0001-4000-8000-0000000000d5'::uuid
    AND c.file_path = '/specimens/checklists/mbbs-georgian-national-university-seu.html'
    AND c.is_current = true
);

UPDATE public.service_library_checklist_files
SET is_current = true, updated_at = now()
WHERE library_id = 'b2000001-0001-4000-8000-0000000000d5'::uuid
  AND file_path = '/specimens/checklists/mbbs-georgian-national-university-seu.html';

DELETE FROM public.service_library_visa_form_files
WHERE library_id = 'b2000001-0001-4000-8000-0000000000d5'::uuid;

INSERT INTO public.service_library_visa_form_files
  (library_id, form_code, file_name, file_path, mime_type, sort_order, version, is_current, notes)
VALUES
  ('b2000001-0001-4000-8000-0000000000d5', 'Apply', 'SEU admissions', 'https://seu.edu.ge/en/admissions', 'text/html', 1, 1, true, 'Official link — verify current version before client use'),
  ('b2000001-0001-4000-8000-0000000000d5', 'Medicine', 'Faculty of Medicine', 'https://seu.edu.ge/en/faculties/medicine', 'text/html', 2, 1, true, 'Official link — verify current version before client use'),
  ('b2000001-0001-4000-8000-0000000000d5', 'Tuition', 'Fees & admissions information', 'https://seu.edu.ge/en/admissions', 'text/html', 3, 1, true, 'Official link — verify current version before client use'),
  ('b2000001-0001-4000-8000-0000000000d5', 'Georgia Visa', 'Georgia long-stay D5 / student visa guidance', 'https://www.geoconsul.gov.ge/en', 'text/html', 4, 1, true, 'Official link — verify current version before client use'),
  ('b2000001-0001-4000-8000-0000000000d5', 'NMC', 'NMC India — foreign medical graduates', 'https://www.nmc.org.in/', 'text/html', 5, 1, true, 'Official link — verify current version before client use');

INSERT INTO public.service_library_submission_checklist
  (library_id, item_key, item_label, is_mandatory, sort_order, is_active)
SELECT 'b2000001-0001-4000-8000-0000000000d5'::uuid, x.item_key, x.item_label, x.is_mandatory, x.sort_order, true
FROM (VALUES
  ('georgian_nat_application', 'SEU application submitted', true, 1),
  ('georgian_nat_transcripts', 'Official transcripts collected', true, 2),
  ('georgian_nat_neet_nmc', 'NEET / NMC rules verified (Indian applicants)', false, 3),
  ('georgian_nat_lor_personal', 'Personal statement & letters of recommendation', true, 4),
  ('georgian_nat_admission_letter', 'Admission / enrollment letter received', true, 5),
  ('georgian_nat_tuition_proof', 'Tuition payment or financial guarantee', true, 6),
  ('georgian_nat_visa', 'Georgia student visa / permit filed', true, 7),
  ('georgian_nat_insurance', 'Health insurance proof', true, 8),
  ('georgian_nat_clinical_plan', 'Clinical-year / licensing strategy documented', false, 9),
  ('georgian_nat_fees_collected', 'Consultancy fee collected (separate from tuition)', true, 10),
  ('georgian_nat_client_approval', 'Client approval on final file', true, 11),
  ('georgian_nat_quality_review', 'Quality review sign-off', true, 12)
) AS x(item_key, item_label, is_mandatory, sort_order)
WHERE NOT EXISTS (
  SELECT 1 FROM public.service_library_submission_checklist c
  WHERE c.library_id = 'b2000001-0001-4000-8000-0000000000d5'::uuid AND c.item_key = x.item_key
);


-- International Black Sea University (b2000001-0001-4000-8000-0000000000d6)
INSERT INTO public.service_library_checklist_files
  (library_id, file_name, file_path, mime_type, size_bytes, version, is_current, notes)
SELECT
  'b2000001-0001-4000-8000-0000000000d6'::uuid,
  'International Black Sea University — Georgia — Document Checklist.html',
  '/specimens/checklists/mbbs-international-black-sea-university.html',
  'text/html',
  110812,
  1,
  true,
  'Future Link branded checklist — fields auto-fill when linked to client'
WHERE NOT EXISTS (
  SELECT 1 FROM public.service_library_checklist_files c
  WHERE c.library_id = 'b2000001-0001-4000-8000-0000000000d6'::uuid
    AND c.file_path = '/specimens/checklists/mbbs-international-black-sea-university.html'
    AND c.is_current = true
);

UPDATE public.service_library_checklist_files
SET is_current = true, updated_at = now()
WHERE library_id = 'b2000001-0001-4000-8000-0000000000d6'::uuid
  AND file_path = '/specimens/checklists/mbbs-international-black-sea-university.html';

DELETE FROM public.service_library_visa_form_files
WHERE library_id = 'b2000001-0001-4000-8000-0000000000d6'::uuid;

INSERT INTO public.service_library_visa_form_files
  (library_id, form_code, file_name, file_path, mime_type, sort_order, version, is_current, notes)
VALUES
  ('b2000001-0001-4000-8000-0000000000d6', 'Apply', 'International admissions (IRO)', 'https://ibsu.edu.ge/iro/admission/', 'text/html', 1, 1, true, 'Official link — verify current version before client use'),
  ('b2000001-0001-4000-8000-0000000000d6', 'Program', 'Medical Doctor programme', 'https://ibsu.edu.ge/en/schools/medical-school/program/medical-program/', 'text/html', 2, 1, true, 'Official link — verify current version before client use'),
  ('b2000001-0001-4000-8000-0000000000d6', 'Medicine School', 'Medicine School overview', 'https://ibsu.edu.ge/en/schools/medical-school/', 'text/html', 3, 1, true, 'Official link — verify current version before client use'),
  ('b2000001-0001-4000-8000-0000000000d6', 'Georgia Visa', 'Georgia consular services — student visa', 'https://www.geoconsul.gov.ge/en', 'text/html', 4, 1, true, 'Official link — verify current version before client use'),
  ('b2000001-0001-4000-8000-0000000000d6', 'NMC', 'NMC India — foreign medical graduates', 'https://www.nmc.org.in/', 'text/html', 5, 1, true, 'Official link — verify current version before client use');

INSERT INTO public.service_library_submission_checklist
  (library_id, item_key, item_label, is_mandatory, sort_order, is_active)
SELECT 'b2000001-0001-4000-8000-0000000000d6'::uuid, x.item_key, x.item_label, x.is_mandatory, x.sort_order, true
FROM (VALUES
  ('internationa_application', 'IBSU application submitted', true, 1),
  ('internationa_transcripts', 'Official transcripts collected', true, 2),
  ('internationa_neet_nmc', 'NEET / NMC rules verified (Indian applicants)', false, 3),
  ('internationa_lor_personal', 'Personal statement & letters of recommendation', true, 4),
  ('internationa_admission_letter', 'Admission / enrollment letter received', true, 5),
  ('internationa_tuition_proof', 'Tuition payment or financial guarantee', true, 6),
  ('internationa_visa', 'Georgia student visa / permit filed', true, 7),
  ('internationa_insurance', 'Health insurance proof', true, 8),
  ('internationa_clinical_plan', 'Clinical-year / licensing strategy documented', false, 9),
  ('internationa_fees_collected', 'Consultancy fee collected (separate from tuition)', true, 10),
  ('internationa_client_approval', 'Client approval on final file', true, 11),
  ('internationa_quality_review', 'Quality review sign-off', true, 12)
) AS x(item_key, item_label, is_mandatory, sort_order)
WHERE NOT EXISTS (
  SELECT 1 FROM public.service_library_submission_checklist c
  WHERE c.library_id = 'b2000001-0001-4000-8000-0000000000d6'::uuid AND c.item_key = x.item_key
);


-- Avicenna Batumi Medical University (b2000001-0001-4000-8000-0000000000d7)
INSERT INTO public.service_library_checklist_files
  (library_id, file_name, file_path, mime_type, size_bytes, version, is_current, notes)
SELECT
  'b2000001-0001-4000-8000-0000000000d7'::uuid,
  'Avicenna Batumi Medical University — Georgia — Document Checklist.html',
  '/specimens/checklists/mbbs-avicenna-batumi.html',
  'text/html',
  110783,
  1,
  true,
  'Future Link branded checklist — fields auto-fill when linked to client'
WHERE NOT EXISTS (
  SELECT 1 FROM public.service_library_checklist_files c
  WHERE c.library_id = 'b2000001-0001-4000-8000-0000000000d7'::uuid
    AND c.file_path = '/specimens/checklists/mbbs-avicenna-batumi.html'
    AND c.is_current = true
);

UPDATE public.service_library_checklist_files
SET is_current = true, updated_at = now()
WHERE library_id = 'b2000001-0001-4000-8000-0000000000d7'::uuid
  AND file_path = '/specimens/checklists/mbbs-avicenna-batumi.html';

DELETE FROM public.service_library_visa_form_files
WHERE library_id = 'b2000001-0001-4000-8000-0000000000d7'::uuid;

INSERT INTO public.service_library_visa_form_files
  (library_id, form_code, file_name, file_path, mime_type, sort_order, version, is_current, notes)
VALUES
  ('b2000001-0001-4000-8000-0000000000d7', 'Apply', 'ABMU admission', 'https://abmu.edu.ge/en/admission', 'text/html', 1, 1, true, 'Official link — verify current version before client use'),
  ('b2000001-0001-4000-8000-0000000000d7', 'Medicine', 'School of Medicine', 'https://abmu.edu.ge/en/faculty/school', 'text/html', 2, 1, true, 'Official link — verify current version before client use'),
  ('b2000001-0001-4000-8000-0000000000d7', 'Programmes', 'Educational programmes & fees', 'https://abmu.edu.ge/en/faculty/educational-programmes', 'text/html', 3, 1, true, 'Official link — verify current version before client use'),
  ('b2000001-0001-4000-8000-0000000000d7', 'Georgia Visa', 'Georgia consular services — student visa', 'https://www.geoconsul.gov.ge/en', 'text/html', 4, 1, true, 'Official link — verify current version before client use'),
  ('b2000001-0001-4000-8000-0000000000d7', 'NMC', 'NMC India — foreign medical graduates', 'https://www.nmc.org.in/', 'text/html', 5, 1, true, 'Official link — verify current version before client use');

INSERT INTO public.service_library_submission_checklist
  (library_id, item_key, item_label, is_mandatory, sort_order, is_active)
SELECT 'b2000001-0001-4000-8000-0000000000d7'::uuid, x.item_key, x.item_label, x.is_mandatory, x.sort_order, true
FROM (VALUES
  ('avicenna_bat_application', 'ABMU application submitted', true, 1),
  ('avicenna_bat_transcripts', 'Official transcripts collected', true, 2),
  ('avicenna_bat_neet_nmc', 'NEET / NMC rules verified (Indian applicants)', false, 3),
  ('avicenna_bat_lor_personal', 'Personal statement & letters of recommendation', true, 4),
  ('avicenna_bat_admission_letter', 'Admission / enrollment letter received', true, 5),
  ('avicenna_bat_tuition_proof', 'Tuition payment or financial guarantee', true, 6),
  ('avicenna_bat_visa', 'Georgia student visa / permit filed', true, 7),
  ('avicenna_bat_insurance', 'Health insurance proof', true, 8),
  ('avicenna_bat_clinical_plan', 'Clinical-year / licensing strategy documented', false, 9),
  ('avicenna_bat_fees_collected', 'Consultancy fee collected (separate from tuition)', true, 10),
  ('avicenna_bat_client_approval', 'Client approval on final file', true, 11),
  ('avicenna_bat_quality_review', 'Quality review sign-off', true, 12)
) AS x(item_key, item_label, is_mandatory, sort_order)
WHERE NOT EXISTS (
  SELECT 1 FROM public.service_library_submission_checklist c
  WHERE c.library_id = 'b2000001-0001-4000-8000-0000000000d7'::uuid AND c.item_key = x.item_key
);
