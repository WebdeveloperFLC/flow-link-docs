-- Insert missing canonical Canada Student + Visitor TRV rows (stable UUIDs for content + leads).
-- Run in Supabase SQL Editor, THEN run canada-seed/01-student-visa.sql and 02-visitor-trv.sql
--
-- Root cause: c35e6051 and b2000001-...011 never existed — older rows held the same
-- (service_category, service, sub_service) unique key under different UUIDs.

-- 1) Deactivate legacy duplicates that block canonical inserts
UPDATE public.service_library
SET
  is_active = false,
  sub_service = sub_service || ' (legacy)',
  updated_at = now()
WHERE service_category = 'visa_immigration'
  AND service = 'Canada'
  AND id NOT IN (
    'c35e6051-f40f-47bf-9cac-0a386c47a336',
    'b2000001-0001-4000-8000-000000000011'
  )
  AND (
    lower(sub_service) IN (
      'visitor visa (trv)',
      'visitor visa',
      'study permit (undergraduate / postgraduate / college)',
      'student visa — outside canada',
      'student visa - outside canada'
    )
    OR lower(sub_service) LIKE '%student visa%outside%'
    OR (
      lower(sub_service) LIKE '%study permit%'
      AND lower(sub_service) NOT LIKE '%extension%'
      AND lower(sub_service) NOT LIKE '%(legacy)%'
    )
  );

-- 2) Insert canonical Student row
INSERT INTO public.service_library (id, service_category, service, sub_service, display_order, is_active)
SELECT
  'c35e6051-f40f-47bf-9cac-0a386c47a336'::uuid,
  'visa_immigration',
  'Canada',
  'Study Permit (Undergraduate / Postgraduate / College)',
  10,
  true
WHERE NOT EXISTS (
  SELECT 1 FROM public.service_library
  WHERE id = 'c35e6051-f40f-47bf-9cac-0a386c47a336'::uuid
);

-- 3) Insert canonical Visitor TRV row
INSERT INTO public.service_library (id, service_category, service, sub_service, display_order, is_active)
SELECT
  'b2000001-0001-4000-8000-000000000011'::uuid,
  'visa_immigration',
  'Canada',
  'Visitor Visa (TRV)',
  11,
  true
WHERE NOT EXISTS (
  SELECT 1 FROM public.service_library
  WHERE id = 'b2000001-0001-4000-8000-000000000011'::uuid
);

-- 4) Country mappings
INSERT INTO public.service_library_countries (library_id, country)
SELECT x.library_id, x.country
FROM (VALUES
  ('c35e6051-f40f-47bf-9cac-0a386c47a336'::uuid, 'Canada'),
  ('b2000001-0001-4000-8000-000000000011'::uuid, 'Canada')
) AS x(library_id, country)
WHERE EXISTS (SELECT 1 FROM public.service_library sl WHERE sl.id = x.library_id)
ON CONFLICT DO NOTHING;

-- 5) Verify — expect 2 rows
-- SELECT id, sub_service, is_active FROM service_library
-- WHERE id IN ('c35e6051-f40f-47bf-9cac-0a386c47a336', 'b2000001-0001-4000-8000-000000000011');
