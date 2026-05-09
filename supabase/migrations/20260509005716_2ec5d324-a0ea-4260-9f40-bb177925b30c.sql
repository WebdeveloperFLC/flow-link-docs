
-- Telecaller module additive migration
ALTER TABLE public.call_queue_items
  ADD COLUMN IF NOT EXISTS notes text,
  ADD COLUMN IF NOT EXISTS source text DEFAULT 'manual',
  ADD COLUMN IF NOT EXISTS lead_status text DEFAULT 'warm';

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'call_queue_items_lead_status_check') THEN
    ALTER TABLE public.call_queue_items
      ADD CONSTRAINT call_queue_items_lead_status_check
      CHECK (lead_status IN ('hot','warm','cold','not_interested','converted'));
  END IF;
END $$;

-- lead_remarks: searchable predefined + custom per call
CREATE TABLE IF NOT EXISTS public.lead_remarks (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.clients(id) on delete cascade,
  call_session_id uuid references public.call_sessions(id) on delete set null,
  queue_item_id uuid references public.call_queue_items(id) on delete set null,
  author_id uuid not null,
  outcome text,
  remark text not null,
  lead_status text,
  next_callback_at timestamptz,
  created_at timestamptz not null default now()
);

CREATE INDEX IF NOT EXISTS idx_lead_remarks_client ON public.lead_remarks(client_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_lead_remarks_search ON public.lead_remarks USING gin (to_tsvector('simple', remark));

ALTER TABLE public.lead_remarks ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "remarks read scoped" ON public.lead_remarks;
CREATE POLICY "remarks read scoped" ON public.lead_remarks FOR SELECT TO authenticated
  USING (public.can_view_client(auth.uid(), client_id));
DROP POLICY IF EXISTS "remarks insert scoped" ON public.lead_remarks;
CREATE POLICY "remarks insert scoped" ON public.lead_remarks FOR INSERT TO authenticated
  WITH CHECK (author_id = auth.uid() AND public.can_view_client(auth.uid(), client_id));
DROP POLICY IF EXISTS "remarks update own" ON public.lead_remarks;
CREATE POLICY "remarks update own" ON public.lead_remarks FOR UPDATE TO authenticated
  USING (author_id = auth.uid() OR public.has_role(auth.uid(), 'admin'::app_role));

-- Predefined remark options (admin-managed)
CREATE TABLE IF NOT EXISTS public.remark_presets (
  id uuid primary key default gen_random_uuid(),
  label text not null,
  category text not null default 'general',
  sort_order int not null default 0,
  active boolean not null default true,
  created_at timestamptz not null default now()
);

ALTER TABLE public.remark_presets ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "remark_presets read all" ON public.remark_presets;
CREATE POLICY "remark_presets read all" ON public.remark_presets FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "remark_presets admin write" ON public.remark_presets;
CREATE POLICY "remark_presets admin write" ON public.remark_presets FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

INSERT INTO public.remark_presets (label, category, sort_order) VALUES
  ('Hot Lead - Interested', 'status', 10),
  ('Warm Lead - Follow up later', 'status', 20),
  ('Cold Lead - Not ready', 'status', 30),
  ('Not Interested', 'status', 40),
  ('Callback requested', 'status', 50),
  ('Documents pending', 'status', 60),
  ('Fee discussion needed', 'status', 70),
  ('Wrong number', 'outcome', 80),
  ('No answer', 'outcome', 90),
  ('Busy', 'outcome', 100),
  ('Asked for IELTS score', 'task', 110),
  ('Parent wants to discuss', 'task', 120),
  ('Will call back after exams', 'task', 130)
ON CONFLICT DO NOTHING;

-- Telecaller status (Start/Pause/Break for Operating Console)
CREATE TABLE IF NOT EXISTS public.telecaller_status (
  user_id uuid primary key,
  status text not null default 'offline',
  campaign_id uuid references public.call_campaigns(id) on delete set null,
  changed_at timestamptz not null default now()
);

ALTER TABLE public.telecaller_status ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "telecaller_status self read" ON public.telecaller_status;
CREATE POLICY "telecaller_status self read" ON public.telecaller_status FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.has_role(auth.uid(), 'admin'::app_role));
DROP POLICY IF EXISTS "telecaller_status self write" ON public.telecaller_status;
CREATE POLICY "telecaller_status self write" ON public.telecaller_status FOR ALL TO authenticated
  USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

-- RPC: bulk lead import (admin/counselor/team_lead). Telecallers cannot import.
CREATE OR REPLACE FUNCTION public.import_lead(
  _full_name text, _phone text, _email text DEFAULT NULL,
  _country text DEFAULT 'India', _service text DEFAULT 'Student Visa (SDS)',
  _academics text DEFAULT NULL, _ielts text DEFAULT NULL,
  _lead_status text DEFAULT 'warm',
  _assigned_telecaller_email text DEFAULT NULL,
  _assigned_counselor_email text DEFAULT NULL,
  _campaign_id uuid DEFAULT NULL,
  _notes text DEFAULT NULL,
  _dedupe_action text DEFAULT 'skip'   -- 'skip' | 'update' | 'merge'
) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  uid uuid := auth.uid();
  cid uuid;
  existing_id uuid;
  tc_user uuid; co_user uuid;
  tc_agent uuid;
  result jsonb;
  status_text text := 'created';
