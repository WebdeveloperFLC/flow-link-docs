-- Apply FLC stage templates by visa service type (visitor / work / spouse / PR).
-- Study Visa pipelines are unchanged (already normalized to 12 steps).
-- Run after 20260617163000_cleanup_study_orphan_stages.sql

CREATE OR REPLACE FUNCTION public._pipeline_stage_template(_service_category text)
RETURNS text
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT CASE
    WHEN _service_category ILIKE '%Study Visa%'
      OR _service_category ILIKE '%Study Permit%'
      OR _service_category ILIKE '%Student%Pass%'
      OR _service_category ILIKE '%Student''s Pass%'
      OR _service_category ILIKE '%Student Residence%'
      OR _service_category ILIKE '%National D%'
      THEN 'study'
    WHEN _service_category ILIKE '%Visitor%'
      OR _service_category ILIKE '%Visitor Record%'
      OR _service_category ILIKE '%Type C%'
      OR _service_category ILIKE '%Short-Term Visit%'
      OR _service_category ILIKE '%Subclass 600%'
      OR _service_category ILIKE '%Caips%'
      OR _service_category ILIKE '%CAIPS%'
      THEN 'visitor'
    WHEN _service_category ILIKE '%Spouse%'
      OR _service_category ILIKE '%Dependent%'
      OR _service_category ILIKE '%Family%'
      OR _service_category ILIKE '%Super Visa%'
      OR _service_category ILIKE '%LTVP%'
      OR _service_category ILIKE '%Dependant%'
      THEN 'spouse'
    WHEN _service_category ILIKE '%Express Entry%'
      OR _service_category ILIKE '% PR%'
      OR _service_category ILIKE '%PNP%'
      OR _service_category ILIKE '%Oinp%'
      OR _service_category ILIKE '%OINP%'
      OR _service_category ILIKE '%Tr To Pr%'
      OR _service_category ILIKE '%Skilled Migration%'
      OR _service_category ILIKE '%Green Card%'
      OR _service_category ILIKE '%Subclass 189%'
      OR _service_category ILIKE '%Subclass 190%'
      OR _service_category ILIKE '%Subclass 491%'
      THEN 'pr'
    WHEN _service_category ILIKE '%Work%'
      OR _service_category ILIKE '%Permit%'
      OR _service_category ILIKE '%Employment%'
      OR _service_category ILIKE '%Blue Card%'
      OR _service_category ILIKE '%OWP%'
      OR _service_category ILIKE '%PGWP%'
      OR _service_category ILIKE '%BOWP%'
      OR _service_category ILIKE '%Opportunity%'
      OR _service_category ILIKE '%Graduate Route%'
      OR _service_category ILIKE '%Chancenkarte%'
      OR _service_category ILIKE '%Ausbildung%'
      OR _service_category ILIKE '%Job Seeker%'
      OR _service_category ILIKE '%Subclass 485%'
      THEN 'work'
    ELSE 'default'
  END;
$$;

CREATE TEMP TABLE _stage_tpl (
  template text NOT NULL,
  key text NOT NULL,
  label text NOT NULL,
  client_label text NOT NULL,
  sort_order int NOT NULL,
  color text NOT NULL,
  notify_client boolean NOT NULL DEFAULT false,
  is_client_visible boolean NOT NULL DEFAULT true,
  PRIMARY KEY (template, key)
) ON COMMIT DROP;

