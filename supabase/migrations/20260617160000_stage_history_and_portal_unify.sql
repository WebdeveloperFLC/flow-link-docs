-- Log pipeline stage changes, sync legacy lead_stage, notify clients when configured.

ALTER TABLE public.clients
  ADD COLUMN IF NOT EXISTS internal_sub_status text,
  ADD COLUMN IF NOT EXISTS internal_sub_status_note text;

CREATE OR REPLACE FUNCTION public.fn_sync_client_stage_before()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  stage_row public.pipeline_stages%ROWTYPE;
BEGIN
  IF TG_OP = 'UPDATE'
     AND NEW.current_stage_id IS NOT NULL
     AND (
       NEW.current_stage_id IS DISTINCT FROM OLD.current_stage_id
       OR NEW.pipeline_id IS DISTINCT FROM OLD.pipeline_id
     ) THEN
    SELECT * INTO stage_row
    FROM public.pipeline_stages
    WHERE id = NEW.current_stage_id;

    IF stage_row.id IS NOT NULL THEN
      NEW.lead_stage := COALESCE(NULLIF(trim(stage_row.client_label), ''), stage_row.label);
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.fn_log_client_stage_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  stage_row public.pipeline_stages%ROWTYPE;
BEGIN
  IF TG_OP <> 'UPDATE' THEN
    RETURN NEW;
  END IF;

  IF NEW.pipeline_id IS NULL OR NEW.current_stage_id IS NULL THEN
    RETURN NEW;
  END IF;

  IF NEW.current_stage_id IS NOT DISTINCT FROM OLD.current_stage_id
     AND NEW.pipeline_id IS NOT DISTINCT FROM OLD.pipeline_id THEN
    RETURN NEW;
  END IF;

  SELECT * INTO stage_row
  FROM public.pipeline_stages
  WHERE id = NEW.current_stage_id;

  INSERT INTO public.client_stage_history (
    client_id,
    pipeline_id,
    stage_id,
    entered_by,
    metadata
  )
  VALUES (
    NEW.id,
    NEW.pipeline_id,
    NEW.current_stage_id,
    auth.uid(),
    jsonb_build_object(
      'from_stage_id', OLD.current_stage_id,
      'from_pipeline_id', OLD.pipeline_id,
      'sub_status', NEW.internal_sub_status
    )
  );

  INSERT INTO public.client_timeline (client_id, event_type, actor_id, summary, metadata)
  VALUES (
    NEW.id,
    'stage_change',
    auth.uid(),
    'Stage: ' || COALESCE(stage_row.label, 'Updated'),
    jsonb_build_object(
      'pipeline_id', NEW.pipeline_id,
      'stage_id', NEW.current_stage_id,
      'stage_key', stage_row.key,
      'from_stage_id', OLD.current_stage_id,
      'sub_status', NEW.internal_sub_status
    )
  );

  IF COALESCE(stage_row.notify_client, false) THEN
    INSERT INTO public.client_notifications (client_id, type, title, body, link)
    VALUES (
      NEW.id,
      'stage_update',
      'Application progress updated',
      COALESCE(
        NULLIF(trim(stage_row.client_label), ''),
        stage_row.label,
        'Your application has moved to a new stage.'
      ),
      '/portal/application'
    );
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_sync_client_stage_before ON public.clients;
CREATE TRIGGER trg_sync_client_stage_before
  BEFORE UPDATE OF pipeline_id, current_stage_id ON public.clients
  FOR EACH ROW
  EXECUTE FUNCTION public.fn_sync_client_stage_before();

DROP TRIGGER IF EXISTS trg_log_client_stage_change ON public.clients;
CREATE TRIGGER trg_log_client_stage_change
  AFTER UPDATE OF pipeline_id, current_stage_id ON public.clients
  FOR EACH ROW
  EXECUTE FUNCTION public.fn_log_client_stage_change();

COMMENT ON FUNCTION public.fn_sync_client_stage_before IS
  'Keeps clients.lead_stage aligned with pipeline stage client_label (legacy portal compat).';
COMMENT ON FUNCTION public.fn_log_client_stage_change IS
  'Writes client_stage_history, timeline, and optional portal notification on stage change.';
