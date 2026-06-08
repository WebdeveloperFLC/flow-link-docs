-- Normalize Australia Work & Holiday / Work & Travel records for Service Library nav.
-- Run in Supabase SQL Editor if the service was created with a custom service field name.

-- Ensure Australia country mapping exists
INSERT INTO public.service_library_countries (library_id, country)
SELECT sl.id, 'Australia'
FROM public.service_library sl
WHERE sl.service_category = 'visa_immigration'
  AND sl.is_active = true
  AND (
    lower(sl.sub_service) LIKE '%work%holiday%'
    OR lower(sl.sub_service) LIKE '%work%travel%'
    OR lower(sl.service) LIKE '%work%holiday%'
    OR lower(sl.service) LIKE '%work%travel%'
    OR lower(sl.sub_service) LIKE '%whv%'
  )
  AND NOT EXISTS (
    SELECT 1 FROM public.service_library_countries c
    WHERE c.library_id = sl.id AND c.country = 'Australia'
  )
ON CONFLICT DO NOTHING;

-- Normalize service/sub_service + display metadata
UPDATE public.service_library sl
SET
  service = 'Australia',
  sub_service = CASE
    WHEN lower(sl.sub_service) LIKE '%work%' OR lower(sl.sub_service) LIKE '%whv%'
      THEN sl.sub_service
    ELSE 'Work & Holiday Visa (Subclass 417/462)'
  END,
  is_active = true,
  academy_metadata = COALESCE(sl.academy_metadata, '{}'::jsonb)
    || jsonb_build_object(
      'displayName',
      COALESCE(
        sl.academy_metadata->>'displayName',
        'Australia – Work & Holiday Visa (1 year Work & Travel)'
      ),
      'shortDescription',
      COALESCE(
        sl.academy_metadata->>'shortDescription',
        'Subclass 417 / 462 · Working Holiday for eligible passport holders'
      ),
      'reviewStatus',
      COALESCE(sl.academy_metadata->>'reviewStatus', 'active')
    ),
  updated_at = now()
WHERE sl.service_category = 'visa_immigration'
  AND (
    lower(sl.sub_service) LIKE '%work%holiday%'
    OR lower(sl.sub_service) LIKE '%work%travel%'
    OR lower(sl.service) LIKE '%work%holiday%'
    OR lower(sl.service) LIKE '%work%travel%'
    OR lower(sl.sub_service) LIKE '%whv%'
  );

-- Link branded checklist PDF (public/specimens/checklists/Australia work and holiday.pdf)
UPDATE public.service_library_checklist_files
SET is_current = false, updated_at = now()
WHERE file_path LIKE '%Australia work and holiday.pdf%';

INSERT INTO public.service_library_checklist_files
  (library_id, file_name, file_path, mime_type, size_bytes, version, is_current, notes)
SELECT
  sl.id,
  'Australia – Work & Holiday Visa — Document Checklist.pdf',
  '/specimens/checklists/Australia work and holiday.pdf',
  'application/pdf',
  586959,
  1,
  true,
  'Future Link branded checklist PDF'
FROM public.service_library sl
WHERE sl.service_category = 'visa_immigration'
  AND sl.is_active = true
  AND sl.service = 'Australia'
  AND (
    lower(sl.sub_service) LIKE '%work%holiday%'
    OR lower(sl.sub_service) LIKE '%work%travel%'
    OR lower(sl.sub_service) LIKE '%whv%'
  )
  AND NOT EXISTS (
    SELECT 1 FROM public.service_library_checklist_files cf
    WHERE cf.library_id = sl.id
      AND cf.file_path = '/specimens/checklists/Australia work and holiday.pdf'
      AND cf.is_current = true
  );
