CREATE OR REPLACE FUNCTION public.fn_calendar_events_status_guard()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE v_ok boolean := false;
BEGIN
  IF OLD.status = NEW.status THEN RETURN NEW; END IF;

  -- Terminal states are locked
  IF OLD.status IN ('completed','cancelled','declined','no_show') THEN
    RAISE EXCEPTION 'calendar_events: status % is terminal', OLD.status;
  END IF;

  IF OLD.status = 'pending'   AND NEW.status IN ('scheduled','declined','cancelled') THEN v_ok := true; END IF;
  IF OLD.status = 'scheduled' AND NEW.status IN ('completed','cancelled','no_show')  THEN v_ok := true; END IF;

  IF NOT v_ok THEN
    RAISE EXCEPTION 'calendar_events: invalid status transition % -> %', OLD.status, NEW.status;
  END IF;

  INSERT INTO public.calendar_event_audit(event_id, from_status, to_status, actor_id, actor_kind)
  VALUES (NEW.id, OLD.status, NEW.status, auth.uid(),
          CASE WHEN auth.uid() IS NULL THEN 'system' ELSE 'host' END);

  RETURN NEW;
END $function$;