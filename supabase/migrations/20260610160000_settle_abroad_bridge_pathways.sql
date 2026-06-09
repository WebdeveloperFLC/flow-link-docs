-- Germany skilled pathways in service library (Settle Abroad full assessment)

INSERT INTO public.service_library (id, service_category, service, sub_service, display_order, is_active)
SELECT v.id, 'visa_immigration', 'Germany', v.sub_service, v.display_order, true
FROM (VALUES
  ('b2000001-0001-4000-8000-000000000056'::uuid, 'Skilled Worker Visa (§18a/§18b)', 55),
  ('b2000001-0001-4000-8000-000000000057'::uuid, 'EU Blue Card', 56),
  ('b2000001-0001-4000-8000-000000000058'::uuid, 'Ausbildung (Vocational Training)', 57)
) AS v(id, sub_service, display_order)
WHERE NOT EXISTS (SELECT 1 FROM public.service_library sl WHERE sl.id = v.id);

INSERT INTO public.service_library_countries (library_id, country)
SELECT v.id, 'Germany'
FROM (VALUES
  ('b2000001-0001-4000-8000-000000000056'::uuid),
  ('b2000001-0001-4000-8000-000000000057'::uuid),
  ('b2000001-0001-4000-8000-000000000058'::uuid)
) AS v(id)
WHERE NOT EXISTS (
  SELECT 1 FROM public.service_library_countries c
  WHERE c.library_id = v.id AND c.country = 'Germany'
);

-- Re-enable Canada pathways for Settle Abroad public funnel (optional staff paths use goals directly)
UPDATE public.country_pathways
SET is_active = true
WHERE country_code = 'CA'
  AND pathway_code IN (
    'permanent_residence', 'pnp', 'study_permit', 'work_permit',
    'visitor_visa', 'business_investment'
  );

UPDATE public.country_pathways
SET is_active = true
WHERE country_code = 'DE';
