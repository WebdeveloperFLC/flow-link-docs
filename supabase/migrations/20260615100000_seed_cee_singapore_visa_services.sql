-- Poland, Hungary, Latvia, Singapore (student/visitor/spouse/work) + Finland family reunification.
-- 16 additive service_library rows. UUIDs in scripts/lib/service-library-ids.mjs

INSERT INTO public.service_library (id, service_category, service, sub_service, display_order, is_active)
VALUES
  ('b2000001-0001-4000-8000-0000000000dc', 'visa_immigration', 'Poland', 'Student Visa (National D + Residence for Studies)', 129, true),
  ('b2000001-0001-4000-8000-0000000000dd', 'visa_immigration', 'Poland', 'Schengen Visitor Visa (Type C)', 130, true),
  ('b2000001-0001-4000-8000-0000000000de', 'visa_immigration', 'Poland', 'Family Reunification (Spouse / Join Family)', 131, true),
  ('b2000001-0001-4000-8000-0000000000df', 'visa_immigration', 'Poland', 'EU Blue Card / Skilled Worker Residence', 132, true),
  ('b2000001-0001-4000-8000-0000000000e0', 'visa_immigration', 'Hungary', 'Student Residence Permit (National D Visa)', 133, true),
  ('b2000001-0001-4000-8000-0000000000e1', 'visa_immigration', 'Hungary', 'Schengen Visitor Visa (Type C)', 134, true),
  ('b2000001-0001-4000-8000-0000000000e2', 'visa_immigration', 'Hungary', 'Family Reunification (Spouse / Join Family)', 135, true),
  ('b2000001-0001-4000-8000-0000000000e3', 'visa_immigration', 'Hungary', 'Residence Permit for Employment', 136, true),
  ('b2000001-0001-4000-8000-0000000000e4', 'visa_immigration', 'Latvia', 'Student Residence Permit (National D Visa)', 137, true),
  ('b2000001-0001-4000-8000-0000000000e5', 'visa_immigration', 'Latvia', 'Schengen Visitor Visa (Type C)', 138, true),
  ('b2000001-0001-4000-8000-0000000000e6', 'visa_immigration', 'Latvia', 'Family Reunification (Spouse / Join Family)', 139, true),
  ('b2000001-0001-4000-8000-0000000000e7', 'visa_immigration', 'Singapore', 'Student''s Pass (STP)', 140, true),
  ('b2000001-0001-4000-8000-0000000000e8', 'visa_immigration', 'Singapore', 'Short-Term Visit / Visitor', 141, true),
  ('b2000001-0001-4000-8000-0000000000e9', 'visa_immigration', 'Singapore', 'Dependant''s Pass / LTVP (Spouse & Dependants)', 142, true),
  ('b2000001-0001-4000-8000-0000000000ea', 'visa_immigration', 'Singapore', 'Employment Pass / S Pass (Work Pass)', 143, true),
  ('b2000001-0001-4000-8000-0000000000eb', 'visa_immigration', 'Finland', 'Family Reunification (Spouse / Join Family)', 144, true)
ON CONFLICT (service_category, service, sub_service) DO NOTHING;

INSERT INTO public.service_library_countries (library_id, country)
SELECT x.library_id, x.country FROM (VALUES
  ('b2000001-0001-4000-8000-0000000000dc'::uuid, 'Poland'),
  ('b2000001-0001-4000-8000-0000000000dd'::uuid, 'Poland'),
  ('b2000001-0001-4000-8000-0000000000de'::uuid, 'Poland'),
  ('b2000001-0001-4000-8000-0000000000df'::uuid, 'Poland'),
  ('b2000001-0001-4000-8000-0000000000e0'::uuid, 'Hungary'),
  ('b2000001-0001-4000-8000-0000000000e1'::uuid, 'Hungary'),
  ('b2000001-0001-4000-8000-0000000000e2'::uuid, 'Hungary'),
  ('b2000001-0001-4000-8000-0000000000e3'::uuid, 'Hungary'),
  ('b2000001-0001-4000-8000-0000000000e4'::uuid, 'Latvia'),
  ('b2000001-0001-4000-8000-0000000000e5'::uuid, 'Latvia'),
  ('b2000001-0001-4000-8000-0000000000e6'::uuid, 'Latvia'),
  ('b2000001-0001-4000-8000-0000000000e7'::uuid, 'Singapore'),
  ('b2000001-0001-4000-8000-0000000000e8'::uuid, 'Singapore'),
  ('b2000001-0001-4000-8000-0000000000e9'::uuid, 'Singapore'),
  ('b2000001-0001-4000-8000-0000000000ea'::uuid, 'Singapore'),
  ('b2000001-0001-4000-8000-0000000000eb'::uuid, 'Finland')
) AS x(library_id, country)
ON CONFLICT DO NOTHING;

-- Verify (expect 16 rows):
-- SELECT service, sub_service FROM public.service_library
-- WHERE id >= 'b2000001-0001-4000-8000-0000000000dc' AND id <= 'b2000001-0001-4000-8000-0000000000eb'
-- ORDER BY display_order;
