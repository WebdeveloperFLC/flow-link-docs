-- Hide admission workflow SKUs (SOP, LOR, shortlisting, LOA follow-up, offer review) from service pickers.
-- Preserves rows referenced in lead/client service arrays.

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
  UNION ALL SELECT unnest(COALESCE(coaching_services, '{}')) FROM public.leads
  UNION ALL SELECT unnest(COALESCE(coaching_services, '{}')) FROM public.clients
) x
WHERE public._sl_extract_library_id(x.code) IS NOT NULL;

-- service_catalogue (legacy billing SKUs)
UPDATE public.service_catalogue
SET is_active = false, updated_at = now()
WHERE service_code IN (
  'ADM-SHORT-5',
  'ADM-SHORT-10',
  'ADM-SOP-UG',
  'ADM-SOP-PG',
  'ADM-LOR',
  'ADM-OFFER-REV',
  'ADM-DOC-FOLLOWUP'
);

-- service_library rows (lead/client picker source of truth)
UPDATE public.service_library sl
SET is_active = false, updated_at = now()
WHERE sl.is_active = true
  AND sl.id NOT IN (SELECT library_id FROM _sl_referenced_ids WHERE library_id IS NOT NULL)
  AND (
    lower(sl.sub_service) IN (
      'loa / coe / cas / i-20 follow-up',
      'lor guidance (per letter)',
      'offer letter review & advice',
      'sop writing — graduate / masters',
      'sop writing — undergraduate',
      'university shortlisting (up to 10)',
      'university shortlisting (up to 5)'
    )
    OR lower(sl.sub_service) LIKE 'university shortlisting%'
    OR lower(sl.sub_service) LIKE 'sop writing%'
    OR lower(sl.sub_service) LIKE 'lor guidance%'
    OR lower(sl.sub_service) LIKE 'offer letter review%'
    OR lower(sl.sub_service) LIKE 'loa / coe%'
  );

DROP FUNCTION IF EXISTS public._sl_extract_library_id(text);
