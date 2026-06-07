-- ONE-SHOT FIX: create missing Student + Visitor TRV rows, then verify.
-- Run this entire file in Supabase SQL Editor.
-- AFTER success on verify (2 rows), run separately:
--   canada-seed/01-student-visa.sql
--   canada-seed/02-visitor-trv.sql

-- ── A) See what's blocking (optional — check Results tab) ──
SELECT id, service, sub_service, is_active,
       COALESCE(jsonb_array_length(academy_metadata->'quiz'), 0) AS quiz_count
FROM service_library
WHERE service_category = 'visa_immigration'
  AND service = 'Canada'
  AND (
    lower(sub_service) LIKE '%visitor%'
    OR lower(sub_service) LIKE '%student%'
    OR lower(sub_service) LIKE '%study permit%'
  )
ORDER BY is_active DESC, sub_service;

-- ── B) Free unique keys: rename + deactivate legacy student/visitor rows ──
UPDATE service_library
SET
  is_active = false,
  sub_service = left(sub_service, 90) || ' (legacy ' || left(id::text, 8) || ')',
  updated_at = now()
WHERE service_category = 'visa_immigration'
  AND service = 'Canada'
  AND id NOT IN (
    'c35e6051-f40f-47bf-9cac-0a386c47a336',
    'b2000001-0001-4000-8000-000000000011'
  )
  AND is_active = true
  AND (
    lower(sub_service) LIKE '%visitor%visa%'
    OR lower(sub_service) LIKE '%student%visa%'
    OR lower(sub_service) LIKE '%study permit%'
  )
  AND lower(sub_service) NOT LIKE '%extension%'
  AND lower(sub_service) NOT LIKE '%super%'
  AND lower(sub_service) NOT LIKE '%(legacy%';

-- ── C) Insert canonical Student row ──
INSERT INTO service_library (id, service_category, service, sub_service, display_order, is_active)
SELECT
  'c35e6051-f40f-47bf-9cac-0a386c47a336'::uuid,
  'visa_immigration',
  'Canada',
  'Study Permit (Undergraduate / Postgraduate / College)',
  10,
  true
WHERE NOT EXISTS (
  SELECT 1 FROM service_library WHERE id = 'c35e6051-f40f-47bf-9cac-0a386c47a336'::uuid
);

-- ── D) Insert canonical Visitor TRV row ──
INSERT INTO service_library (id, service_category, service, sub_service, display_order, is_active)
SELECT
  'b2000001-0001-4000-8000-000000000011'::uuid,
  'visa_immigration',
  'Canada',
  'Visitor Visa (TRV)',
  11,
  true
WHERE NOT EXISTS (
  SELECT 1 FROM service_library WHERE id = 'b2000001-0001-4000-8000-000000000011'::uuid
);

-- ── E) Country mappings ──
INSERT INTO service_library_countries (library_id, country)
SELECT x.library_id, 'Canada'
FROM (VALUES
  ('c35e6051-f40f-47bf-9cac-0a386c47a336'::uuid),
  ('b2000001-0001-4000-8000-000000000011'::uuid)
) AS x(library_id)
WHERE EXISTS (SELECT 1 FROM service_library sl WHERE sl.id = x.library_id)
ON CONFLICT DO NOTHING;

-- ── F) VERIFY — must return 2 rows ──
SELECT id, sub_service, is_active
FROM service_library
WHERE id IN (
  'c35e6051-f40f-47bf-9cac-0a386c47a336',
  'b2000001-0001-4000-8000-000000000011'
);
