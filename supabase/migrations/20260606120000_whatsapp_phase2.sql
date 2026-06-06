-- WhatsApp Phase 2: business lines (helpline + legacy counselor), assignment history

-- Default helpline line — update meta_phone_number_id in CRM to match WHATSAPP_PHONE_NUMBER_ID secret
CREATE TABLE IF NOT EXISTS public.whatsapp_business_lines (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  label text NOT NULL,
  meta_phone_number_id text NOT NULL,
  display_phone text,
  line_type text NOT NULL DEFAULT 'helpline'
    CHECK (line_type IN ('helpline', 'counselor')),
  assigned_user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  is_default boolean NOT NULL DEFAULT false,
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT whatsapp_business_lines_meta_phone_unique UNIQUE (meta_phone_number_id)
);

INSERT INTO public.whatsapp_business_lines (
  id, label, meta_phone_number_id, display_phone, line_type, is_default, active
)
VALUES (
  'a0000000-0000-4000-8000-000000000001',
  'Helpline',
  'CONFIGURE_ME',
  NULL,
  'helpline',
  true,
  true
)
ON CONFLICT (id) DO NOTHING;

ALTER TABLE public.whatsapp_conversations
  ADD COLUMN IF NOT EXISTS business_line_id uuid REFERENCES public.whatsapp_business_lines(id) ON DELETE SET NULL;

UPDATE public.whatsapp_conversations
SET business_line_id = 'a0000000-0000-4000-8000-000000000001'
WHERE business_line_id IS NULL;

DROP INDEX IF EXISTS public.whatsapp_conversations_phone_open;

CREATE UNIQUE INDEX IF NOT EXISTS whatsapp_conversations_phone_line_open
  ON public.whatsapp_conversations (phone_e164, business_line_id)
  WHERE status <> 'closed';

CREATE TABLE IF NOT EXISTS public.whatsapp_conversation_assignments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id uuid NOT NULL REFERENCES public.whatsapp_conversations(id) ON DELETE CASCADE,
  assigned_user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  assigned_by_user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS whatsapp_conversation_assignments_conv
  ON public.whatsapp_conversation_assignments (conversation_id, created_at DESC);

ALTER TABLE public.whatsapp_business_lines ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.whatsapp_conversation_assignments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "whatsapp_business_lines_select"
  ON public.whatsapp_business_lines FOR SELECT TO authenticated
  USING (true);

CREATE POLICY "whatsapp_business_lines_admin_write"
  ON public.whatsapp_business_lines FOR ALL TO authenticated
  USING (
    public.has_role(auth.uid(), 'admin'::public.app_role)
    OR public.has_role(auth.uid(), 'administrator'::public.app_role)
  )
  WITH CHECK (
    public.has_role(auth.uid(), 'admin'::public.app_role)
    OR public.has_role(auth.uid(), 'administrator'::public.app_role)
  );

CREATE POLICY "whatsapp_assignments_select"
  ON public.whatsapp_conversation_assignments FOR SELECT TO authenticated
  USING (public.whatsapp_can_view_conversation(auth.uid(), conversation_id));

CREATE POLICY "whatsapp_assignments_insert"
  ON public.whatsapp_conversation_assignments FOR INSERT TO authenticated
  WITH CHECK (public.whatsapp_can_edit_conversation(auth.uid(), conversation_id));
