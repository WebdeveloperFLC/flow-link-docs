
-- Calendar Phase 2: preferences + breaks (additive only)

ALTER TABLE public.calendar_profiles
  ADD COLUMN IF NOT EXISTS location text,
  ADD COLUMN IF NOT EXISTS auto_confirm boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS require_approval boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS allow_reschedule boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS allow_cancellation boolean NOT NULL DEFAULT true;

CREATE TABLE IF NOT EXISTS public.calendar_breaks (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id        uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  day_of_week    smallint NOT NULL CHECK (day_of_week BETWEEN 0 AND 6),
  start_time     time NOT NULL,
  end_time       time NOT NULL,
  name           text,
  is_active      boolean NOT NULL DEFAULT true,
  repeat_weekly  boolean NOT NULL DEFAULT true,
  created_at     timestamptz NOT NULL DEFAULT now(),
  updated_at     timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT calendar_breaks_time_order CHECK (start_time < end_time)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.calendar_breaks TO authenticated;
GRANT ALL ON public.calendar_breaks TO service_role;

ALTER TABLE public.calendar_breaks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "calendar_breaks owner all"
  ON public.calendar_breaks FOR ALL TO authenticated
  USING (user_id = auth.uid() OR public.has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (user_id = auth.uid());

CREATE INDEX IF NOT EXISTS idx_calendar_breaks_user_day
  ON public.calendar_breaks(user_id, day_of_week);

DROP TRIGGER IF EXISTS trg_calendar_breaks_touch ON public.calendar_breaks;
CREATE TRIGGER trg_calendar_breaks_touch
  BEFORE UPDATE ON public.calendar_breaks
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- Extend event validation to reject slots overlapping an active break
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
  v_break    boolean;
BEGIN
  IF NEW.event_date < CURRENT_DATE THEN
    RAISE EXCEPTION 'calendar_events: event_date cannot be in the past';
  END IF;
  IF NEW.event_date > CURRENT_DATE + INTERVAL '60 days' THEN
    RAISE EXCEPTION 'calendar_events: event_date cannot be more than 60 days ahead';
  END IF;

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

  SELECT EXISTS (
    SELECT 1 FROM public.calendar_availability a
     WHERE a.user_id = NEW.user_id AND a.is_active
       AND a.day_of_week = EXTRACT(DOW FROM NEW.event_date)::int
       AND a.start_time <= NEW.start_time
       AND a.end_time   >= NEW.end_time
  ) INTO v_avail_ok;
  IF NOT v_avail_ok THEN
    RAISE EXCEPTION 'calendar_events: slot is outside host availability';
  END IF;

  SELECT EXISTS (
    SELECT 1 FROM public.calendar_unavailable_dates u
     WHERE u.user_id = NEW.user_id AND u.unavailable_date = NEW.event_date
  ) INTO v_unavail;
  IF v_unavail THEN
    RAISE EXCEPTION 'calendar_events: host is unavailable on %', NEW.event_date;
  END IF;

  SELECT EXISTS (
    SELECT 1 FROM public.calendar_breaks b
     WHERE b.user_id = NEW.user_id AND b.is_active
       AND b.day_of_week = EXTRACT(DOW FROM NEW.event_date)::int
       AND b.start_time < NEW.end_time
       AND b.end_time   > NEW.start_time
  ) INTO v_break;
  IF v_break THEN
    RAISE EXCEPTION 'calendar_events: slot overlaps a break period';
  END IF;

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
