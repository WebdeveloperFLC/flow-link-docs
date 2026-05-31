
-- =====================================================================
-- Calendar Module — initial schema, RLS, triggers, RPCs
-- Additive only. No existing object is altered.
-- =====================================================================

-- Enum -----------------------------------------------------------------
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'calendar_event_status') THEN
    CREATE TYPE public.calendar_event_status AS ENUM
      ('pending','scheduled','completed','cancelled','declined');
  END IF;
END $$;

-- Extension for citext (slug) ------------------------------------------
CREATE EXTENSION IF NOT EXISTS citext;

-- =====================================================================
-- TABLE: calendar_profiles
-- =====================================================================
CREATE TABLE public.calendar_profiles (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         uuid NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  profile_photo   text,
  full_name       text NOT NULL,
  designation     text,
  company_name    text,
  company_logo    text,
  short_bio       text,
  timezone        text NOT NULL,
  booking_slug    citext NOT NULL UNIQUE,
  is_active       boolean NOT NULL DEFAULT true,
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT calendar_profiles_slug_format CHECK (booking_slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$')
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.calendar_profiles TO authenticated;
GRANT ALL ON public.calendar_profiles TO service_role;

ALTER TABLE public.calendar_profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "calendar_profiles owner read"
  ON public.calendar_profiles FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "calendar_profiles owner insert"
  ON public.calendar_profiles FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "calendar_profiles owner update"
  ON public.calendar_profiles FOR UPDATE TO authenticated
  USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

CREATE POLICY "calendar_profiles owner delete"
  ON public.calendar_profiles FOR DELETE TO authenticated
  USING (user_id = auth.uid());

CREATE INDEX idx_calendar_profiles_user ON public.calendar_profiles(user_id);
CREATE INDEX idx_calendar_profiles_slug ON public.calendar_profiles(booking_slug);

CREATE TRIGGER trg_calendar_profiles_touch
  BEFORE UPDATE ON public.calendar_profiles
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- =====================================================================
-- TABLE: calendar_meeting_types
-- =====================================================================
CREATE TABLE public.calendar_meeting_types (
  id                     uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id                uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  meeting_name           text NOT NULL,
  description            text,
  slot_duration_minutes  integer NOT NULL CHECK (slot_duration_minutes > 0),
  buffer_minutes         integer NOT NULL DEFAULT 0 CHECK (buffer_minutes >= 0),
  color_code             text,
  is_active              boolean NOT NULL DEFAULT true,
  created_at             timestamptz NOT NULL DEFAULT now(),
  updated_at             timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.calendar_meeting_types TO authenticated;
GRANT ALL ON public.calendar_meeting_types TO service_role;

ALTER TABLE public.calendar_meeting_types ENABLE ROW LEVEL SECURITY;

CREATE POLICY "calendar_meeting_types owner all"
  ON public.calendar_meeting_types FOR ALL TO authenticated
  USING (user_id = auth.uid() OR public.has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (user_id = auth.uid());

CREATE INDEX idx_calendar_meeting_types_user ON public.calendar_meeting_types(user_id, is_active);

CREATE TRIGGER trg_calendar_meeting_types_touch
  BEFORE UPDATE ON public.calendar_meeting_types
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- =====================================================================
-- TABLE: calendar_availability
-- =====================================================================
CREATE TABLE public.calendar_availability (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  day_of_week  smallint NOT NULL CHECK (day_of_week BETWEEN 0 AND 6),
  start_time   time NOT NULL,
  end_time     time NOT NULL,
  is_active    boolean NOT NULL DEFAULT true,
  created_at   timestamptz NOT NULL DEFAULT now(),
  updated_at   timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT calendar_availability_time_order CHECK (start_time < end_time)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.calendar_availability TO authenticated;
GRANT ALL ON public.calendar_availability TO service_role;

ALTER TABLE public.calendar_availability ENABLE ROW LEVEL SECURITY;

CREATE POLICY "calendar_availability owner all"
  ON public.calendar_availability FOR ALL TO authenticated
  USING (user_id = auth.uid() OR public.has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (user_id = auth.uid());

CREATE INDEX idx_calendar_availability_user_day ON public.calendar_availability(user_id, day_of_week);

CREATE TRIGGER trg_calendar_availability_touch
  BEFORE UPDATE ON public.calendar_availability
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- =====================================================================
-- TABLE: calendar_unavailable_dates
-- =====================================================================
CREATE TABLE public.calendar_unavailable_dates (
  id                 uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id            uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  unavailable_date   date NOT NULL,
  reason             text,
  created_at         timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, unavailable_date)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.calendar_unavailable_dates TO authenticated;
GRANT ALL ON public.calendar_unavailable_dates TO service_role;

ALTER TABLE public.calendar_unavailable_dates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "calendar_unavailable_dates owner all"
  ON public.calendar_unavailable_dates FOR ALL TO authenticated
  USING (user_id = auth.uid() OR public.has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (user_id = auth.uid());

CREATE INDEX idx_calendar_unavailable_user_date
  ON public.calendar_unavailable_dates(user_id, unavailable_date);

-- =====================================================================
-- Sequence for daily event reference
-- =====================================================================
CREATE SEQUENCE IF NOT EXISTS public.calendar_event_ref_seq;

-- =====================================================================
-- TABLE: calendar_events
-- =====================================================================
CREATE TABLE public.calendar_events (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_reference   text UNIQUE,
  user_id           uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  meeting_type_id   uuid NOT NULL REFERENCES public.calendar_meeting_types(id) ON DELETE RESTRICT,
  event_title       text,
  event_date        date NOT NULL,
  start_time        time NOT NULL,
  end_time          time NOT NULL,
  host_timezone     text NOT NULL,
  visitor_timezone  text NOT NULL,
  purpose           text,
  notes             text,
  status            public.calendar_event_status NOT NULL DEFAULT 'pending',
  created_at        timestamptz NOT NULL DEFAULT now(),
  updated_at        timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT calendar_events_time_order CHECK (start_time < end_time)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.calendar_events TO authenticated;
GRANT ALL ON public.calendar_events TO service_role;

ALTER TABLE public.calendar_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "calendar_events owner all"
  ON public.calendar_events FOR ALL TO authenticated
  USING (user_id = auth.uid() OR public.has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (user_id = auth.uid() OR public.has_role(auth.uid(), 'admin'::app_role));

CREATE INDEX idx_calendar_events_user_date  ON public.calendar_events(user_id, event_date);
CREATE INDEX idx_calendar_events_meeting    ON public.calendar_events(meeting_type_id);
CREATE INDEX idx_calendar_events_status     ON public.calendar_events(status);
CREATE INDEX idx_calendar_events_date_time  ON public.calendar_events(event_date, start_time);

-- =====================================================================
-- TABLE: calendar_participants
-- =====================================================================
CREATE TABLE public.calendar_participants (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id       uuid NOT NULL REFERENCES public.calendar_events(id) ON DELETE CASCADE,
  full_name      text NOT NULL,
  email          text NOT NULL CHECK (email ~* '^[^@\s]+@[^@\s]+\.[^@\s]+$'),
  mobile_number  text NOT NULL,
  company_name   text,
  designation    text,
  created_at     timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.calendar_participants TO authenticated;
GRANT ALL ON public.calendar_participants TO service_role;

ALTER TABLE public.calendar_participants ENABLE ROW LEVEL SECURITY;

CREATE POLICY "calendar_participants host read"
  ON public.calendar_participants FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.calendar_events e
     WHERE e.id = calendar_participants.event_id
       AND (e.user_id = auth.uid() OR public.has_role(auth.uid(), 'admin'::app_role))
  ));

CREATE POLICY "calendar_participants host write"
  ON public.calendar_participants FOR ALL TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.calendar_events e
     WHERE e.id = calendar_participants.event_id AND e.user_id = auth.uid()
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.calendar_events e
     WHERE e.id = calendar_participants.event_id AND e.user_id = auth.uid()
  ));

CREATE INDEX idx_calendar_participants_event_email
  ON public.calendar_participants(event_id, email);

-- =====================================================================
-- TABLE: calendar_tokens
-- =====================================================================
CREATE TABLE public.calendar_tokens (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id    uuid NOT NULL REFERENCES public.calendar_events(id) ON DELETE CASCADE,
  token       text NOT NULL UNIQUE,
  purpose     text NOT NULL DEFAULT 'manage',
  expires_at  timestamptz NOT NULL,
  created_at  timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.calendar_tokens TO authenticated;
GRANT ALL ON public.calendar_tokens TO service_role;

ALTER TABLE public.calendar_tokens ENABLE ROW LEVEL SECURITY;

CREATE POLICY "calendar_tokens host read"
  ON public.calendar_tokens FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.calendar_events e
     WHERE e.id = calendar_tokens.event_id
       AND (e.user_id = auth.uid() OR public.has_role(auth.uid(), 'admin'::app_role))
  ));

CREATE INDEX idx_calendar_tokens_token ON public.calendar_tokens(token);
CREATE INDEX idx_calendar_tokens_event ON public.calendar_tokens(event_id);

-- =====================================================================
-- TABLE: calendar_notifications
-- =====================================================================
CREATE TABLE public.calendar_notifications (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id            uuid NOT NULL REFERENCES public.calendar_events(id) ON DELETE CASCADE,
  notification_type   text NOT NULL,
  recipient_email     text NOT NULL,
  delivery_status     text NOT NULL DEFAULT 'pending',
  sent_at             timestamptz
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.calendar_notifications TO authenticated;
GRANT ALL ON public.calendar_notifications TO service_role;

ALTER TABLE public.calendar_notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "calendar_notifications host read"
  ON public.calendar_notifications FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.calendar_events e
     WHERE e.id = calendar_notifications.event_id
       AND (e.user_id = auth.uid() OR public.has_role(auth.uid(), 'admin'::app_role))
  ));

CREATE INDEX idx_calendar_notifications_event_sent
  ON public.calendar_notifications(event_id, sent_at);

-- =====================================================================
-- TABLE: calendar_event_audit
-- =====================================================================
CREATE TABLE public.calendar_event_audit (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id     uuid NOT NULL REFERENCES public.calendar_events(id) ON DELETE CASCADE,
  from_status  public.calendar_event_status,
  to_status    public.calendar_event_status NOT NULL,
  actor_id     uuid,
  actor_kind   text NOT NULL DEFAULT 'host',
  at           timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT ON public.calendar_event_audit TO authenticated;
GRANT ALL ON public.calendar_event_audit TO service_role;

ALTER TABLE public.calendar_event_audit ENABLE ROW LEVEL SECURITY;

CREATE POLICY "calendar_event_audit host read"
  ON public.calendar_event_audit FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.calendar_events e
     WHERE e.id = calendar_event_audit.event_id
       AND (e.user_id = auth.uid() OR public.has_role(auth.uid(), 'admin'::app_role))
  ));

CREATE INDEX idx_calendar_event_audit_event ON public.calendar_event_audit(event_id, at);

-- =====================================================================
-- Trigger: assign event_reference
-- =====================================================================
CREATE OR REPLACE FUNCTION public.fn_calendar_events_assign_reference()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE v_next bigint;
BEGIN
  IF NEW.event_reference IS NULL OR NEW.event_reference = '' THEN
    v_next := nextval('public.calendar_event_ref_seq');
    NEW.event_reference := 'CAL-' || to_char(now(),'YYYYMMDD') || '-' || lpad(v_next::text, 4, '0');
  END IF;
  RETURN NEW;
END $$;

CREATE TRIGGER trg_calendar_events_assign_reference
  BEFORE INSERT ON public.calendar_events
  FOR EACH ROW EXECUTE FUNCTION public.fn_calendar_events_assign_reference();

-- =====================================================================
-- Trigger: validate event (date, duration, availability, overlap)
-- =====================================================================
CREATE OR REPLACE FUNCTION public.fn_calendar_events_validate()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_duration int;
  v_actual   int;
  v_avail_ok boolean;
  v_unavail  boolean;
  v_overlap  boolean;
BEGIN
  -- Date window
  IF NEW.event_date < CURRENT_DATE THEN
    RAISE EXCEPTION 'calendar_events: event_date cannot be in the past';
  END IF;
  IF NEW.event_date > CURRENT_DATE + INTERVAL '60 days' THEN
    RAISE EXCEPTION 'calendar_events: event_date cannot be more than 60 days ahead';
  END IF;

  -- Duration must match meeting type
  SELECT slot_duration_minutes INTO v_duration
    FROM public.calendar_meeting_types
   WHERE id = NEW.meeting_type_id AND user_id = NEW.user_id;
  IF v_duration IS NULL THEN
    RAISE EXCEPTION 'calendar_events: meeting type not found for host';
  END IF;
  v_actual := EXTRACT(EPOCH FROM (NEW.end_time - NEW.start_time))/60;
  IF v_actual <> v_duration THEN
    RAISE EXCEPTION 'calendar_events: duration % does not match meeting type %', v_actual, v_duration;
  END IF;

  -- Availability (weekly)
  SELECT EXISTS (
    SELECT 1 FROM public.calendar_availability a
     WHERE a.user_id = NEW.user_id
       AND a.is_active
       AND a.day_of_week = EXTRACT(DOW FROM NEW.event_date)::int
       AND a.start_time <= NEW.start_time
       AND a.end_time   >= NEW.end_time
  ) INTO v_avail_ok;
  IF NOT v_avail_ok THEN
    RAISE EXCEPTION 'calendar_events: slot is outside host availability';
  END IF;

  -- Unavailable date
  SELECT EXISTS (
    SELECT 1 FROM public.calendar_unavailable_dates u
     WHERE u.user_id = NEW.user_id AND u.unavailable_date = NEW.event_date
  ) INTO v_unavail;
  IF v_unavail THEN
    RAISE EXCEPTION 'calendar_events: host is unavailable on %', NEW.event_date;
  END IF;

  -- Overlap with another non-terminal event for the same host
  SELECT EXISTS (
    SELECT 1 FROM public.calendar_events e
     WHERE e.user_id = NEW.user_id
       AND e.event_date = NEW.event_date
       AND e.id <> COALESCE(NEW.id, '00000000-0000-0000-0000-000000000000'::uuid)
       AND e.status NOT IN ('cancelled','declined')
       AND e.start_time < NEW.end_time
       AND e.end_time   > NEW.start_time
  ) INTO v_overlap;
  IF v_overlap THEN
    RAISE EXCEPTION 'calendar_events: slot conflicts with an existing booking';
  END IF;

  RETURN NEW;
END $$;

CREATE TRIGGER trg_calendar_events_validate
  BEFORE INSERT OR UPDATE OF event_date, start_time, end_time, meeting_type_id, user_id
  ON public.calendar_events
  FOR EACH ROW EXECUTE FUNCTION public.fn_calendar_events_validate();

-- =====================================================================
-- Trigger: status workflow guard + audit
-- =====================================================================
CREATE OR REPLACE FUNCTION public.fn_calendar_events_status_guard()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE v_ok boolean := false;
BEGIN
  IF OLD.status = NEW.status THEN RETURN NEW; END IF;

  -- Terminal states are locked
  IF OLD.status IN ('completed','cancelled','declined') THEN
    RAISE EXCEPTION 'calendar_events: status % is terminal', OLD.status;
  END IF;

  IF OLD.status = 'pending'   AND NEW.status IN ('scheduled','declined','cancelled') THEN v_ok := true; END IF;
  IF OLD.status = 'scheduled' AND NEW.status IN ('completed','cancelled')            THEN v_ok := true; END IF;

  IF NOT v_ok THEN
    RAISE EXCEPTION 'calendar_events: invalid status transition % -> %', OLD.status, NEW.status;
  END IF;

  INSERT INTO public.calendar_event_audit(event_id, from_status, to_status, actor_id, actor_kind)
  VALUES (NEW.id, OLD.status, NEW.status, auth.uid(),
          CASE WHEN auth.uid() IS NULL THEN 'system' ELSE 'host' END);

  RETURN NEW;
END $$;

CREATE TRIGGER trg_calendar_events_status_guard
  BEFORE UPDATE OF status ON public.calendar_events
  FOR EACH ROW EXECUTE FUNCTION public.fn_calendar_events_status_guard();

CREATE TRIGGER trg_calendar_events_touch
  BEFORE UPDATE ON public.calendar_events
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- =====================================================================
-- RPC: calendar_generate_slug
-- =====================================================================
CREATE OR REPLACE FUNCTION public.calendar_generate_slug(_base text)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_slug text;
  v_try  text;
  v_n    int := 0;
BEGIN
  v_slug := lower(coalesce(_base,''));
  v_slug := regexp_replace(v_slug, '[^a-z0-9]+', '-', 'g');
  v_slug := regexp_replace(v_slug, '(^-+|-+$)', '', 'g');
  IF v_slug = '' THEN v_slug := 'user'; END IF;

  v_try := v_slug;
  LOOP
    EXIT WHEN NOT EXISTS (SELECT 1 FROM public.calendar_profiles WHERE booking_slug = v_try::citext);
    v_n := v_n + 1;
    v_try := v_slug || '-' || v_n::text;
  END LOOP;
  RETURN v_try;
END $$;

REVOKE ALL ON FUNCTION public.calendar_generate_slug(text) FROM public;
GRANT EXECUTE ON FUNCTION public.calendar_generate_slug(text) TO authenticated, service_role;

-- =====================================================================
-- RPC: calendar_resolve_profile (public)
-- =====================================================================
CREATE OR REPLACE FUNCTION public.calendar_resolve_profile(_slug text)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE v_profile public.calendar_profiles; v_types jsonb;
BEGIN
  SELECT * INTO v_profile FROM public.calendar_profiles
   WHERE booking_slug = _slug::citext AND is_active = true;
  IF v_profile.id IS NULL THEN RETURN NULL; END IF;

  SELECT COALESCE(jsonb_agg(jsonb_build_object(
    'id', mt.id,
    'meeting_name', mt.meeting_name,
    'description', mt.description,
    'slot_duration_minutes', mt.slot_duration_minutes,
    'buffer_minutes', mt.buffer_minutes,
    'color_code', mt.color_code
  ) ORDER BY mt.meeting_name), '[]'::jsonb)
    INTO v_types
    FROM public.calendar_meeting_types mt
   WHERE mt.user_id = v_profile.user_id AND mt.is_active = true;

  RETURN jsonb_build_object(
    'profile', jsonb_build_object(
      'full_name', v_profile.full_name,
      'designation', v_profile.designation,
      'company_name', v_profile.company_name,
      'company_logo', v_profile.company_logo,
      'profile_photo', v_profile.profile_photo,
      'short_bio', v_profile.short_bio,
      'timezone', v_profile.timezone,
      'booking_slug', v_profile.booking_slug
    ),
    'meeting_types', v_types
  );
END $$;

REVOKE ALL ON FUNCTION public.calendar_resolve_profile(text) FROM public;
GRANT EXECUTE ON FUNCTION public.calendar_resolve_profile(text) TO anon, authenticated, service_role;

-- =====================================================================
-- RPC: calendar_available_slots
-- =====================================================================
CREATE OR REPLACE FUNCTION public.calendar_available_slots(
  _slug text, _meeting_type_id uuid, _date date
) RETURNS SETOF time
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user uuid;
  v_dur  int;
  v_buf  int;
  v_step interval;
  v_total interval;
  r RECORD;
  v_cursor time;
BEGIN
  SELECT p.user_id INTO v_user FROM public.calendar_profiles p
    WHERE p.booking_slug = _slug::citext AND p.is_active;
  IF v_user IS NULL THEN RETURN; END IF;

  SELECT slot_duration_minutes, buffer_minutes INTO v_dur, v_buf
    FROM public.calendar_meeting_types
   WHERE id = _meeting_type_id AND user_id = v_user AND is_active;
  IF v_dur IS NULL THEN RETURN; END IF;

  IF _date < CURRENT_DATE OR _date > CURRENT_DATE + INTERVAL '60 days' THEN RETURN; END IF;
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
        IF (_date > CURRENT_DATE) OR v_cursor > CURRENT_TIME THEN
          RETURN NEXT v_cursor;
        END IF;
      END IF;
      v_cursor := v_cursor + v_step;
    END LOOP;
  END LOOP;
  RETURN;
END $$;

REVOKE ALL ON FUNCTION public.calendar_available_slots(text, uuid, date) FROM public;
GRANT EXECUTE ON FUNCTION public.calendar_available_slots(text, uuid, date) TO anon, authenticated, service_role;

-- =====================================================================
-- RPC: calendar_create_booking (public)
-- =====================================================================
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
SET search_path = public
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

  v_token   := encode(gen_random_bytes(32), 'base64');
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

-- =====================================================================
-- RPC: calendar_event_transition (host only)
-- =====================================================================
CREATE OR REPLACE FUNCTION public.calendar_event_transition(_event_id uuid, _action text)
RETURNS public.calendar_events
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE v_event public.calendar_events; v_new public.calendar_event_status;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'authentication required'; END IF;
  SELECT * INTO v_event FROM public.calendar_events WHERE id = _event_id;
  IF v_event.id IS NULL THEN RAISE EXCEPTION 'event not found'; END IF;
  IF v_event.user_id <> auth.uid() AND NOT public.has_role(auth.uid(),'admin'::app_role) THEN
    RAISE EXCEPTION 'forbidden';
  END IF;

  v_new := CASE lower(_action)
    WHEN 'confirm'  THEN 'scheduled'
    WHEN 'decline'  THEN 'declined'
    WHEN 'cancel'   THEN 'cancelled'
    WHEN 'complete' THEN 'completed'
    ELSE NULL END;
  IF v_new IS NULL THEN RAISE EXCEPTION 'unknown action %', _action; END IF;

  UPDATE public.calendar_events SET status = v_new WHERE id = _event_id RETURNING * INTO v_event;
  RETURN v_event;
END $$;

REVOKE ALL ON FUNCTION public.calendar_event_transition(uuid, text) FROM public;
GRANT EXECUTE ON FUNCTION public.calendar_event_transition(uuid, text) TO authenticated, service_role;

-- =====================================================================
-- RPC: calendar_validate_token
-- =====================================================================
CREATE OR REPLACE FUNCTION public.calendar_validate_token(_token text)
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT event_id FROM public.calendar_tokens
   WHERE token = _token AND expires_at > now()
   LIMIT 1;
$$;

REVOKE ALL ON FUNCTION public.calendar_validate_token(text) FROM public;
GRANT EXECUTE ON FUNCTION public.calendar_validate_token(text) TO anon, authenticated, service_role;
