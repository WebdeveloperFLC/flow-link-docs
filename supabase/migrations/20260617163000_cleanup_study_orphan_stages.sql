-- Remove remaining non-canonical Study Visa stage keys (e.g. Australia Masters bootstrap).
-- Run after 20260617162000_cleanup_study_pipeline_legacy_stages.sql

CREATE TEMP TABLE _study_canonical_keys (key text PRIMARY KEY) ON COMMIT DROP;
INSERT INTO _study_canonical_keys (key) VALUES
  ('enrolled'),
  ('payment_pending'),
  ('payment_received'),
  ('docs_collection'),
  ('docs_complete'),
  ('offer_letter'),
  ('tuition_paid'),
  ('visa_preparation'),
  ('visa_lodged'),
  ('biometrics_medical'),
  ('visa_approved'),
  ('visa_refused');

CREATE TEMP TABLE _study_orphan_map (
  old_key text PRIMARY KEY,
  new_key text NOT NULL
) ON COMMIT DROP;

INSERT INTO _study_orphan_map (old_key, new_key)
VALUES
  ('coe_received', 'offer_letter'),
  ('coe_secured', 'offer_letter'),
  ('coe_issued', 'offer_letter'),
  ('letter_of_acceptance', 'offer_letter'),
  ('loa_received', 'offer_letter'),
  ('oshc_purchased', 'tuition_paid'),
  ('oshc_done', 'tuition_paid'),
  ('oshc', 'tuition_paid'),
  ('visa_granted', 'visa_approved'),
  ('grant_received', 'visa_approved'),
  ('immi_lodged', 'visa_lodged'),
  ('gs_completed', 'visa_preparation'),
  ('genuine_student', 'visa_preparation');

-- Remap clients on orphan keys with explicit mapping.
UPDATE public.clients c
SET
  current_stage_id = new_stage.id,
  updated_at = now()
FROM public.pipeline_stages old_stage
JOIN public.stage_pipelines sp ON sp.id = old_stage.pipeline_id
JOIN _study_orphan_map om ON om.old_key = old_stage.key
JOIN public.pipeline_stages new_stage
  ON new_stage.pipeline_id = old_stage.pipeline_id
 AND new_stage.key = om.new_key
WHERE c.current_stage_id = old_stage.id
  AND sp.service_category = 'Study Visa'
  AND sp.is_active = true
  AND new_stage.id <> old_stage.id;

UPDATE public.client_stage_history h
SET stage_id = new_stage.id
FROM public.pipeline_stages old_stage
JOIN public.stage_pipelines sp ON sp.id = old_stage.pipeline_id
JOIN _study_orphan_map om ON om.old_key = old_stage.key
JOIN public.pipeline_stages new_stage
  ON new_stage.pipeline_id = old_stage.pipeline_id
 AND new_stage.key = om.new_key
WHERE h.stage_id = old_stage.id
  AND sp.service_category = 'Study Visa'
  AND sp.is_active = true
  AND new_stage.id <> old_stage.id;

DELETE FROM public.pipeline_stages ps
USING public.stage_pipelines sp,
      _study_orphan_map om
WHERE ps.pipeline_id = sp.id
  AND sp.service_category = 'Study Visa'
  AND sp.is_active = true
  AND ps.key = om.old_key;

-- Heuristic remap for any other stray keys (sort_order bands).
UPDATE public.clients c
SET
  current_stage_id = new_stage.id,
  updated_at = now()
FROM public.pipeline_stages old_stage
JOIN public.stage_pipelines sp ON sp.id = old_stage.pipeline_id
JOIN public.pipeline_stages new_stage
  ON new_stage.pipeline_id = old_stage.pipeline_id
 AND new_stage.key = CASE
   WHEN old_stage.sort_order <= 15 THEN 'enrolled'
   WHEN old_stage.sort_order <= 35 THEN 'payment_received'
   WHEN old_stage.sort_order <= 55 THEN 'docs_complete'
   WHEN old_stage.sort_order <= 63 THEN 'offer_letter'
   WHEN old_stage.sort_order <= 68 THEN 'tuition_paid'
   WHEN old_stage.sort_order <= 73 THEN 'visa_preparation'
   WHEN old_stage.sort_order <= 78 THEN 'visa_lodged'
   WHEN old_stage.sort_order <= 83 THEN 'biometrics_medical'
   WHEN old_stage.key ILIKE '%refus%' THEN 'visa_refused'
   ELSE 'visa_approved'
 END
WHERE c.current_stage_id = old_stage.id
  AND sp.service_category = 'Study Visa'
  AND sp.is_active = true
  AND old_stage.key NOT IN (SELECT key FROM _study_canonical_keys)
  AND new_stage.id <> old_stage.id;

UPDATE public.client_stage_history h
SET stage_id = new_stage.id
FROM public.pipeline_stages old_stage
JOIN public.stage_pipelines sp ON sp.id = old_stage.pipeline_id
JOIN public.pipeline_stages new_stage
  ON new_stage.pipeline_id = old_stage.pipeline_id
 AND new_stage.key = CASE
   WHEN old_stage.sort_order <= 15 THEN 'enrolled'
   WHEN old_stage.sort_order <= 35 THEN 'payment_received'
   WHEN old_stage.sort_order <= 55 THEN 'docs_complete'
   WHEN old_stage.sort_order <= 63 THEN 'offer_letter'
   WHEN old_stage.sort_order <= 68 THEN 'tuition_paid'
   WHEN old_stage.sort_order <= 73 THEN 'visa_preparation'
   WHEN old_stage.sort_order <= 78 THEN 'visa_lodged'
   WHEN old_stage.sort_order <= 83 THEN 'biometrics_medical'
   WHEN old_stage.key ILIKE '%refus%' THEN 'visa_refused'
   ELSE 'visa_approved'
 END
WHERE h.stage_id = old_stage.id
  AND sp.service_category = 'Study Visa'
  AND sp.is_active = true
  AND old_stage.key NOT IN (SELECT key FROM _study_canonical_keys)
  AND new_stage.id <> old_stage.id;

-- Drop any remaining non-canonical stages.
DELETE FROM public.pipeline_stages ps
USING public.stage_pipelines sp
WHERE ps.pipeline_id = sp.id
  AND sp.service_category = 'Study Visa'
  AND sp.is_active = true
  AND ps.key NOT IN (SELECT key FROM _study_canonical_keys);
