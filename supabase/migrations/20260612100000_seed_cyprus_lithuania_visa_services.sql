-- Additive Cyprus + Lithuania visa services: 2 countries × student + visitor (4 rows).
-- UUIDs registered in scripts/lib/service-library-ids.mjs

INSERT INTO public.service_library (id, service_category, service, sub_service, display_order, is_active)
VALUES
  ('b2000001-0001-4000-8000-0000000000c8', 'visa_immigration', 'Cyprus', 'Student Visa (Entry Permit + Pink Slip)', 120, true),
  ('b2000001-0001-4000-8000-0000000000c9', 'visa_immigration', 'Cyprus', 'National Visitor Visa (Short Stay)', 121, true),
  ('b2000001-0001-4000-8000-0000000000cd', 'visa_immigration', 'Lithuania', 'Student Visa (National D Visa)', 122, true),
  ('b2000001-0001-4000-8000-0000000000ce', 'visa_immigration', 'Lithuania', 'Schengen Visitor Visa (Type C)', 123, true)
ON CONFLICT (service_category, service, sub_service) DO NOTHING;

INSERT INTO public.service_library_countries (library_id, country)
SELECT x.library_id, x.country FROM (VALUES
  ('b2000001-0001-4000-8000-0000000000c8'::uuid, 'Cyprus'),
  ('b2000001-0001-4000-8000-0000000000c9'::uuid, 'Cyprus'),
  ('b2000001-0001-4000-8000-0000000000cd'::uuid, 'Lithuania'),
  ('b2000001-0001-4000-8000-0000000000ce'::uuid, 'Lithuania')
) AS x(library_id, country)
ON CONFLICT DO NOTHING;

-- service_catalogue was retired (20260610190000_retire_service_catalogue.sql).
-- Billing uses service_library composite codes + picker_variants instead.

-- Verify (expect 4 rows):
-- SELECT id, service, sub_service FROM public.service_library
-- WHERE service IN ('Cyprus', 'Lithuania') AND service_category = 'visa_immigration';
