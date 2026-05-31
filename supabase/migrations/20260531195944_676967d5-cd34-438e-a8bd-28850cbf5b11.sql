
-- 1a. Meeting type extensions
ALTER TABLE public.calendar_meeting_types
  ADD COLUMN IF NOT EXISTS slug citext,
  ADD COLUMN IF NOT EXISTS booking_window_days integer NOT NULL DEFAULT 30,
  ADD COLUMN IF NOT EXISTS requires_approval boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS category text,
  ADD COLUMN IF NOT EXISTS reservation_ttl_minutes integer NOT NULL DEFAULT 10,
  ADD COLUMN IF NOT EXISTS team_id uuid REFERENCES public.teams(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS round_robin_enabled boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS assignment_strategy text NOT NULL DEFAULT 'fixed';

-- Backfill slug from meeting_name (lowercased, non-alphanumeric -> hyphen)
UPDATE public.calendar_meeting_types
SET slug = lower(regexp_replace(regexp_replace(meeting_name, '[^a-zA-Z0-9]+', '-', 'g'), '(^-+|-+$)', '', 'g'))::citext
WHERE slug IS NULL;

-- De-dup slugs per user (append -2, -3 etc) if needed
WITH dup AS (
  SELECT id, user_id, slug,
         row_number() OVER (PARTITION BY user_id, slug ORDER BY created_at) AS rn
  FROM public.calendar_meeting_types
)
UPDATE public.calendar_meeting_types m
SET slug = (m.slug || '-' || dup.rn)::citext
FROM dup
WHERE dup.id = m.id AND dup.rn > 1;

ALTER TABLE public.calendar_meeting_types
  ALTER COLUMN slug SET NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS calendar_meeting_types_user_slug_uq
  ON public.calendar_meeting_types(user_id, slug);

ALTER TABLE public.calendar_meeting_types
  ADD CONSTRAINT calendar_meeting_types_slug_format
  CHECK (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'::citext);

ALTER TABLE public.calendar_meeting_types
  ADD CONSTRAINT calendar_meeting_types_strategy_chk
  CHECK (assignment_strategy IN ('fixed','round_robin'));

-- 1b. Slug history
CREATE TABLE IF NOT EXISTS public.calendar_slug_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  scope text NOT NULL CHECK (scope IN ('profile','meeting_type')),
  meeting_type_id uuid REFERENCES public.calendar_meeting_types(id) ON DELETE CASCADE,
  old_slug citext NOT NULL,
  new_slug citext NOT NULL,
  changed_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_calendar_slug_history_lookup
  ON public.calendar_slug_history(scope, old_slug);

GRANT SELECT ON public.calendar_slug_history TO anon, authenticated;
GRANT ALL ON public.calendar_slug_history TO service_role;

ALTER TABLE public.calendar_slug_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "slug_history public read" ON public.calendar_slug_history
  FOR SELECT TO anon, authenticated USING (true);

CREATE POLICY "slug_history owner manage" ON public.calendar_slug_history
  FOR ALL TO authenticated
  USING (user_id = auth.uid() OR has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (user_id = auth.uid() OR has_role(auth.uid(), 'admin'::app_role));

-- Triggers to capture slug changes
CREATE OR REPLACE FUNCTION public.fn_capture_profile_slug_change()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.booking_slug IS DISTINCT FROM OLD.booking_slug THEN
    INSERT INTO public.calendar_slug_history(user_id, scope, old_slug, new_slug)
    VALUES (NEW.user_id, 'profile', OLD.booking_slug, NEW.booking_slug);
  END IF;
  RETURN NEW;
END$$;

DROP TRIGGER IF EXISTS trg_calendar_profiles_slug_history ON public.calendar_profiles;
CREATE TRIGGER trg_calendar_profiles_slug_history
  AFTER UPDATE OF booking_slug ON public.calendar_profiles
  FOR EACH ROW EXECUTE FUNCTION public.fn_capture_profile_slug_change();

CREATE OR REPLACE FUNCTION public.fn_capture_meeting_type_slug_change()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.slug IS DISTINCT FROM OLD.slug THEN
    INSERT INTO public.calendar_slug_history(user_id, scope, meeting_type_id, old_slug, new_slug)
    VALUES (NEW.user_id, 'meeting_type', NEW.id, OLD.slug, NEW.slug);
  END IF;
  RETURN NEW;
END$$;

DROP TRIGGER IF EXISTS trg_calendar_meeting_types_slug_history ON public.calendar_meeting_types;
CREATE TRIGGER trg_calendar_meeting_types_slug_history
  AFTER UPDATE OF slug ON public.calendar_meeting_types
  FOR EACH ROW EXECUTE FUNCTION public.fn_capture_meeting_type_slug_change();

-- 1c. CRM linking
CREATE TABLE IF NOT EXISTS public.calendar_event_crm_links (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id uuid NOT NULL REFERENCES public.calendar_events(id) ON DELETE CASCADE,
  entity_type text NOT NULL CHECK (entity_type IN ('lead','contact','student','opportunity','company','employee')),
  entity_id uuid NOT NULL,
  is_primary boolean NOT NULL DEFAULT false,
  linked_automatically boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (event_id, entity_type, entity_id)
);
CREATE INDEX IF NOT EXISTS idx_calendar_event_crm_links_event ON public.calendar_event_crm_links(event_id);
CREATE INDEX IF NOT EXISTS idx_calendar_event_crm_links_entity ON public.calendar_event_crm_links(entity_type, entity_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.calendar_event_crm_links TO authenticated;
GRANT ALL ON public.calendar_event_crm_links TO service_role;

ALTER TABLE public.calendar_event_crm_links ENABLE ROW LEVEL SECURITY;

CREATE POLICY "crm_links host all" ON public.calendar_event_crm_links
  FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.calendar_events e WHERE e.id = event_id
                 AND (e.user_id = auth.uid() OR has_role(auth.uid(), 'admin'::app_role))))
  WITH CHECK (EXISTS (SELECT 1 FROM public.calendar_events e WHERE e.id = event_id
                 AND (e.user_id = auth.uid() OR has_role(auth.uid(), 'admin'::app_role))));

-- 1d. Slot reservation
CREATE TABLE IF NOT EXISTS public.calendar_slot_reservations (
  event_id uuid PRIMARY KEY REFERENCES public.calendar_events(id) ON DELETE CASCADE,
  expires_at timestamptz NOT NULL,
  released boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_calendar_slot_reservations_expires
  ON public.calendar_slot_reservations(expires_at) WHERE released = false;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.calendar_slot_reservations TO authenticated;
GRANT ALL ON public.calendar_slot_reservations TO service_role;

ALTER TABLE public.calendar_slot_reservations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "slot_reservations host read" ON public.calendar_slot_reservations
  FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.calendar_events e WHERE e.id = event_id
                 AND (e.user_id = auth.uid() OR has_role(auth.uid(), 'admin'::app_role))));

CREATE POLICY "slot_reservations host manage" ON public.calendar_slot_reservations
  FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.calendar_events e WHERE e.id = event_id
                 AND (e.user_id = auth.uid() OR has_role(auth.uid(), 'admin'::app_role))))
  WITH CHECK (EXISTS (SELECT 1 FROM public.calendar_events e WHERE e.id = event_id
                 AND (e.user_id = auth.uid() OR has_role(auth.uid(), 'admin'::app_role))));

