-- Fix pipeline template classification: OINP, Study Permit Extension, CAIPS Notes.
-- Run after 20260617165000_expand_service_pipeline_stages.sql

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

-- Re-sync stages for pipelines that were misclassified (7 default or wrong template).
DO $$
DECLARE
  rec record;
  tpl text;
BEGIN
  FOR rec IN
    SELECT id, service_category
    FROM public.stage_pipelines
    WHERE is_active = true
      AND service_category IN ('Oinp', 'Caips Notes', 'Study Permit Extension')
  LOOP
    tpl := public._pipeline_stage_template(rec.service_category);

    INSERT INTO public.pipeline_stages (
      pipeline_id, key, label, client_label, sort_order, color, notify_client, is_client_visible
    )
    SELECT rec.id, s.key, s.label, s.client_label, s.sort_order, s.color, s.notify_client, s.is_client_visible
    FROM (
      VALUES
        ('visitor', 'enrolled', 'Enrolled', 'Enrolled', 10, '#6366f1', false, true),
        ('visitor', 'payment_pending', 'Consultancy fee pending', 'Fee payment pending', 20, '#f59e0b', false, true),
        ('visitor', 'payment_received', 'Consultancy fee received', 'Fee received', 30, '#22c55e', false, true),
        ('visitor', 'docs_collection', 'Docs collection', 'Collecting documents', 40, '#3b82f6', false, true),
        ('visitor', 'docs_complete', 'Docs complete', 'Documents ready', 50, '#06b6d4', false, true),
        ('visitor', 'visa_preparation', 'Request preparation', 'Preparing CAIPS request', 60, '#6366f1', false, true),
        ('visitor', 'visa_lodged', 'Request lodged', 'CAIPS request submitted', 70, '#0ea5e9', true, true),
        ('visitor', 'biometrics_medical', 'Processing', 'Awaiting IRCC response', 80, '#14b8a6', false, true),
        ('visitor', 'visa_approved', 'Notes received', 'CAIPS notes delivered', 85, '#22c55e', true, true),
        ('visitor', 'visa_refused', 'Case closed', 'Request closed', 90, '#ef4444', true, false),
        ('pr', 'enrolled', 'Enrolled', 'Enrolled', 10, '#6366f1', false, true),
        ('pr', 'payment_pending', 'Consultancy fee pending', 'Fee payment pending', 20, '#f59e0b', false, true),
        ('pr', 'payment_received', 'Consultancy fee received', 'Fee received', 30, '#22c55e', false, true),
        ('pr', 'docs_collection', 'Docs collection', 'Collecting documents', 40, '#3b82f6', false, true),
        ('pr', 'docs_complete', 'Docs complete', 'Documents ready', 50, '#06b6d4', false, true),
        ('pr', 'profile_eoi', 'Profile / EOI submitted', 'OINP EOI in pool', 60, '#8b5cf6', false, true),
        ('pr', 'invitation_ita', 'ITA / nomination received', 'OINP invitation received', 65, '#a855f7', false, true),
        ('pr', 'visa_lodged', 'PR application lodged', 'Application submitted', 70, '#0ea5e9', true, true),
        ('pr', 'biometrics_medical', 'Biometrics / medical', 'Biometrics or medical in progress', 80, '#14b8a6', false, true),
        ('pr', 'visa_approved', 'PR confirmed', 'Nomination / PR approved', 85, '#22c55e', true, true),
        ('pr', 'visa_refused', 'Application refused', 'Application outcome received', 90, '#ef4444', true, false),
        ('study', 'enrolled', 'Enrolled', 'Enrolled', 10, '#6366f1', false, true),
        ('study', 'payment_pending', 'Consultancy fee pending', 'Fee payment pending', 20, '#f59e0b', false, true),
        ('study', 'payment_received', 'Consultancy fee received', 'Fee received', 30, '#22c55e', false, true),
        ('study', 'docs_collection', 'Docs collection', 'Collecting documents', 40, '#3b82f6', false, true),
        ('study', 'docs_complete', 'Docs complete', 'Documents ready', 50, '#06b6d4', false, true),
        ('study', 'offer_letter', 'LOA / enrollment confirmed', 'School enrollment confirmed', 60, '#8b5cf6', false, true),
        ('study', 'tuition_paid', 'Fees confirmed', 'Extension fees confirmed', 65, '#a855f7', false, true),
        ('study', 'visa_preparation', 'Extension file preparation', 'Preparing extension application', 70, '#6366f1', false, true),
        ('study', 'visa_lodged', 'Extension lodged', 'Extension application submitted', 75, '#0ea5e9', true, true),
        ('study', 'biometrics_medical', 'Biometrics / medical', 'Biometrics or medical in progress', 80, '#14b8a6', false, true),
        ('study', 'visa_approved', 'Extension approved', 'Study permit extended', 85, '#22c55e', true, true),
        ('study', 'visa_refused', 'Extension refused', 'Application outcome received', 90, '#ef4444', true, false)
    ) AS s(template, key, label, client_label, sort_order, color, notify_client, is_client_visible)
    WHERE s.template = tpl
      AND NOT EXISTS (
        SELECT 1 FROM public.pipeline_stages ps
        WHERE ps.pipeline_id = rec.id AND ps.key = s.key
      );

    UPDATE public.pipeline_stages ps
    SET
      label = s.label,
      client_label = s.client_label,
      sort_order = s.sort_order,
      color = s.color,
      notify_client = s.notify_client,
      is_client_visible = s.is_client_visible
    FROM (
      VALUES
        ('visitor', 'enrolled', 'Enrolled', 'Enrolled', 10, '#6366f1', false, true),
        ('visitor', 'payment_pending', 'Consultancy fee pending', 'Fee payment pending', 20, '#f59e0b', false, true),
        ('visitor', 'payment_received', 'Consultancy fee received', 'Fee received', 30, '#22c55e', false, true),
        ('visitor', 'docs_collection', 'Docs collection', 'Collecting documents', 40, '#3b82f6', false, true),
        ('visitor', 'docs_complete', 'Docs complete', 'Documents ready', 50, '#06b6d4', false, true),
        ('visitor', 'visa_preparation', 'Request preparation', 'Preparing CAIPS request', 60, '#6366f1', false, true),
        ('visitor', 'visa_lodged', 'Request lodged', 'CAIPS request submitted', 70, '#0ea5e9', true, true),
        ('visitor', 'biometrics_medical', 'Processing', 'Awaiting IRCC response', 80, '#14b8a6', false, true),
        ('visitor', 'visa_approved', 'Notes received', 'CAIPS notes delivered', 85, '#22c55e', true, true),
        ('visitor', 'visa_refused', 'Case closed', 'Request closed', 90, '#ef4444', true, false),
        ('pr', 'enrolled', 'Enrolled', 'Enrolled', 10, '#6366f1', false, true),
        ('pr', 'payment_pending', 'Consultancy fee pending', 'Fee payment pending', 20, '#f59e0b', false, true),
        ('pr', 'payment_received', 'Consultancy fee received', 'Fee received', 30, '#22c55e', false, true),
        ('pr', 'docs_collection', 'Docs collection', 'Collecting documents', 40, '#3b82f6', false, true),
        ('pr', 'docs_complete', 'Docs complete', 'Documents ready', 50, '#06b6d4', false, true),
        ('pr', 'profile_eoi', 'Profile / EOI submitted', 'OINP EOI in pool', 60, '#8b5cf6', false, true),
        ('pr', 'invitation_ita', 'ITA / nomination received', 'OINP invitation received', 65, '#a855f7', false, true),
        ('pr', 'visa_lodged', 'PR application lodged', 'Application submitted', 70, '#0ea5e9', true, true),
        ('pr', 'biometrics_medical', 'Biometrics / medical', 'Biometrics or medical in progress', 80, '#14b8a6', false, true),
        ('pr', 'visa_approved', 'PR confirmed', 'Nomination / PR approved', 85, '#22c55e', true, true),
        ('pr', 'visa_refused', 'Application refused', 'Application outcome received', 90, '#ef4444', true, false),
        ('study', 'enrolled', 'Enrolled', 'Enrolled', 10, '#6366f1', false, true),
        ('study', 'payment_pending', 'Consultancy fee pending', 'Fee payment pending', 20, '#f59e0b', false, true),
        ('study', 'payment_received', 'Consultancy fee received', 'Fee received', 30, '#22c55e', false, true),
        ('study', 'docs_collection', 'Docs collection', 'Collecting documents', 40, '#3b82f6', false, true),
        ('study', 'docs_complete', 'Docs complete', 'Documents ready', 50, '#06b6d4', false, true),
        ('study', 'offer_letter', 'LOA / enrollment confirmed', 'School enrollment confirmed', 60, '#8b5cf6', false, true),
        ('study', 'tuition_paid', 'Fees confirmed', 'Extension fees confirmed', 65, '#a855f7', false, true),
        ('study', 'visa_preparation', 'Extension file preparation', 'Preparing extension application', 70, '#6366f1', false, true),
        ('study', 'visa_lodged', 'Extension lodged', 'Extension application submitted', 75, '#0ea5e9', true, true),
        ('study', 'biometrics_medical', 'Biometrics / medical', 'Biometrics or medical in progress', 80, '#14b8a6', false, true),
        ('study', 'visa_approved', 'Extension approved', 'Study permit extended', 85, '#22c55e', true, true),
        ('study', 'visa_refused', 'Extension refused', 'Application outcome received', 90, '#ef4444', true, false)
    ) AS s(template, key, label, client_label, sort_order, color, notify_client, is_client_visible)
    WHERE ps.pipeline_id = rec.id
      AND ps.key = s.key
      AND s.template = tpl;

    -- Remap clients off keys being removed (work/default leftovers).
    UPDATE public.clients c
    SET current_stage_id = keep_stage.id, updated_at = now()
    FROM public.pipeline_stages drop_stage
    JOIN public.pipeline_stages keep_stage
      ON keep_stage.pipeline_id = drop_stage.pipeline_id
     AND keep_stage.key = CASE drop_stage.key
       WHEN 'application_submitted' THEN 'visa_lodged'
       WHEN 'decision_received' THEN 'visa_approved'
       WHEN 'job_offer_lmia' THEN 'offer_letter'
       ELSE 'docs_complete'
     END
    WHERE c.current_stage_id = drop_stage.id
      AND drop_stage.pipeline_id = rec.id
      AND drop_stage.key NOT IN (
        SELECT s.key FROM (
          VALUES
            ('visitor', 'enrolled'), ('visitor', 'payment_pending'), ('visitor', 'payment_received'),
            ('visitor', 'docs_collection'), ('visitor', 'docs_complete'), ('visitor', 'visa_preparation'),
            ('visitor', 'visa_lodged'), ('visitor', 'biometrics_medical'), ('visitor', 'visa_approved'), ('visitor', 'visa_refused'),
            ('pr', 'enrolled'), ('pr', 'payment_pending'), ('pr', 'payment_received'),
            ('pr', 'docs_collection'), ('pr', 'docs_complete'), ('pr', 'profile_eoi'),
            ('pr', 'invitation_ita'), ('pr', 'visa_lodged'), ('pr', 'biometrics_medical'),
            ('pr', 'visa_approved'), ('pr', 'visa_refused'),
            ('study', 'enrolled'), ('study', 'payment_pending'), ('study', 'payment_received'),
            ('study', 'docs_collection'), ('study', 'docs_complete'), ('study', 'offer_letter'),
            ('study', 'tuition_paid'), ('study', 'visa_preparation'), ('study', 'visa_lodged'),
            ('study', 'biometrics_medical'), ('study', 'visa_approved'), ('study', 'visa_refused')
        ) AS s(template, key)
        WHERE s.template = tpl
      );

    DELETE FROM public.pipeline_stages ps
    WHERE ps.pipeline_id = rec.id
      AND ps.key NOT IN (
        SELECT s.key FROM (
          VALUES
            ('visitor', 'enrolled'), ('visitor', 'payment_pending'), ('visitor', 'payment_received'),
            ('visitor', 'docs_collection'), ('visitor', 'docs_complete'), ('visitor', 'visa_preparation'),
            ('visitor', 'visa_lodged'), ('visitor', 'biometrics_medical'), ('visitor', 'visa_approved'), ('visitor', 'visa_refused'),
            ('pr', 'enrolled'), ('pr', 'payment_pending'), ('pr', 'payment_received'),
            ('pr', 'docs_collection'), ('pr', 'docs_complete'), ('pr', 'profile_eoi'),
            ('pr', 'invitation_ita'), ('pr', 'visa_lodged'), ('pr', 'biometrics_medical'),
            ('pr', 'visa_approved'), ('pr', 'visa_refused'),
            ('study', 'enrolled'), ('study', 'payment_pending'), ('study', 'payment_received'),
            ('study', 'docs_collection'), ('study', 'docs_complete'), ('study', 'offer_letter'),
            ('study', 'tuition_paid'), ('study', 'visa_preparation'), ('study', 'visa_lodged'),
            ('study', 'biometrics_medical'), ('study', 'visa_approved'), ('study', 'visa_refused')
        ) AS s(template, key)
        WHERE s.template = tpl
      );
  END LOOP;
END $$;
