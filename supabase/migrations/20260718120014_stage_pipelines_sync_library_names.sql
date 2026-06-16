-- Service Library is source of truth for pipeline display names.
-- Run after 20260718120013_stage_pipelines_library_id.sql.

UPDATE public.stage_pipelines sp
SET name = lib.display_name
FROM (
  SELECT
    sl.id,
    COALESCE(
      NULLIF(TRIM(sl.academy_metadata->>'displayName'), ''),
      CASE
        WHEN NULLIF(TRIM(sl.sub_service), '') IS NOT NULL
          AND NULLIF(TRIM(sl.service), '') IS NOT NULL
          AND lower(trim(sl.service)) <> lower(trim(sl.sub_service))
        THEN trim(sl.service) || ' – ' || trim(sl.sub_service)
        ELSE COALESCE(NULLIF(TRIM(sl.sub_service), ''), NULLIF(TRIM(sl.service), ''))
      END
    ) AS display_name
  FROM public.service_library sl
) lib
WHERE sp.library_id = lib.id
  AND lib.display_name IS NOT NULL
  AND sp.name IS DISTINCT FROM lib.display_name;
