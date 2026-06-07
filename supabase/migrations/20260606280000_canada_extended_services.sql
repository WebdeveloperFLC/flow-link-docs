-- Extended Canada service_library rows + academy metadata seed for BOWP, extensions, CAIPS, spouse OWP.
-- Content source: content/service-library/canada-*.json
-- Regenerate metadata: node scripts/generate-canada-metadata-sql.mjs

INSERT INTO public.service_library (id, service_category, service, sub_service, display_order, is_active)
VALUES
  ('b2000001-0001-4000-8000-000000000017', 'visa_immigration', 'Canada', 'BOWP (Bridging Open Work Permit)', 17, true),
  ('b2000001-0001-4000-8000-000000000018', 'visa_immigration', 'Canada', 'Study Permit Extension', 18, true),
  ('b2000001-0001-4000-8000-000000000019', 'visa_immigration', 'Canada', 'Visitor Record', 19, true),
  ('b2000001-0001-4000-8000-00000000001a', 'visa_immigration', 'Canada', 'CAIPS / GCMS Notes', 20, true),
  ('b2000001-0001-4000-8000-00000000001b', 'visa_immigration', 'Canada', 'Spouse / Dependent Open Work Permit', 21, true)
ON CONFLICT (service_category, service, sub_service) DO UPDATE
SET display_order = EXCLUDED.display_order, is_active = true, updated_at = now();

INSERT INTO public.service_library_countries (library_id, country)
SELECT x.library_id, x.country
FROM (VALUES
  ('b2000001-0001-4000-8000-000000000017'::uuid, 'Canada'),
  ('b2000001-0001-4000-8000-000000000018'::uuid, 'Canada'),
  ('b2000001-0001-4000-8000-000000000019'::uuid, 'Canada'),
  ('b2000001-0001-4000-8000-00000000001a'::uuid, 'Canada'),
  ('b2000001-0001-4000-8000-00000000001b'::uuid, 'Canada')
) AS x(library_id, country)
ON CONFLICT DO NOTHING;

-- Update display names on existing rows where counselors see legacy labels
UPDATE public.service_library
SET academy_metadata = COALESCE(academy_metadata, '{}'::jsonb) || '{"displayName":"Canada – Student Visa (Study Permit — Outside Canada)"}'::jsonb,
    updated_at = now()
WHERE id = 'c35e6051-f40f-47bf-9cac-0a386c47a336';

UPDATE public.service_library
SET sub_service = 'Visitor Visa (TRV)',
    updated_at = now()
WHERE id = 'b2000001-0001-4000-8000-000000000011'
  AND sub_service IN ('Visitor Visa', 'Visitor Visa (TRV)');
