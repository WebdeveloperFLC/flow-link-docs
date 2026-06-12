-- Retire legacy Study Visa stage keys (pre-FLC bootstrap) and keep the 12-step FLC template.
-- Run after 20260617161000_expand_study_pipeline_stages.sql.

-- Canonical FLC study stages (key -> sort_order)
CREATE TEMP TABLE _study_stage_canonical (
  key text PRIMARY KEY,
  label text NOT NULL,
  client_label text NOT NULL,
  sort_order int NOT NULL,
  color text NOT NULL,
  notify_client boolean NOT NULL DEFAULT false,
  is_client_visible boolean NOT NULL DEFAULT true
) ON COMMIT DROP;

INSERT INTO _study_stage_canonical (key, label, client_label, sort_order, color, notify_client, is_client_visible)
VALUES
  ('enrolled', 'Enrolled', 'Enrolled', 10, '#6366f1', false, true),
  ('payment_pending', 'Consultancy fee pending', 'Fee payment pending', 20, '#f59e0b', false, true),
  ('payment_received', 'Consultancy fee received', 'Fee received', 30, '#22c55e', false, true),
  ('docs_collection', 'Docs collection', 'Collecting documents', 40, '#3b82f6', false, true),
  ('docs_complete', 'Docs complete', 'Documents ready', 50, '#06b6d4', false, true),
  ('offer_letter', 'LOA / offer secured', 'Offer letter received', 60, '#8b5cf6', false, true),
  ('tuition_paid', 'Tuition deposit paid', 'Tuition payment confirmed', 65, '#a855f7', false, true),
  ('visa_preparation', 'Visa file preparation', 'Preparing visa application', 70, '#6366f1', false, true),
  ('visa_lodged', 'Visa application lodged', 'Visa application submitted', 75, '#0ea5e9', true, true),
  ('biometrics_medical', 'Biometrics / medical', 'Biometrics or medical in progress', 80, '#14b8a6', false, true),
  ('visa_approved', 'Visa approved', 'Visa approved', 85, '#22c55e', true, true),
  ('visa_refused', 'Visa refused', 'Application outcome received', 90, '#ef4444', true, false);

CREATE TEMP TABLE _study_stage_legacy_map (
  old_key text PRIMARY KEY,
  new_key text NOT NULL
) ON COMMIT DROP;

INSERT INTO _study_stage_legacy_map (old_key, new_key)
VALUES
  ('offer_applied', 'offer_letter'),
  ('offer_received', 'offer_letter'),
  ('tuition_pending', 'tuition_paid'),
  ('gic_done', 'tuition_paid'),
  ('visa_prep', 'visa_preparation'),
  ('visa_submitted', 'visa_lodged'),
  ('biometrics', 'biometrics_medical'),
  ('medical', 'biometrics_medical'),
  ('additional_docs', 'docs_collection'),
  ('approval', 'visa_approved'),
  ('pre_departure', 'visa_approved'),
  ('landed', 'visa_approved'),
  ('application_submitted', 'visa_lodged'),
  ('decision_received', 'visa_approved');

-- Ensure canonical stages exist on every active Study Visa pipeline.
INSERT INTO public.pipeline_stages (
  pipeline_id, key, label, client_label, sort_order, color, notify_client, is_client_visible
)
SELECT
  sp.id,
  c.key,
  c.label,
  c.client_label,
  c.sort_order,
  c.color,
  c.notify_client,
  c.is_client_visible
FROM public.stage_pipelines sp
CROSS JOIN _study_stage_canonical c
WHERE sp.service_category = 'Study Visa'
  AND sp.is_active = true
  AND NOT EXISTS (
    SELECT 1
    FROM public.pipeline_stages ps
    WHERE ps.pipeline_id = sp.id
      AND ps.key = c.key
  );

-- Normalize labels / sort order on canonical rows.
UPDATE public.pipeline_stages ps
SET
  label = c.label,
  client_label = c.client_label,
  sort_order = c.sort_order,
  color = c.color,
  notify_client = c.notify_client,
  is_client_visible = c.is_client_visible
FROM public.stage_pipelines sp,
     _study_stage_canonical c
WHERE ps.pipeline_id = sp.id
  AND sp.service_category = 'Study Visa'
  AND sp.is_active = true
  AND ps.key = c.key;

-- Remap clients off retired keys.
UPDATE public.clients c
SET
  current_stage_id = new_stage.id,
  updated_at = now()
FROM public.pipeline_stages old_stage
JOIN public.stage_pipelines sp ON sp.id = old_stage.pipeline_id
JOIN _study_stage_legacy_map lm ON lm.old_key = old_stage.key
JOIN public.pipeline_stages new_stage
  ON new_stage.pipeline_id = old_stage.pipeline_id
 AND new_stage.key = lm.new_key
WHERE c.current_stage_id = old_stage.id
  AND sp.service_category = 'Study Visa'
  AND sp.is_active = true
  AND new_stage.id <> old_stage.id;

-- Remap stage history so retired rows can be deleted.
UPDATE public.client_stage_history h
SET stage_id = new_stage.id
FROM public.pipeline_stages old_stage
JOIN public.stage_pipelines sp ON sp.id = old_stage.pipeline_id
JOIN _study_stage_legacy_map lm ON lm.old_key = old_stage.key
JOIN public.pipeline_stages new_stage
  ON new_stage.pipeline_id = old_stage.pipeline_id
 AND new_stage.key = lm.new_key
WHERE h.stage_id = old_stage.id
  AND sp.service_category = 'Study Visa'
  AND sp.is_active = true
  AND new_stage.id <> old_stage.id;

-- Drop retired stage rows (no remaining FK references after remap).
DELETE FROM public.pipeline_stages ps
USING public.stage_pipelines sp,
      _study_stage_legacy_map lm
WHERE ps.pipeline_id = sp.id
  AND sp.service_category = 'Study Visa'
  AND sp.is_active = true
  AND ps.key = lm.old_key;