INSERT INTO _stage_tpl (template, key, label, client_label, sort_order, color, notify_client, is_client_visible)
VALUES
  ('visitor', 'enrolled', 'Enrolled', 'Enrolled', 10, '#6366f1', false, true),
  ('visitor', 'payment_pending', 'Consultancy fee pending', 'Fee payment pending', 20, '#f59e0b', false, true),
  ('visitor', 'payment_received', 'Consultancy fee received', 'Fee received', 30, '#22c55e', false, true),
  ('visitor', 'docs_collection', 'Docs collection', 'Collecting documents', 40, '#3b82f6', false, true),
  ('visitor', 'docs_complete', 'Docs complete', 'Documents ready', 50, '#06b6d4', false, true),
  ('visitor', 'visa_preparation', 'Visa file preparation', 'Preparing visa application', 60, '#6366f1', false, true),
  ('visitor', 'visa_lodged', 'Visa application lodged', 'Visa application submitted', 70, '#0ea5e9', true, true),
  ('visitor', 'biometrics_medical', 'Biometrics / medical', 'Biometrics or medical in progress', 80, '#14b8a6', false, true),
  ('visitor', 'visa_approved', 'Visa approved', 'Visa approved', 85, '#22c55e', true, true),
  ('visitor', 'visa_refused', 'Visa refused', 'Application outcome received', 90, '#ef4444', true, false),
  ('work', 'enrolled', 'Enrolled', 'Enrolled', 10, '#6366f1', false, true),
  ('work', 'payment_pending', 'Consultancy fee pending', 'Fee payment pending', 20, '#f59e0b', false, true),
  ('work', 'payment_received', 'Consultancy fee received', 'Fee received', 30, '#22c55e', false, true),
  ('work', 'docs_collection', 'Docs collection', 'Collecting documents', 40, '#3b82f6', false, true),
  ('work', 'docs_complete', 'Docs complete', 'Documents ready', 50, '#06b6d4', false, true),
  ('work', 'job_offer_lmia', 'Job offer / LMIA secured', 'Employer documents confirmed', 60, '#8b5cf6', false, true),
  ('work', 'visa_preparation', 'Work permit preparation', 'Preparing work permit file', 65, '#6366f1', false, true),
  ('work', 'visa_lodged', 'Application lodged', 'Work permit application submitted', 70, '#0ea5e9', true, true),
  ('work', 'biometrics_medical', 'Biometrics / medical', 'Biometrics or medical in progress', 80, '#14b8a6', false, true),
  ('work', 'visa_approved', 'Permit approved', 'Work permit approved', 85, '#22c55e', true, true),
  ('work', 'visa_refused', 'Permit refused', 'Application outcome received', 90, '#ef4444', true, false),
  ('spouse', 'enrolled', 'Enrolled', 'Enrolled', 10, '#6366f1', false, true),
  ('spouse', 'payment_pending', 'Consultancy fee pending', 'Fee payment pending', 20, '#f59e0b', false, true),
  ('spouse', 'payment_received', 'Consultancy fee received', 'Fee received', 30, '#22c55e', false, true),
  ('spouse', 'docs_collection', 'Docs collection', 'Collecting documents', 40, '#3b82f6', false, true),
  ('spouse', 'docs_complete', 'Docs complete', 'Documents ready', 50, '#06b6d4', false, true),
  ('spouse', 'relationship_verified', 'Relationship / sponsor verified', 'Relationship evidence confirmed', 60, '#a855f7', false, true),
  ('spouse', 'visa_preparation', 'Application preparation', 'Preparing family visa file', 65, '#6366f1', false, true),
  ('spouse', 'visa_lodged', 'Application lodged', 'Family visa application submitted', 70, '#0ea5e9', true, true),
  ('spouse', 'biometrics_medical', 'Biometrics / medical', 'Biometrics or medical in progress', 80, '#14b8a6', false, true),
  ('spouse', 'visa_approved', 'Visa approved', 'Visa approved', 85, '#22c55e', true, true),
  ('spouse', 'visa_refused', 'Visa refused', 'Application outcome received', 90, '#ef4444', true, false),
  ('pr', 'enrolled', 'Enrolled', 'Enrolled', 10, '#6366f1', false, true),
  ('pr', 'payment_pending', 'Consultancy fee pending', 'Fee payment pending', 20, '#f59e0b', false, true),
  ('pr', 'payment_received', 'Consultancy fee received', 'Fee received', 30, '#22c55e', false, true),
  ('pr', 'docs_collection', 'Docs collection', 'Collecting documents', 40, '#3b82f6', false, true),
  ('pr', 'docs_complete', 'Docs complete', 'Documents ready', 50, '#06b6d4', false, true),
  ('pr', 'profile_eoi', 'Profile / EOI submitted', 'Profile or EOI in pool', 60, '#8b5cf6', false, true),
  ('pr', 'invitation_ita', 'ITA / nomination received', 'Invitation to apply received', 65, '#a855f7', false, true),
  ('pr', 'visa_lodged', 'PR application lodged', 'Permanent residence application submitted', 70, '#0ea5e9', true, true),
  ('pr', 'biometrics_medical', 'Biometrics / medical', 'Biometrics or medical in progress', 80, '#14b8a6', false, true),
  ('pr', 'visa_approved', 'PR confirmed', 'Permanent residence approved', 85, '#22c55e', true, true),
  ('pr', 'visa_refused', 'Application refused', 'Application outcome received', 90, '#ef4444', true, false);

