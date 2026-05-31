-- 1. Storage bucket for calendar branding (public read, user-scoped writes)
INSERT INTO storage.buckets (id, name, public)
VALUES ('calendar-branding', 'calendar-branding', true)
ON CONFLICT (id) DO UPDATE SET public = true;

CREATE POLICY "calendar_branding public read"
ON storage.objects FOR SELECT
USING (bucket_id = 'calendar-branding');

CREATE POLICY "calendar_branding owner insert"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'calendar-branding' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "calendar_branding owner update"
ON storage.objects FOR UPDATE TO authenticated
USING (bucket_id = 'calendar-branding' AND auth.uid()::text = (storage.foldername(name))[1])
WITH CHECK (bucket_id = 'calendar-branding' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "calendar_branding owner delete"
ON storage.objects FOR DELETE TO authenticated
USING (bucket_id = 'calendar-branding' AND auth.uid()::text = (storage.foldername(name))[1]);

-- 2. Additive columns on calendar_events
ALTER TABLE public.calendar_events
  ADD COLUMN IF NOT EXISTS appointment_type text,
  ADD COLUMN IF NOT EXISTS cancellation_reason text,
  ADD COLUMN IF NOT EXISTS internal_notes text;

-- 3. Add 'no_show' value to status enum (idempotent guard)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_enum e
    JOIN pg_type t ON t.oid = e.enumtypid
    WHERE t.typname = 'calendar_event_status' AND e.enumlabel = 'no_show'
  ) THEN
    ALTER TYPE public.calendar_event_status ADD VALUE 'no_show';
  END IF;
END$$;

-- 4. Internal notes thread table
CREATE TABLE IF NOT EXISTS public.calendar_internal_notes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id uuid NOT NULL REFERENCES public.calendar_events(id) ON DELETE CASCADE,
  author_id uuid NOT NULL,
  body text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_calendar_internal_notes_event
  ON public.calendar_internal_notes(event_id, created_at DESC);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.calendar_internal_notes TO authenticated;
GRANT ALL ON public.calendar_internal_notes TO service_role;

ALTER TABLE public.calendar_internal_notes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "calendar_internal_notes host read"
ON public.calendar_internal_notes FOR SELECT TO authenticated
USING (EXISTS (
  SELECT 1 FROM public.calendar_events e
  WHERE e.id = calendar_internal_notes.event_id
    AND (e.user_id = auth.uid() OR public.has_role(auth.uid(), 'admin'::app_role))
));

CREATE POLICY "calendar_internal_notes host insert"
ON public.calendar_internal_notes FOR INSERT TO authenticated
WITH CHECK (
  author_id = auth.uid()
  AND EXISTS (
    SELECT 1 FROM public.calendar_events e
    WHERE e.id = calendar_internal_notes.event_id
      AND (e.user_id = auth.uid() OR public.has_role(auth.uid(), 'admin'::app_role))
  )
);

CREATE POLICY "calendar_internal_notes host delete"
ON public.calendar_internal_notes FOR DELETE TO authenticated
USING (
  author_id = auth.uid()
  OR public.has_role(auth.uid(), 'admin'::app_role)
);