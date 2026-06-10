-- Deactivate legacy visa_immigration placeholder rows (country-name duplicates, Assessment, Financial).
-- Canonical services use stable b2000001-* UUIDs or c35e6051 student visa + academy_metadata.displayName.

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
) x
WHERE public._sl_extract_library_id(x.code) IS NOT NULL;

UPDATE public.service_library sl
SET is_active = false, updated_at = now()
WHERE sl.service_category = 'visa_immigration'
  AND sl.is_active = true
  AND sl.id NOT IN (SELECT library_id FROM _sl_referenced_ids WHERE library_id IS NOT NULL)
  AND (
    -- Not a canonical stable UUID prefix
    sl.id::text !~ '^b2000001-0001-4000-8000-'
    AND sl.id <> 'c35e6051-f40f-47bf-9cac-0a386c47a336'::uuid
  );

-- Also hide active rows that are country labels without counselor content
UPDATE public.service_library sl
SET is_active = false, updated_at = now()
WHERE sl.service_category = 'visa_immigration'
  AND sl.is_active = true
  AND sl.id NOT IN (SELECT library_id FROM _sl_referenced_ids WHERE library_id IS NOT NULL)
  AND (
    sl.academy_metadata IS NULL
    OR sl.academy_metadata = '{}'::jsonb
    OR NOT (sl.academy_metadata ? 'displayName')
  )
  AND (
    lower(sl.sub_service) IN ('application', 'assessment', 'financial')
    OR lower(sl.sub_service) = lower(sl.service)
    OR lower(sl.sub_service) IN (
      'canada', 'australia', 'germany', 'united kingdom', 'united states', 'new zealand'
    )
  );

DROP FUNCTION IF EXISTS public._sl_extract_library_id(text);
