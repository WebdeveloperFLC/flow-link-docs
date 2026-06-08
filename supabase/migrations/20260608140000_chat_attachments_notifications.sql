-- Chat attachment storage RLS, portal message notifications trigger, notification prefs columns

-- ── user_notification_prefs: ensure extended columns exist ──
ALTER TABLE public.user_notification_prefs
  ADD COLUMN IF NOT EXISTS muted_categories text[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS digest_frequency text NOT NULL DEFAULT 'off',
  ADD COLUMN IF NOT EXISTS escalation_alerts boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS timezone text NOT NULL DEFAULT 'Asia/Kolkata',
  ADD COLUMN IF NOT EXISTS created_at timestamptz NOT NULL DEFAULT now();

-- Align push column naming (11215 used browser_push_enabled; 124206 used push_enabled)
ALTER TABLE public.user_notification_prefs
  ADD COLUMN IF NOT EXISTS push_enabled boolean NOT NULL DEFAULT false;

UPDATE public.user_notification_prefs
SET push_enabled = browser_push_enabled
WHERE push_enabled IS DISTINCT FROM browser_push_enabled
  AND browser_push_enabled IS NOT NULL;

-- ── Storage: chat attachment upload/read ──
CREATE POLICY "client-documents chat client insert"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'client-documents'
    AND (storage.foldername(name))[2] = 'chat'
    AND (storage.foldername(name))[1] ~ '^[0-9a-f-]{36}$'
    AND (
      public.can_upload_client(auth.uid(), ((storage.foldername(name))[1])::uuid)
      OR public.is_portal_user_for(auth.uid(), ((storage.foldername(name))[1])::uuid)
    )
  );

CREATE POLICY "client-documents chat channel insert"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'client-documents'
    AND (storage.foldername(name))[1] = 'channels'
    AND (storage.foldername(name))[3] = 'chat'
    AND (storage.foldername(name))[2] ~ '^[0-9a-f-]{36}$'
    AND public.is_chat_channel_member(auth.uid(), ((storage.foldername(name))[2])::uuid)
  );

CREATE POLICY "client-documents chat read via attachment"
  ON storage.objects FOR SELECT TO authenticated
  USING (
    bucket_id = 'client-documents'
    AND EXISTS (
      SELECT 1
      FROM public.chat_message_attachments a
      JOIN public.chat_messages m ON m.id = a.message_id
      WHERE a.storage_path = storage.objects.name
        AND (
          (m.channel_type IN ('staff_internal', 'staff_client')
            AND public.can_view_client(auth.uid(), m.client_id))
          OR (m.channel_type IN ('direct', 'team_group')
            AND public.is_chat_channel_member(auth.uid(), m.channel_id))
          OR (m.channel_type = 'staff_client'
            AND public.is_portal_user_for(auth.uid(), m.client_id))
        )
    )
  );

-- ── Resolve client stakeholders for notifications (SECURITY DEFINER) ──
CREATE OR REPLACE FUNCTION public.resolve_client_stakeholder_user_ids(_client_id uuid)
RETURNS uuid[]
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  ids uuid[] := '{}';
  uid uuid;
  tid uuid;
BEGIN
  IF _client_id IS NULL THEN
    RETURN ids;
  END IF;

  SELECT COALESCE(array_agg(DISTINCT x), '{}')
  INTO ids
  FROM (
    SELECT c.assigned_counselor_id AS x FROM public.clients c WHERE c.id = _client_id AND c.assigned_counselor_id IS NOT NULL
    UNION
    SELECT c.owner_id FROM public.clients c WHERE c.id = _client_id AND c.owner_id IS NOT NULL
    UNION
    SELECT c.created_by FROM public.clients c WHERE c.id = _client_id AND c.created_by IS NOT NULL
    UNION
    SELECT ca.user_id FROM public.client_access ca
      WHERE ca.client_id = _client_id AND ca.user_id IS NOT NULL AND ca.revoked_at IS NULL
    UNION
    SELECT tm.user_id FROM public.client_access ca
      JOIN public.team_members tm ON tm.team_id = ca.team_id
      WHERE ca.client_id = _client_id AND ca.team_id IS NOT NULL AND ca.revoked_at IS NULL
  ) s
  WHERE x IS NOT NULL;

  RETURN ids;
END;
$$;

-- ── Portal client message → staff app_notifications (bypasses client-role insert RLS) ──
CREATE OR REPLACE FUNCTION public.fn_notify_portal_chat_message()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  uid uuid;
  excerpt text;
BEGIN
  IF NEW.sender_type <> 'client' OR NEW.channel_type <> 'staff_client' OR NEW.client_id IS NULL THEN
    RETURN NEW;
  END IF;

  excerpt := left(COALESCE(NULLIF(trim(NEW.message), ''), '(attachment)'), 140);

  FOREACH uid IN ARRAY public.resolve_client_stakeholder_user_ids(NEW.client_id)
  LOOP
    IF uid IS NULL OR uid = NEW.sender_id THEN
      CONTINUE;
    END IF;
    INSERT INTO public.app_notifications (
      user_id, category, severity, title, body, link,
      entity_type, entity_id, dedupe_key, metadata
    ) VALUES (
      uid,
      'portal_message',
      'info',
      'New message from client',
      excerpt,
      '/clients/' || NEW.client_id::text,
      'chat_message',
      NEW.id,
      'portal_msg:' || NEW.id::text,
      '{}'::jsonb
    )
    ON CONFLICT (user_id, dedupe_key) WHERE dedupe_key IS NOT NULL DO NOTHING;
  END LOOP;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_notify_portal_chat_message ON public.chat_messages;
CREATE TRIGGER trg_notify_portal_chat_message
  AFTER INSERT ON public.chat_messages
  FOR EACH ROW
  EXECUTE FUNCTION public.fn_notify_portal_chat_message();
