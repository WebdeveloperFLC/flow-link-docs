-- WhatsApp Phase 5: AI counseling status (Gemini answers before counselor assign)

ALTER TABLE public.whatsapp_conversations
  DROP CONSTRAINT IF EXISTS whatsapp_conversations_status_check;

ALTER TABLE public.whatsapp_conversations
  ADD CONSTRAINT whatsapp_conversations_status_check
  CHECK (status IN (
    'unmatched_ai_intake',
    'ai_counseling',
    'awaiting_assignment_confirm',
    'assigned_active',
    'existing_client',
    'escalated_admin',
    'closed'
  ));

ALTER TABLE public.whatsapp_conversations
  DROP CONSTRAINT IF EXISTS whatsapp_conversations_ai_mode_check;

ALTER TABLE public.whatsapp_conversations
  ADD CONSTRAINT whatsapp_conversations_ai_mode_check
  CHECK (ai_mode IN ('off', 'rules', 'mock', 'gemini', 'gemini_dev', 'production'));

COMMENT ON COLUMN public.whatsapp_conversations.status IS
  'ai_counseling = intake done, Gemini answering client questions before human assign';

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
          AND wc.status IN ('unmatched_ai_intake', 'ai_counseling', 'awaiting_assignment_confirm', 'escalated_admin')
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
          wc.status IN ('unmatched_ai_intake', 'ai_counseling', 'awaiting_assignment_confirm', 'escalated_admin')
          AND (
            public.has_role(_uid, 'telecaller'::public.app_role)
            OR public.has_role(_uid, 'admin'::public.app_role)
            OR public.has_role(_uid, 'administrator'::public.app_role)
          )
        )
      )
  )
$$;
