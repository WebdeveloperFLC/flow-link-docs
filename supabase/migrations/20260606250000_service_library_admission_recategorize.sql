-- Fix admission / workflow rows misclassified as visa_immigration (20260601025936 mapped Admission → visa).
-- Keeps rows referenced in lead/client service arrays active under admission_services.

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
  UNION ALL SELECT unnest(COALESCE(admission_services, '{}')) FROM public.leads
  UNION ALL SELECT unnest(COALESCE(admission_services, '{}')) FROM public.clients
) x
WHERE public._sl_extract_library_id(x.code) IS NOT NULL;

-- Recategorize admission workflow masters (Documents, Shortlisting, etc.)
UPDATE public.service_library sl
SET
  service_category = 'admission_services',
  updated_at = now()
WHERE sl.service_category = 'visa_immigration'
  AND lower(sl.service) IN (
    'documents',
    'shortlisting',
    'offer management',
    'application',
    'financial',
    'general',
    'other',
    'admission'
  )
  AND (sl.academy_metadata IS NULL OR NOT (sl.academy_metadata ? 'displayName'));

-- Deactivate unreferenced junk still tagged visa with non-country service names
UPDATE public.service_library sl
SET is_active = false, updated_at = now()
WHERE sl.service_category = 'visa_immigration'
  AND sl.is_active = true
  AND (sl.academy_metadata IS NULL OR NOT (sl.academy_metadata ? 'displayName'))
  AND lower(sl.service) IN (
    'documents',
    'shortlisting',
    'offer management',
    'application',
    'financial',
    'general',
    'other',
    'admission'
  )
  AND sl.id NOT IN (SELECT library_id FROM _sl_referenced_ids WHERE library_id IS NOT NULL);

DROP FUNCTION IF EXISTS public._sl_extract_library_id(text);
