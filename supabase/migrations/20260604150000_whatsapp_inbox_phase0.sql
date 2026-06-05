-- WhatsApp helpline inbox (Phase 0 — mock webhook + rules intake, $0)

CREATE OR REPLACE FUNCTION public.normalize_phone_digits(p_raw text)
RETURNS text
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT NULLIF(regexp_replace(COALESCE(p_raw, ''), '\D', '', 'g'), '')
$$;

CREATE OR REPLACE FUNCTION public.phone_digits_match(a text, b text)
RETURNS boolean
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT
    public.normalize_phone_digits(a) IS NOT NULL
    AND public.normalize_phone_digits(b) IS NOT NULL
    AND (
      public.normalize_phone_digits(a) = public.normalize_phone_digits(b)
      OR right(public.normalize_phone_digits(a), 10) = right(public.normalize_phone_digits(b), 10)
    )
$$;

CREATE TABLE IF NOT EXISTS public.whatsapp_conversations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  phone_e164 text NOT NULL,
  phone_display text,
  lead_id uuid REFERENCES public.leads(id) ON DELETE SET NULL,
  client_id uuid REFERENCES public.clients(id) ON DELETE SET NULL,
  assigned_user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  status text NOT NULL DEFAULT 'unmatched_ai_intake'
    CHECK (status IN (
      'unmatched_ai_intake',
      'awaiting_assignment_confirm',
      'assigned_active',
      'existing_client',
      'escalated_admin',
      'closed'
    )),
  intake_data jsonb NOT NULL DEFAULT '{}'::jsonb,
  ai_mode text NOT NULL DEFAULT 'rules'
    CHECK (ai_mode IN ('off', 'rules', 'mock', 'gemini_dev', 'production')),
  last_message_at timestamptz,
  last_inbound_at timestamptz,
  unread_count_staff integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS whatsapp_conversations_phone_open
  ON public.whatsapp_conversations (phone_e164)
  WHERE status <> 'closed';

CREATE INDEX IF NOT EXISTS whatsapp_conversations_assigned_user_id
  ON public.whatsapp_conversations (assigned_user_id);

CREATE INDEX IF NOT EXISTS whatsapp_conversations_status
  ON public.whatsapp_conversations (status);

CREATE TABLE IF NOT EXISTS public.whatsapp_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id uuid NOT NULL REFERENCES public.whatsapp_conversations(id) ON DELETE CASCADE,
  direction text NOT NULL CHECK (direction IN ('inbound', 'outbound')),
  body text NOT NULL,
  sent_by text NOT NULL DEFAULT 'contact'
    CHECK (sent_by IN ('contact', 'ai', 'staff', 'system')),
  sent_by_user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  provider_message_id text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS whatsapp_messages_conversation_id_created
  ON public.whatsapp_messages (conversation_id, created_at);

CREATE UNIQUE INDEX IF NOT EXISTS whatsapp_messages_provider_dedupe
  ON public.whatsapp_messages (provider_message_id)
  WHERE provider_message_id IS NOT NULL;

DROP TRIGGER IF EXISTS trg_whatsapp_conversations_updated ON public.whatsapp_conversations;
CREATE TRIGGER trg_whatsapp_conversations_updated
  BEFORE UPDATE ON public.whatsapp_conversations
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

ALTER TABLE public.whatsapp_conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.whatsapp_messages ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.whatsapp_can_view_conversation(_uid uuid, _conv_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.whatsapp_conversations wc
    WHERE wc.id = _conv_id
      AND (
        public.has_role(_uid, 'admin'::public.app_role)
        OR public.has_role(_uid, 'administrator'::public.app_role)
        OR wc.assigned_user_id = _uid
        OR (
          wc.assigned_user_id IS NULL
          AND wc.status IN ('unmatched_ai_intake', 'awaiting_assignment_confirm', 'escalated_admin')
          AND (
            public.has_role(_uid, 'telecaller'::public.app_role)
            OR public.has_role(_uid, 'admin'::public.app_role)
            OR public.has_role(_uid, 'administrator'::public.app_role)
          )
        )
      )
  )
$$;

CREATE OR REPLACE FUNCTION public.whatsapp_can_edit_conversation(_uid uuid, _conv_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.whatsapp_conversations wc
    WHERE wc.id = _conv_id
      AND (
        public.has_role(_uid, 'admin'::public.app_role)
        OR public.has_role(_uid, 'administrator'::public.app_role)
        OR wc.assigned_user_id = _uid
        OR (
          wc.status IN ('unmatched_ai_intake', 'awaiting_assignment_confirm', 'escalated_admin')
          AND (
            public.has_role(_uid, 'telecaller'::public.app_role)
            OR public.has_role(_uid, 'admin'::public.app_role)
            OR public.has_role(_uid, 'administrator'::public.app_role)
          )
        )
      )
  )
$$;

GRANT EXECUTE ON FUNCTION public.normalize_phone_digits(text) TO authenticated, anon;
GRANT EXECUTE ON FUNCTION public.phone_digits_match(text, text) TO authenticated, anon;
GRANT EXECUTE ON FUNCTION public.whatsapp_can_view_conversation(uuid, uuid) TO authenticated, anon;
GRANT EXECUTE ON FUNCTION public.whatsapp_can_edit_conversation(uuid, uuid) TO authenticated, anon;

-- Conversations
CREATE POLICY "whatsapp_conversations_select"
  ON public.whatsapp_conversations FOR SELECT TO authenticated
  USING (public.whatsapp_can_view_conversation(auth.uid(), id));

CREATE POLICY "whatsapp_conversations_update"
  ON public.whatsapp_conversations FOR UPDATE TO authenticated
  USING (public.whatsapp_can_edit_conversation(auth.uid(), id))
  WITH CHECK (public.whatsapp_can_edit_conversation(auth.uid(), id));

-- Messages
CREATE POLICY "whatsapp_messages_select"
  ON public.whatsapp_messages FOR SELECT TO authenticated
  USING (public.whatsapp_can_view_conversation(auth.uid(), conversation_id));

CREATE POLICY "whatsapp_messages_insert_staff"
  ON public.whatsapp_messages FOR INSERT TO authenticated
  WITH CHECK (
    direction = 'outbound'
    AND sent_by = 'staff'
    AND sent_by_user_id = auth.uid()
    AND public.whatsapp_can_edit_conversation(auth.uid(), conversation_id)
  );

-- Realtime (optional — safe if publication already exists)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime') THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.whatsapp_messages;
  END IF;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;
