-- Service Library structure cleanup: deactivate legacy junk, recategorize admission rows.
-- Preserves UUIDs referenced in leads/clients visa_services arrays.

-- 1) Collect library IDs referenced in lead/client service arrays (uuid or uuid::country)
CREATE OR REPLACE FUNCTION public._sl_extract_library_id(code text)
RETURNS uuid
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT NULLIF(split_part(code, '::', 1), '')::uuid
  WHERE code ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}'
$$;

CREATE TEMP TABLE _sl_referenced_ids AS
SELECT DISTINCT public._sl_extract_library_id(x.code) AS library_id
FROM (
  SELECT unnest(COALESCE(visa_services, '{}')) AS code FROM public.leads
  UNION ALL SELECT unnest(COALESCE(visa_services, '{}')) FROM public.clients
  UNION ALL SELECT unnest(COALESCE(coaching_services, '{}')) FROM public.leads
  UNION ALL SELECT unnest(COALESCE(coaching_services, '{}')) FROM public.clients
  UNION ALL SELECT unnest(COALESCE(admission_services, '{}')) FROM public.leads
  UNION ALL SELECT unnest(COALESCE(admission_services, '{}')) FROM public.clients
  UNION ALL SELECT unnest(COALESCE(allied_services, '{}')) FROM public.leads
  UNION ALL SELECT unnest(COALESCE(allied_services, '{}')) FROM public.clients
  UNION ALL SELECT unnest(COALESCE(travel_financial_services, '{}')) FROM public.clients
) x
WHERE public._sl_extract_library_id(x.code) IS NOT NULL;

-- 2) Recategorize university application assistance out of visa_immigration (keep active for code resolution)
UPDATE public.service_library sl
SET
  service_category = 'admission_services',
  updated_at = now()
WHERE sl.service_category = 'visa_immigration'
  AND (
    lower(sl.sub_service) LIKE '%application to%university%'
    OR lower(sl.sub_service) LIKE '%university shortlisting%'
    OR (lower(sl.sub_service) = 'application' AND lower(sl.service) NOT IN (
      'canada', 'united kingdom', 'united states', 'australia', 'germany', 'new zealand'
    ))
  )
  AND (sl.academy_metadata IS NULL OR sl.academy_metadata = '{}'::jsonb);

-- 3) Deactivate unreferenced legacy visa junk (Application / Assessment placeholders)
UPDATE public.service_library sl
SET is_active = false, updated_at = now()
WHERE sl.is_active = true
  AND sl.service_category = 'visa_immigration'
  AND lower(sl.sub_service) IN ('application', 'assessment')
  AND (sl.academy_metadata IS NULL OR sl.academy_metadata = '{}'::jsonb)
  AND sl.id NOT IN (SELECT library_id FROM _sl_referenced_ids WHERE library_id IS NOT NULL);

-- 4) Normalize Canada student canonical row labels (preserve UUID)
UPDATE public.service_library
SET
  service = 'Canada',
  sub_service = 'Study Permit (Undergraduate / Postgraduate / College)',
  display_order = 10,
  updated_at = now()
WHERE id = 'c35e6051-f40f-47bf-9cac-0a386c47a336';

-- 5) Ensure Canada country mapping on canonical student row
INSERT INTO public.service_library_countries (library_id, country)
VALUES ('c35e6051-f40f-47bf-9cac-0a386c47a336', 'Canada')
ON CONFLICT DO NOTHING;

DROP FUNCTION IF EXISTS public._sl_extract_library_id(text);
