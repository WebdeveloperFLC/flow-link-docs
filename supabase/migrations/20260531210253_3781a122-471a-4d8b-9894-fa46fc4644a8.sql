CREATE OR REPLACE FUNCTION public.calendar_create_booking(
  _slug text,
  _meeting_type_id uuid,
  _date date,
  _start_time time,
  _visitor jsonb,
  _visitor_timezone text,
  _purpose text,
  _notes text
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
  v_user  uuid;
  v_tz    text;
  v_dur   int;
  v_end   time;
  v_event public.calendar_events;
  v_token text;
  v_expires timestamptz;
BEGIN
  SELECT p.user_id, p.timezone INTO v_user, v_tz
    FROM public.calendar_profiles p
   WHERE p.booking_slug = _slug::citext AND p.is_active;
  IF v_user IS NULL THEN RAISE EXCEPTION 'profile not found'; END IF;

  SELECT slot_duration_minutes INTO v_dur
    FROM public.calendar_meeting_types
   WHERE id = _meeting_type_id AND user_id = v_user AND is_active;
  IF v_dur IS NULL THEN RAISE EXCEPTION 'meeting type not found'; END IF;

  v_end := _start_time + make_interval(mins => v_dur);

  IF coalesce(_visitor->>'full_name','') = ''
     OR coalesce(_visitor->>'email','') = ''
     OR coalesce(_visitor->>'mobile_number','') = '' THEN
    RAISE EXCEPTION 'visitor full_name, email and mobile_number are required';
  END IF;
  IF coalesce(_visitor_timezone,'') = '' THEN
    RAISE EXCEPTION 'visitor_timezone is required';
  END IF;

  INSERT INTO public.calendar_events(
    user_id, meeting_type_id, event_date, start_time, end_time,
    host_timezone, visitor_timezone, purpose, notes, status, event_title
  ) VALUES (
    v_user, _meeting_type_id, _date, _start_time, v_end,
    v_tz, _visitor_timezone, _purpose, _notes, 'pending',
    coalesce(_visitor->>'full_name','') || ' — meeting'
  )
  RETURNING * INTO v_event;

  INSERT INTO public.calendar_participants(
    event_id, full_name, email, mobile_number, company_name, designation
  ) VALUES (
    v_event.id,
    _visitor->>'full_name',
    _visitor->>'email',
    _visitor->>'mobile_number',
    _visitor->>'company_name',
    _visitor->>'designation'
  );

  v_token   := encode(extensions.gen_random_bytes(32), 'base64');
  v_token   := replace(replace(replace(v_token,'+','-'),'/','_'),'=','');
  v_expires := (v_event.event_date + v_event.end_time)::timestamptz + INTERVAL '24 hours';

  INSERT INTO public.calendar_tokens(event_id, token, purpose, expires_at)
  VALUES (v_event.id, v_token, 'manage', v_expires);

  INSERT INTO public.calendar_event_audit(event_id, from_status, to_status, actor_id, actor_kind)
  VALUES (v_event.id, NULL, 'pending', NULL, 'visitor');

  INSERT INTO public.calendar_notifications(event_id, notification_type, recipient_email, delivery_status)
  VALUES (v_event.id, 'booking_request', _visitor->>'email', 'pending');

  RETURN jsonb_build_object(
    'event_id', v_event.id,
    'event_reference', v_event.event_reference,
    'status', v_event.status,
    'manage_token', v_token,
    'expires_at', v_expires
  );
END $$;

REVOKE ALL ON FUNCTION public.calendar_create_booking(text, uuid, date, time, jsonb, text, text, text) FROM public;
GRANT EXECUTE ON FUNCTION public.calendar_create_booking(text, uuid, date, time, jsonb, text, text, text) TO anon, authenticated, service_role;