-- Allow declining a pending reservation by system / cron
CREATE OR REPLACE FUNCTION public.fn_release_expired_reservations()
RETURNS integer LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_count integer := 0;
BEGIN
  WITH expired AS (
    SELECT r.event_id
    FROM public.calendar_slot_reservations r
    JOIN public.calendar_events e ON e.id = r.event_id
    WHERE r.released = false
      AND r.expires_at < now()
      AND e.status = 'pending'
  )
  UPDATE public.calendar_events e
  SET status = 'declined',
      cancellation_reason = COALESCE(cancellation_reason, 'Reservation expired')
  FROM expired x
  WHERE e.id = x.event_id;
  GET DIAGNOSTICS v_count = ROW_COUNT;

  UPDATE public.calendar_slot_reservations
  SET released = true
  WHERE released = false AND expires_at < now();

  RETURN v_count;
END$$;

-- 1e. Branding
CREATE TABLE IF NOT EXISTS public.calendar_company_branding (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  singleton boolean NOT NULL DEFAULT true UNIQUE,
  company_name text,
  company_logo_url text,
  primary_color text,
  secondary_color text,
  footer_text text,
  terms_url text,
  privacy_url text,
  booking_page_intro text,
  updated_at timestamptz NOT NULL DEFAULT now(),
  updated_by uuid
);

GRANT SELECT ON public.calendar_company_branding TO anon, authenticated;
GRANT INSERT, UPDATE ON public.calendar_company_branding TO authenticated;
GRANT ALL ON public.calendar_company_branding TO service_role;

ALTER TABLE public.calendar_company_branding ENABLE ROW LEVEL SECURITY;

CREATE POLICY "branding public read" ON public.calendar_company_branding
  FOR SELECT TO anon, authenticated USING (true);

CREATE POLICY "branding admin write" ON public.calendar_company_branding
  FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

INSERT INTO public.calendar_company_branding (singleton, company_name)
VALUES (true, 'Your Company')
ON CONFLICT (singleton) DO NOTHING;

-- Storage bucket for branding (public)
INSERT INTO storage.buckets (id, name, public)
VALUES ('calendar-company-branding','calendar-company-branding', true)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "branding bucket public read"
  ON storage.objects FOR SELECT TO anon, authenticated
  USING (bucket_id = 'calendar-company-branding');

CREATE POLICY "branding bucket admin write"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'calendar-company-branding' AND has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "branding bucket admin update"
  ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id = 'calendar-company-branding' AND has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "branding bucket admin delete"
  ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'calendar-company-branding' AND has_role(auth.uid(), 'admin'::app_role));

