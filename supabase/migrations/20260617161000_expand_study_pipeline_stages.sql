-- Remap clients on retired study pipeline stage keys after FLC stage expansion.
-- Run after 20260617100000_seed_stage_pipelines.sql (regenerated) or re-apply study stage upserts.

UPDATE public.clients c
SET
  current_stage_id = new_stage.id,
  updated_at = now()
FROM public.pipeline_stages old_stage
JOIN public.pipeline_stages new_stage
  ON new_stage.pipeline_id = old_stage.pipeline_id
 AND new_stage.key = CASE old_stage.key
   WHEN 'application_submitted' THEN 'visa_lodged'
   WHEN 'decision_received' THEN 'visa_approved'
   ELSE old_stage.key
 END
WHERE c.current_stage_id = old_stage.id
  AND old_stage.key IN ('application_submitted', 'decision_received')
  AND new_stage.id IS NOT NULL
  AND new_stage.id <> old_stage.id;

-- Study Visa pipelines: ensure new stage keys exist (safe if seed already applied)
DO $$
DECLARE
  rec record;
  pid uuid;
BEGIN
  FOR rec IN
    SELECT id FROM public.stage_pipelines
    WHERE service_category = 'Study Visa' AND is_active = true
  LOOP
    pid := rec.id;
    PERFORM 1 FROM public.pipeline_stages ps WHERE ps.pipeline_id = pid AND ps.key = 'tuition_paid';
    IF NOT FOUND THEN
      INSERT INTO public.pipeline_stages (pipeline_id, key, label, client_label, sort_order, color, notify_client, is_client_visible)
      VALUES (pid, 'tuition_paid', 'Tuition deposit paid', 'Tuition payment confirmed', 65, '#a855f7', false, true);
    END IF;
    PERFORM 1 FROM public.pipeline_stages ps WHERE ps.pipeline_id = pid AND ps.key = 'visa_preparation';
    IF NOT FOUND THEN
      INSERT INTO public.pipeline_stages (pipeline_id, key, label, client_label, sort_order, color, notify_client, is_client_visible)
      VALUES (pid, 'visa_preparation', 'Visa file preparation', 'Preparing visa application', 70, '#6366f1', false, true);
    END IF;
    PERFORM 1 FROM public.pipeline_stages ps WHERE ps.pipeline_id = pid AND ps.key = 'visa_lodged';
    IF NOT FOUND THEN
      INSERT INTO public.pipeline_stages (pipeline_id, key, label, client_label, sort_order, color, notify_client, is_client_visible)
      VALUES (pid, 'visa_lodged', 'Visa application lodged', 'Visa application submitted', 75, '#0ea5e9', true, true);
    END IF;
    PERFORM 1 FROM public.pipeline_stages ps WHERE ps.pipeline_id = pid AND ps.key = 'biometrics_medical';
    IF NOT FOUND THEN
      INSERT INTO public.pipeline_stages (pipeline_id, key, label, client_label, sort_order, color, notify_client, is_client_visible)
      VALUES (pid, 'biometrics_medical', 'Biometrics / medical', 'Biometrics or medical in progress', 80, '#14b8a6', false, true);
    END IF;
    PERFORM 1 FROM public.pipeline_stages ps WHERE ps.pipeline_id = pid AND ps.key = 'visa_approved';
    IF NOT FOUND THEN
      INSERT INTO public.pipeline_stages (pipeline_id, key, label, client_label, sort_order, color, notify_client, is_client_visible)
      VALUES (pid, 'visa_approved', 'Visa approved', 'Visa approved', 85, '#22c55e', true, true);
    END IF;
    PERFORM 1 FROM public.pipeline_stages ps WHERE ps.pipeline_id = pid AND ps.key = 'visa_refused';
    IF NOT FOUND THEN
      INSERT INTO public.pipeline_stages (pipeline_id, key, label, client_label, sort_order, color, notify_client, is_client_visible)
      VALUES (pid, 'visa_refused', 'Visa refused', 'Application outcome received', 90, '#ef4444', true, false);
    END IF;
  END LOOP;
END $$;
