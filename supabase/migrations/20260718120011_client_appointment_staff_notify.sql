-- Portal appointment requests → staff bell notifications + client timeline

CREATE OR REPLACE FUNCTION public.fn_notify_client_appointment_requested()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  uid uuid;
  when_label text;
  client_name text;
BEGIN
  when_label := to_char(NEW.scheduled_at AT TIME ZONE 'UTC', 'Mon DD, YYYY HH24:MI') || ' UTC';
  SELECT full_name INTO client_name FROM public.clients WHERE id = NEW.client_id;

  FOREACH uid IN ARRAY public.resolve_client_stakeholder_user_ids(NEW.client_id)
  LOOP
    IF uid IS NULL OR uid = NEW.created_by THEN
      CONTINUE;
    END IF;
    INSERT INTO public.app_notifications (
      user_id, category, severity, title, body, link,
      entity_type, entity_id, dedupe_key, metadata
    ) VALUES (
      uid,
      'appointment_request',
      'info',
      COALESCE(client_name, 'Client') || ' requested a meeting',
      NEW.title || ' · ' || when_label || ' · ' || replace(NEW.mode, '_', ' '),
      '/clients/' || NEW.client_id::text || '?tab=communications',
      'client_appointment',
      NEW.id,
      'appt_req:' || NEW.id::text,
      jsonb_build_object('status', NEW.status, 'mode', NEW.mode)
    )
    ON CONFLICT (user_id, dedupe_key) WHERE dedupe_key IS NOT NULL DO NOTHING;
  END LOOP;

  INSERT INTO public.client_timeline (
    client_id, event_type, actor_id, summary, metadata
  ) VALUES (
    NEW.client_id,
    'appointment.requested',
    NEW.created_by,
    'Appointment requested: ' || NEW.title,
    jsonb_build_object(
      'appointment_id', NEW.id,
      'scheduled_at', NEW.scheduled_at,
      'mode', NEW.mode,
      'status', NEW.status
    )
  );

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_notify_client_appointment_requested ON public.client_appointments;
CREATE TRIGGER trg_notify_client_appointment_requested
  AFTER INSERT ON public.client_appointments
  FOR EACH ROW
  EXECUTE FUNCTION public.fn_notify_client_appointment_requested();