CREATE TEMP TABLE _stage_legacy_map (
  old_key text PRIMARY KEY,
  new_key text NOT NULL
) ON COMMIT DROP;

INSERT INTO _stage_legacy_map (old_key, new_key)
VALUES
  ('application_submitted', 'visa_lodged'),
  ('decision_received', 'visa_approved'),
  ('visa_prep', 'visa_preparation'),
  ('visa_submitted', 'visa_lodged'),
  ('biometrics', 'biometrics_medical'),
  ('medical', 'biometrics_medical'),
  ('approval', 'visa_approved'),
  ('offer_applied', 'job_offer_lmia'),
  ('offer_received', 'job_offer_lmia'),
  ('offer_letter', 'job_offer_lmia'),
  ('tuition_pending', 'visa_preparation'),
  ('tuition_paid', 'visa_preparation'),
  ('gic_done', 'visa_preparation'),
  ('pre_departure', 'visa_approved'),
  ('landed', 'visa_approved'),
  ('additional_docs', 'docs_collection'),
  ('coe_received', 'relationship_verified');

-- Upsert canonical stages for non-study active pipelines.
INSERT INTO public.pipeline_stages (
  pipeline_id, key, label, client_label, sort_order, color, notify_client, is_client_visible
)
SELECT
  sp.id,
  tpl.key,
  tpl.label,
  tpl.client_label,
  tpl.sort_order,
  tpl.color,
  tpl.notify_client,
  tpl.is_client_visible
FROM public.stage_pipelines sp
JOIN _stage_tpl tpl
  ON tpl.template = public._pipeline_stage_template(sp.service_category)
WHERE sp.is_active = true
  AND public._pipeline_stage_template(sp.service_category) <> 'study'
  AND public._pipeline_stage_template(sp.service_category) <> 'default'
  AND NOT EXISTS (
    SELECT 1 FROM public.pipeline_stages ps
    WHERE ps.pipeline_id = sp.id AND ps.key = tpl.key
  );

UPDATE public.pipeline_stages ps
SET
  label = tpl.label,
  client_label = tpl.client_label,
  sort_order = tpl.sort_order,
  color = tpl.color,
  notify_client = tpl.notify_client,
  is_client_visible = tpl.is_client_visible
FROM public.stage_pipelines sp,
     _stage_tpl tpl
WHERE ps.pipeline_id = sp.id
  AND sp.is_active = true
  AND tpl.template = public._pipeline_stage_template(sp.service_category)
  AND public._pipeline_stage_template(sp.service_category) NOT IN ('study', 'default')
  AND ps.key = tpl.key;

-- Remap clients off retired keys (non-study only).
UPDATE public.clients c
SET current_stage_id = new_stage.id, updated_at = now()
FROM public.pipeline_stages old_stage
JOIN public.stage_pipelines sp ON sp.id = old_stage.pipeline_id
JOIN _stage_legacy_map lm ON lm.old_key = old_stage.key
JOIN public.pipeline_stages new_stage
  ON new_stage.pipeline_id = old_stage.pipeline_id AND new_stage.key = lm.new_key
WHERE c.current_stage_id = old_stage.id
  AND sp.is_active = true
  AND public._pipeline_stage_template(sp.service_category) NOT IN ('study', 'default')
  AND new_stage.id <> old_stage.id;

UPDATE public.client_stage_history h
SET stage_id = new_stage.id
FROM public.pipeline_stages old_stage
JOIN public.stage_pipelines sp ON sp.id = old_stage.pipeline_id
JOIN _stage_legacy_map lm ON lm.old_key = old_stage.key
JOIN public.pipeline_stages new_stage
  ON new_stage.pipeline_id = old_stage.pipeline_id AND new_stage.key = lm.new_key
