
-- 1) Extend roles
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'telecaller';
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'counselor';

-- 2) lead_handoffs
CREATE TABLE IF NOT EXISTS public.lead_handoffs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid NOT NULL,
  from_user uuid NOT NULL,
  to_user uuid NOT NULL,
  from_role text,
  to_role text,
  direction text NOT NULL CHECK (direction IN ('tc_to_co','co_to_tc','tc_to_tc','co_to_co')),
  note text,
  task_label text,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_lead_handoffs_client ON public.lead_handoffs(client_id, created_at DESC);
ALTER TABLE public.lead_handoffs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "lead_handoffs view scoped" ON public.lead_handoffs
  FOR SELECT TO authenticated
  USING (public.can_view_client(auth.uid(), client_id));

CREATE POLICY "lead_handoffs insert scoped" ON public.lead_handoffs
  FOR INSERT TO authenticated
  WITH CHECK (
    from_user = auth.uid()
    AND public.can_view_client(auth.uid(), client_id)
  );

CREATE POLICY "lead_handoffs admin delete" ON public.lead_handoffs
  FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role));

-- 3) chat_channels + members
CREATE TABLE IF NOT EXISTS public.chat_channels (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  type text NOT NULL CHECK (type IN ('direct','team_group')),
  name text,
  created_by uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.chat_channels ENABLE ROW LEVEL SECURITY;

CREATE TABLE IF NOT EXISTS public.chat_channel_members (
  channel_id uuid NOT NULL REFERENCES public.chat_channels(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  added_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (channel_id, user_id)
);
CREATE INDEX IF NOT EXISTS idx_chat_channel_members_user ON public.chat_channel_members(user_id);
ALTER TABLE public.chat_channel_members ENABLE ROW LEVEL SECURITY;

-- Security definer to avoid recursive RLS between channels and members
CREATE OR REPLACE FUNCTION public.is_chat_channel_member(_uid uuid, _channel uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.chat_channel_members
    WHERE channel_id = _channel AND user_id = _uid
  )
$$;

-- chat_channels policies
CREATE POLICY "chat_channels view members"
  ON public.chat_channels FOR SELECT TO authenticated
  USING (
    public.has_role(auth.uid(), 'admin'::app_role)
    OR created_by = auth.uid()
    OR public.is_chat_channel_member(auth.uid(), id)
  );

CREATE POLICY "chat_channels insert self"
  ON public.chat_channels FOR INSERT TO authenticated
  WITH CHECK (created_by = auth.uid());

CREATE POLICY "chat_channels delete creator"
  ON public.chat_channels FOR DELETE TO authenticated
  USING (created_by = auth.uid() OR public.has_role(auth.uid(), 'admin'::app_role));

-- chat_channel_members policies
CREATE POLICY "channel_members view"
  ON public.chat_channel_members FOR SELECT TO authenticated
  USING (
    public.has_role(auth.uid(), 'admin'::app_role)
    OR user_id = auth.uid()
    OR public.is_chat_channel_member(auth.uid(), channel_id)
  );

CREATE POLICY "channel_members insert by creator"
  ON public.chat_channel_members FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.chat_channels c
      WHERE c.id = channel_id AND (c.created_by = auth.uid() OR public.has_role(auth.uid(), 'admin'::app_role))
    )
    OR (
      -- allow self-add at channel creation time only when no members exist yet
      user_id = auth.uid()
      AND EXISTS (SELECT 1 FROM public.chat_channels c WHERE c.id = channel_id AND c.created_by = auth.uid())
    )
  );

CREATE POLICY "channel_members delete by creator"
  ON public.chat_channel_members FOR DELETE TO authenticated
  USING (
    user_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM public.chat_channels c
      WHERE c.id = channel_id AND (c.created_by = auth.uid() OR public.has_role(auth.uid(), 'admin'::app_role))
    )
  );

-- 4) chat_messages
CREATE TABLE IF NOT EXISTS public.chat_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  channel_type text NOT NULL CHECK (channel_type IN ('staff_internal','staff_client','direct','team_group')),
  client_id uuid,
  channel_id uuid REFERENCES public.chat_channels(id) ON DELETE CASCADE,
  sender_id uuid NOT NULL,
  sender_type text NOT NULL DEFAULT 'staff' CHECK (sender_type IN ('staff','client')),
  message text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  CHECK (
    (channel_type IN ('staff_internal','staff_client') AND client_id IS NOT NULL AND channel_id IS NULL)
    OR (channel_type IN ('direct','team_group') AND channel_id IS NOT NULL AND client_id IS NULL)
  )
);
CREATE INDEX IF NOT EXISTS idx_chat_messages_client ON public.chat_messages(client_id, channel_type, created_at);
CREATE INDEX IF NOT EXISTS idx_chat_messages_channel ON public.chat_messages(channel_id, created_at);
ALTER TABLE public.chat_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "chat_messages view"
  ON public.chat_messages FOR SELECT TO authenticated
  USING (
    (channel_type IN ('staff_internal','staff_client') AND public.can_view_client(auth.uid(), client_id))
    OR (channel_type IN ('direct','team_group') AND public.is_chat_channel_member(auth.uid(), channel_id))
  );

CREATE POLICY "chat_messages insert"
  ON public.chat_messages FOR INSERT TO authenticated
  WITH CHECK (
    sender_id = auth.uid()
    AND (
      (channel_type IN ('staff_internal','staff_client') AND public.can_view_client(auth.uid(), client_id))
      OR (channel_type IN ('direct','team_group') AND public.is_chat_channel_member(auth.uid(), channel_id))
    )
  );

CREATE POLICY "chat_messages delete own or admin"
  ON public.chat_messages FOR DELETE TO authenticated
  USING (sender_id = auth.uid() OR public.has_role(auth.uid(), 'admin'::app_role));

-- 5) client_timeline
CREATE TABLE IF NOT EXISTS public.client_timeline (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid NOT NULL,
  event_type text NOT NULL,
  actor_id uuid,
  summary text,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_client_timeline_client ON public.client_timeline(client_id, created_at DESC);
ALTER TABLE public.client_timeline ENABLE ROW LEVEL SECURITY;

CREATE POLICY "client_timeline view scoped"
  ON public.client_timeline FOR SELECT TO authenticated
  USING (public.can_view_client(auth.uid(), client_id));

CREATE POLICY "client_timeline insert scoped"
  ON public.client_timeline FOR INSERT TO authenticated
  WITH CHECK (
    public.can_view_client(auth.uid(), client_id)
    AND (actor_id IS NULL OR actor_id = auth.uid())
  );

CREATE POLICY "client_timeline admin delete"
  ON public.client_timeline FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role));

-- 6) Realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.lead_handoffs;
ALTER PUBLICATION supabase_realtime ADD TABLE public.chat_messages;
ALTER PUBLICATION supabase_realtime ADD TABLE public.client_timeline;
ALTER PUBLICATION supabase_realtime ADD TABLE public.chat_channels;
ALTER PUBLICATION supabase_realtime ADD TABLE public.chat_channel_members;