-- 1g. Activity feed view
CREATE OR REPLACE VIEW public.v_calendar_activity_feed AS
SELECT
  a.id,
  a.event_id,
  e.user_id AS host_user_id,
  e.event_reference,
  a.from_status,
  a.to_status,
  a.actor_id,
  a.actor_kind,
  a.at,
  e.event_title,
  e.event_date,
  e.start_time,
  e.appointment_type,
  (SELECT p.full_name FROM public.calendar_participants p WHERE p.event_id = e.id LIMIT 1) AS visitor_name,
  (SELECT p.email     FROM public.calendar_participants p WHERE p.event_id = e.id LIMIT 1) AS visitor_email
FROM public.calendar_event_audit a
JOIN public.calendar_events e ON e.id = a.event_id;

GRANT SELECT ON public.v_calendar_activity_feed TO authenticated;

-- 1h. Manager team visibility
CREATE OR REPLACE FUNCTION public.fn_user_manages_user(_manager uuid, _target uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.team_members tm_mgr
    JOIN public.team_members tm_tgt
      ON tm_tgt.team_id = tm_mgr.team_id
    WHERE tm_mgr.user_id = _manager
      AND tm_tgt.user_id = _target
      AND has_role(_manager, 'manager'::app_role)
  );
$$;

-- Replace owner-only policies with owner+manager+admin reads
DROP POLICY IF EXISTS "calendar_events owner all" ON public.calendar_events;
CREATE POLICY "calendar_events read" ON public.calendar_events
  FOR SELECT TO authenticated
  USING (user_id = auth.uid()
         OR has_role(auth.uid(), 'admin'::app_role)
         OR public.fn_user_manages_user(auth.uid(), user_id));
CREATE POLICY "calendar_events write" ON public.calendar_events
  FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid() OR has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "calendar_events update" ON public.calendar_events
  FOR UPDATE TO authenticated
  USING (user_id = auth.uid()
         OR has_role(auth.uid(), 'admin'::app_role)
         OR public.fn_user_manages_user(auth.uid(), user_id))
  WITH CHECK (user_id = auth.uid()
         OR has_role(auth.uid(), 'admin'::app_role)
         OR public.fn_user_manages_user(auth.uid(), user_id));
CREATE POLICY "calendar_events delete" ON public.calendar_events
  FOR DELETE TO authenticated
  USING (user_id = auth.uid() OR has_role(auth.uid(), 'admin'::app_role));

DROP POLICY IF EXISTS "calendar_meeting_types owner all" ON public.calendar_meeting_types;
CREATE POLICY "meeting_types read" ON public.calendar_meeting_types
  FOR SELECT TO authenticated
  USING (user_id = auth.uid()
         OR has_role(auth.uid(), 'admin'::app_role)
         OR public.fn_user_manages_user(auth.uid(), user_id));
CREATE POLICY "meeting_types insert" ON public.calendar_meeting_types
  FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid() OR has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "meeting_types update" ON public.calendar_meeting_types
  FOR UPDATE TO authenticated
  USING (user_id = auth.uid() OR has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (user_id = auth.uid() OR has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "meeting_types delete" ON public.calendar_meeting_types
  FOR DELETE TO authenticated
  USING (user_id = auth.uid() OR has_role(auth.uid(), 'admin'::app_role));

-- Public anon read of active meeting types (needed for public booking page)
CREATE POLICY "meeting_types public read active" ON public.calendar_meeting_types
  FOR SELECT TO anon USING (is_active = true);

-- Public anon read of active profiles
CREATE POLICY "calendar_profiles public read active" ON public.calendar_profiles
  FOR SELECT TO anon USING (is_active = true);

GRANT SELECT ON public.calendar_meeting_types TO anon;
GRANT SELECT ON public.calendar_profiles TO anon;

-- 1.j slug suggestion helper
CREATE OR REPLACE FUNCTION public.fn_suggest_profile_slug(_base citext)
RETURNS citext LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_slug citext := _base;
  v_n integer := 2;
BEGIN
  WHILE EXISTS (SELECT 1 FROM public.calendar_profiles WHERE booking_slug = v_slug) LOOP
    v_slug := (_base || '-' || v_n)::citext;
    v_n := v_n + 1;
  END LOOP;
  RETURN v_slug;
END$$;

CREATE OR REPLACE FUNCTION public.fn_suggest_meeting_slug(_user uuid, _base citext)
RETURNS citext LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_slug citext := _base;
  v_n integer := 2;
BEGIN
  WHILE EXISTS (SELECT 1 FROM public.calendar_meeting_types WHERE user_id = _user AND slug = v_slug) LOOP
    v_slug := (_base || '-' || v_n)::citext;
    v_n := v_n + 1;
  END LOOP;
  RETURN v_slug;
END$$;

GRANT EXECUTE ON FUNCTION public.fn_suggest_profile_slug(citext) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.fn_suggest_meeting_slug(uuid, citext) TO anon, authenticated;

-- Allow updated_at trigger if not present
DROP TRIGGER IF EXISTS trg_calendar_company_branding_touch ON public.calendar_company_branding;
CREATE TRIGGER trg_calendar_company_branding_touch
  BEFORE UPDATE ON public.calendar_company_branding
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();