BEGIN
  IF uid IS NULL THEN RAISE EXCEPTION 'Not authenticated' USING ERRCODE='28000'; END IF;
  IF NOT (public.has_role(uid,'admin'::app_role) OR public.has_role(uid,'counselor'::app_role)) THEN
    RAISE EXCEPTION 'Only admins, counselors, or team leads can import leads' USING ERRCODE='42501';
  END IF;
  IF _phone IS NULL OR length(btrim(_phone))<6 THEN
    RAISE EXCEPTION 'Phone required' USING ERRCODE='22023';
  END IF;

  SELECT id INTO existing_id FROM public.clients
   WHERE phone = btrim(_phone) OR (NULLIF(_email,'') IS NOT NULL AND lower(email)=lower(_email))
   ORDER BY created_at ASC LIMIT 1;

  IF existing_id IS NOT NULL AND _dedupe_action = 'skip' THEN
    RETURN jsonb_build_object('client_id', existing_id, 'status', 'skipped');
  END IF;

  IF existing_id IS NULL THEN
    INSERT INTO public.clients(full_name, phone, email, country, application_type, owner_id, created_by, notes)
    VALUES (btrim(_full_name), btrim(_phone), NULLIF(_email,''), _country, _service, uid, uid,
            COALESCE(_notes, ''))
    RETURNING id INTO cid;
  ELSE
    cid := existing_id;
    IF _dedupe_action IN ('update','merge') THEN
      UPDATE public.clients SET
        full_name = COALESCE(NULLIF(_full_name,''), full_name),
        email     = COALESCE(NULLIF(_email,''), email),
        country   = COALESCE(NULLIF(_country,''), country),
        notes     = CASE WHEN _dedupe_action='merge' THEN COALESCE(notes,'') || E'\n' || COALESCE(_notes,'') ELSE COALESCE(NULLIF(_notes,''), notes) END,
        updated_at = now()
      WHERE id = cid;
      status_text := 'updated';
    END IF;
  END IF;

  IF _assigned_telecaller_email IS NOT NULL THEN
    SELECT id INTO tc_user FROM public.profiles WHERE lower(email)=lower(_assigned_telecaller_email) LIMIT 1;
    IF tc_user IS NOT NULL THEN
      SELECT id INTO tc_agent FROM public.telephony_agents WHERE user_id = tc_user LIMIT 1;
      INSERT INTO public.client_access(client_id, user_id, permission, granted_by)
      VALUES (cid, tc_user, 'edit'::client_permission, uid)
      ON CONFLICT (client_id, user_id) WHERE user_id IS NOT NULL DO UPDATE SET revoked_at = NULL;
    END IF;
  END IF;

  IF _assigned_counselor_email IS NOT NULL THEN
    SELECT id INTO co_user FROM public.profiles WHERE lower(email)=lower(_assigned_counselor_email) LIMIT 1;
    IF co_user IS NOT NULL THEN
      INSERT INTO public.client_access(client_id, user_id, permission, granted_by)
      VALUES (cid, co_user, 'full'::client_permission, uid)
      ON CONFLICT (client_id, user_id) WHERE user_id IS NOT NULL DO UPDATE SET revoked_at = NULL;
    END IF;
  END IF;

  -- Add to call queue (only if no active queue item)
  IF NOT EXISTS (SELECT 1 FROM public.call_queue_items WHERE client_id=cid AND status IN ('queued','calling','callback')) THEN
    INSERT INTO public.call_queue_items(client_id, campaign_id, assigned_agent_id, lead_status, source, notes, priority)
    VALUES (cid, _campaign_id, tc_agent,
            COALESCE(_lead_status,'warm'),
            'csv',
            _notes,
            CASE _lead_status WHEN 'hot' THEN 100 WHEN 'warm' THEN 50 ELSE 10 END);
  END IF;

  -- Timeline
  INSERT INTO public.client_timeline(client_id, event_type, actor_id, summary, metadata)
  VALUES (cid, 'note', uid, 'Imported via CSV', jsonb_build_object('lead_status', _lead_status, 'campaign_id', _campaign_id));

  RETURN jsonb_build_object('client_id', cid, 'status', status_text);
END $$;

-- Add call_queue_items to realtime publication
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname='supabase_realtime' AND tablename='call_queue_items') THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.call_queue_items;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname='supabase_realtime' AND tablename='lead_remarks') THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.lead_remarks;
  END IF;
END $$;
