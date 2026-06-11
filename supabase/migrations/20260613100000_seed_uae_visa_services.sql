-- Additive UAE visa services: 5 rows (student, spouse, visitor, work permit, golden visa).
-- UUIDs registered in scripts/lib/service-library-ids.mjs

INSERT INTO public.service_library (id, service_category, service, sub_service, display_order, is_active)
VALUES
  ('b2000001-0001-4000-8000-0000000000cf', 'visa_immigration', 'United Arab Emirates', 'Student Residence Visa', 124, true),
  ('b2000001-0001-4000-8000-0000000000d8', 'visa_immigration', 'United Arab Emirates', 'Spouse / Dependent Visa', 125, true),
  ('b2000001-0001-4000-8000-0000000000d9', 'visa_immigration', 'United Arab Emirates', 'Visitor Visa (Tourist / Short Stay)', 126, true),
  ('b2000001-0001-4000-8000-0000000000da', 'visa_immigration', 'United Arab Emirates', 'Employment / Work Permit', 127, true),
  ('b2000001-0001-4000-8000-0000000000db', 'visa_immigration', 'United Arab Emirates', 'Golden Visa (Long-Term Residence)', 128, true)
ON CONFLICT (service_category, service, sub_service) DO NOTHING;

INSERT INTO public.service_library_countries (library_id, country)
SELECT x.library_id, x.country FROM (VALUES
  ('b2000001-0001-4000-8000-0000000000cf'::uuid, 'United Arab Emirates'),
  ('b2000001-0001-4000-8000-0000000000d8'::uuid, 'United Arab Emirates'),
  ('b2000001-0001-4000-8000-0000000000d9'::uuid, 'United Arab Emirates'),
  ('b2000001-0001-4000-8000-0000000000da'::uuid, 'United Arab Emirates'),
  ('b2000001-0001-4000-8000-0000000000db'::uuid, 'United Arab Emirates')
) AS x(library_id, country)
ON CONFLICT DO NOTHING;

-- Activate UAE in countries catalogue
UPDATE public.countries SET status = 'active', updated_at = now() WHERE code = 'AE';

-- Verify (expect 5 rows):
-- SELECT id, service, sub_service FROM public.service_library
-- WHERE service = 'United Arab Emirates' AND service_category = 'visa_immigration';
