CREATE OR REPLACE FUNCTION public.calendar_available_slots(_slug text, _meeting_type_id uuid, _date date)
 RETURNS SETOF time without time zone
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_user  uuid;
  v_tz    text;
  v_today date;
  v_now   time;
  v_dur   int;
  v_buf   int;
  v_step  interval;
  v_total interval;
  r RECORD;
  v_cursor time;
BEGIN
  SELECT p.user_id, COALESCE(NULLIF(p.timezone, ''), 'UTC')
    INTO v_user, v_tz
    FROM public.calendar_profiles p
   WHERE p.booking_slug = _slug::citext AND p.is_active;
  IF v_user IS NULL THEN RETURN; END IF;

  SELECT slot_duration_minutes, buffer_minutes
    INTO v_dur, v_buf
    FROM public.calendar_meeting_types
   WHERE id = _meeting_type_id AND user_id = v_user AND is_active;
  IF v_dur IS NULL THEN RETURN; END IF;

  -- "Today" and "now" in the employee's timezone
  v_today := (now() AT TIME ZONE v_tz)::date;
  v_now   := (now() AT TIME ZONE v_tz)::time;

  IF _date < v_today OR _date > v_today + INTERVAL '60 days' THEN RETURN; END IF;
  IF EXISTS (SELECT 1 FROM public.calendar_unavailable_dates
              WHERE user_id = v_user AND unavailable_date = _date) THEN RETURN; END IF;

  v_step  := make_interval(mins => v_dur + v_buf);
  v_total := make_interval(mins => v_dur);

  FOR r IN
    SELECT start_time, end_time FROM public.calendar_availability
     WHERE user_id = v_user AND is_active
       AND day_of_week = EXTRACT(DOW FROM _date)::int
     ORDER BY start_time
  LOOP
    v_cursor := r.start_time;
    WHILE (v_cursor + v_total) <= r.end_time LOOP
      IF NOT EXISTS (
        SELECT 1 FROM public.calendar_events e
         WHERE e.user_id = v_user
           AND e.event_date = _date
           AND e.status NOT IN ('cancelled','declined')
           AND e.start_time < (v_cursor + v_total)
           AND e.end_time   > v_cursor
      ) THEN
        IF (_date > v_today) OR v_cursor > v_now THEN
          RETURN NEXT v_cursor;
        END IF;
      END IF;
      v_cursor := v_cursor + v_step;
    END LOOP;
  END LOOP;
  RETURN;
END $function$;