WHERE h.stage_id = old_stage.id
  AND sp.is_active = true
  AND public._pipeline_stage_template(sp.service_category) NOT IN ('study', 'default')
  AND new_stage.id <> old_stage.id;

-- Heuristic remap for stray keys on non-study pipelines.
UPDATE public.clients c
SET current_stage_id = new_stage.id, updated_at = now()
FROM public.pipeline_stages old_stage
JOIN public.stage_pipelines sp ON sp.id = old_stage.pipeline_id
JOIN _stage_tpl tpl ON tpl.template = public._pipeline_stage_template(sp.service_category)
JOIN public.pipeline_stages new_stage
  ON new_stage.pipeline_id = old_stage.pipeline_id
 AND new_stage.key = CASE
   WHEN old_stage.sort_order <= 15 THEN 'enrolled'
   WHEN old_stage.sort_order <= 35 THEN 'payment_received'
   WHEN old_stage.sort_order <= 55 THEN 'docs_complete'
   WHEN old_stage.key ILIKE '%refus%' THEN 'visa_refused'
   WHEN public._pipeline_stage_template(sp.service_category) = 'pr' AND old_stage.sort_order <= 63 THEN 'profile_eoi'
   WHEN public._pipeline_stage_template(sp.service_category) = 'work' AND old_stage.sort_order <= 63 THEN 'job_offer_lmia'
   WHEN public._pipeline_stage_template(sp.service_category) = 'spouse' AND old_stage.sort_order <= 63 THEN 'relationship_verified'
   WHEN old_stage.sort_order <= 73 THEN 'visa_preparation'
   WHEN old_stage.sort_order <= 78 THEN 'visa_lodged'
   WHEN old_stage.sort_order <= 83 THEN 'biometrics_medical'
   ELSE 'visa_approved'
 END
WHERE c.current_stage_id = old_stage.id
  AND sp.is_active = true
  AND public._pipeline_stage_template(sp.service_category) NOT IN ('study', 'default')
  AND old_stage.key NOT IN (SELECT key FROM _stage_tpl WHERE template = public._pipeline_stage_template(sp.service_category))
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
   WHEN old_stage.key ILIKE '%refus%' THEN 'visa_refused'
   WHEN public._pipeline_stage_template(sp.service_category) = 'pr' AND old_stage.sort_order <= 63 THEN 'profile_eoi'
   WHEN public._pipeline_stage_template(sp.service_category) = 'work' AND old_stage.sort_order <= 63 THEN 'job_offer_lmia'
   WHEN public._pipeline_stage_template(sp.service_category) = 'spouse' AND old_stage.sort_order <= 63 THEN 'relationship_verified'
   WHEN old_stage.sort_order <= 73 THEN 'visa_preparation'
   WHEN old_stage.sort_order <= 78 THEN 'visa_lodged'
   WHEN old_stage.sort_order <= 83 THEN 'biometrics_medical'
   ELSE 'visa_approved'
 END
WHERE h.stage_id = old_stage.id
  AND sp.is_active = true
  AND public._pipeline_stage_template(sp.service_category) NOT IN ('study', 'default')
  AND old_stage.key NOT IN (SELECT key FROM _stage_tpl WHERE template = public._pipeline_stage_template(sp.service_category))
  AND new_stage.id <> old_stage.id;

-- Drop non-canonical stages on typed pipelines.
DELETE FROM public.pipeline_stages ps
USING public.stage_pipelines sp
WHERE ps.pipeline_id = sp.id
  AND sp.is_active = true
  AND public._pipeline_stage_template(sp.service_category) NOT IN ('study', 'default')
  AND ps.key NOT IN (
    SELECT tpl.key FROM _stage_tpl tpl
    WHERE tpl.template = public._pipeline_stage_template(sp.service_category)
  );

COMMENT ON FUNCTION public._pipeline_stage_template IS
  'Maps stage_pipelines.service_category to FLC stage template: study|visitor|work|spouse|pr|default.';
