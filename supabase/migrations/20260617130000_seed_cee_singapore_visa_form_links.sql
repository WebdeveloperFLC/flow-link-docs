-- Official government form links for CEE + Singapore services (Service Library → Visa forms tab).
-- Requires migration 20260607120000_service_library_visa_form_files.sql

INSERT INTO public.service_library_visa_form_files
  (library_id, form_code, file_name, file_path, mime_type, sort_order, version, is_current, notes)
SELECT v.library_id, v.form_code, v.file_name, v.file_path, v.mime_type, v.sort_order, v.version, v.is_current, v.notes
FROM (VALUES
  ('b2000001-0001-4000-8000-0000000000dc'::uuid, 'Gov.pl', 'Poland — Ministry of Foreign Affairs', 'https://www.gov.pl/web/diplomacy', 'text/html', 1, 1, true, 'Official portal — verify embassy checklist before lodgement'),
  ('b2000001-0001-4000-8000-0000000000dd'::uuid, 'Schengen C', 'Poland — Schengen visa information', 'https://www.gov.pl/web/diplomacy/visas', 'text/html', 1, 1, true, 'Official portal'),
  ('b2000001-0001-4000-8000-0000000000de'::uuid, 'UdSC', 'Office for Foreigners — family reunification', 'https://www.gov.pl/web/udsc', 'text/html', 1, 1, true, 'Official portal'),
  ('b2000001-0001-4000-8000-0000000000df'::uuid, 'UdSC Work', 'EU Blue Card / work residence', 'https://www.gov.pl/web/udsc', 'text/html', 1, 1, true, 'Official portal'),
  ('b2000001-0001-4000-8000-0000000000e0'::uuid, 'OIF', 'Hungary — Immigration authority', 'https://oif.gov.hu/', 'text/html', 1, 1, true, 'Official portal'),
  ('b2000001-0001-4000-8000-0000000000e1'::uuid, 'Embassy', 'Hungary — visa information', 'https://oif.gov.hu/en/immigration', 'text/html', 1, 1, true, 'Official portal'),
  ('b2000001-0001-4000-8000-0000000000e2'::uuid, 'OIF Family', 'Family reunification', 'https://oif.gov.hu/en/immigration', 'text/html', 1, 1, true, 'Official portal'),
  ('b2000001-0001-4000-8000-0000000000e3'::uuid, 'OIF Work', 'Employment residence', 'https://oif.gov.hu/en/immigration', 'text/html', 1, 1, true, 'Official portal'),
  ('b2000001-0001-4000-8000-0000000000e4'::uuid, 'PMLP', 'Latvia — Office of Citizenship', 'https://www.pmlp.gov.lv/en', 'text/html', 1, 1, true, 'Official portal'),
  ('b2000001-0001-4000-8000-0000000000e5'::uuid, 'Embassy LV', 'Latvia — visa information', 'https://www.mfa.gov.lv/en/consular-information/visa', 'text/html', 1, 1, true, 'Official portal'),
  ('b2000001-0001-4000-8000-0000000000e6'::uuid, 'PMLP Family', 'Family reunification', 'https://www.pmlp.gov.lv/en', 'text/html', 1, 1, true, 'Official portal'),
  ('b2000001-0001-4000-8000-0000000000e7'::uuid, 'ICA STP', 'Student''s Pass — ICA', 'https://www.ica.gov.sg/reside/STP/apply', 'text/html', 1, 1, true, 'Official portal — SOLAR via institution'),
  ('b2000001-0001-4000-8000-0000000000e8'::uuid, 'ICA Visit', 'Short-term visit — ICA', 'https://www.ica.gov.sg/enter-transit-depart/entering-singapore/visa_requirements', 'text/html', 1, 1, true, 'Official portal'),
  ('b2000001-0001-4000-8000-0000000000e9'::uuid, 'ICA DP', 'Dependant''s Pass / LTVP', 'https://www.ica.gov.sg/reside/overview', 'text/html', 1, 1, true, 'Official portal'),
  ('b2000001-0001-4000-8000-0000000000ea'::uuid, 'MOM EP', 'Employment Pass — MOM', 'https://www.mom.gov.sg/passes-and-permits/employment-pass', 'text/html', 1, 1, true, 'Official portal'),
  ('b2000001-0001-4000-8000-0000000000eb'::uuid, 'Migri', 'Finland — family reunification', 'https://migri.fi/en/family-reunification', 'text/html', 1, 1, true, 'Official portal')
) AS v(library_id, form_code, file_name, file_path, mime_type, sort_order, version, is_current, notes)
WHERE NOT EXISTS (
  SELECT 1 FROM public.service_library_visa_form_files f
  WHERE f.library_id = v.library_id AND f.form_code = v.form_code AND f.is_current = true
);
