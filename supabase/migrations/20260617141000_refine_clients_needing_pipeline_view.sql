-- Exclude assessment-only clients from pipeline ops view (no visa enrollment expected).

CREATE OR REPLACE VIEW public.v_clients_needing_pipeline AS
SELECT
  c.id,
  c.full_name,
  c.application_id,
  c.application_type,
  c.country,
  c.visa_services,
  c.pipeline_id
FROM public.clients c
WHERE c.pipeline_id IS NULL
  AND c.application_type NOT ILIKE '%— assessment%'
  AND c.application_type NOT ILIKE '%eligibility assessment%'
  AND (
    cardinality(COALESCE(c.visa_services, ARRAY[]::text[])) > 0
    OR (
      c.application_type IS NOT NULL
      AND trim(c.application_type) <> ''
      AND c.application_type NOT ILIKE '%assessment%'
    )
  );

COMMENT ON VIEW public.v_clients_needing_pipeline IS
  'Active visa clients missing pipeline_id. Assessment-only rows excluded. Switch active service on Client Detail to assign.';
