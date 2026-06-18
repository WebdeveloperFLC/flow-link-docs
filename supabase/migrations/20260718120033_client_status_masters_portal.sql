-- Client Status master: rename list, default portal visibility, notify only when visible to client.

UPDATE public.master_lists
SET label = 'Client Status'
WHERE key = 'client_statuses';

UPDATE public.master_items
SET metadata = COALESCE(metadata, '{}'::jsonb) || '{"show_to_client": true}'::jsonb
WHERE list_key = 'client_statuses'
  AND NOT (COALESCE(metadata, '{}'::jsonb) ? 'show_to_client');

CREATE OR REPLACE FUNCTION public.fn_notify_client_status_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  status_label text;
  show_client boolean := true;
BEGIN
  IF TG_OP = 'UPDATE' AND COALESCE(OLD.status, '') <> COALESCE(NEW.status, '') THEN
    SELECT mi.label,
           COALESCE((mi.metadata ->> 'show_to_client')::boolean, true)
      INTO status_label, show_client
      FROM public.master_items mi
     WHERE mi.list_key = 'client_statuses'
       AND mi.code = NEW.status
       AND mi.is_active = true
     LIMIT 1;

    IF show_client THEN
      INSERT INTO public.client_notifications (client_id, type, title, body, link)
      VALUES (
        NEW.id,
        'status_update',
        'Application status updated',
        'Your status changed to: ' || COALESCE(status_label, replace(COALESCE(NEW.status, ''), '_', ' '), '(none)'),
        '/portal/application'
      );
    END IF;
  END IF;
  RETURN NEW;
END;
$$;
