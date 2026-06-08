-- Reliable chat attachment storage reads (SECURITY DEFINER bypasses nested RLS during storage policy checks)

CREATE OR REPLACE FUNCTION public.can_read_chat_storage_path(_uid uuid, _path text)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.chat_message_attachments a
    JOIN public.chat_messages m ON m.id = a.message_id
    WHERE a.storage_path = _path
      AND (
        (m.channel_type IN ('staff_internal', 'staff_client')
          AND public.can_view_client(_uid, m.client_id))
        OR (m.channel_type IN ('direct', 'team_group')
          AND m.channel_id IS NOT NULL
          AND public.is_chat_channel_member(_uid, m.channel_id))
        OR (m.channel_type = 'staff_client'
          AND public.is_portal_user_for(_uid, m.client_id))
      )
  );
$$;

DROP POLICY IF EXISTS "client-documents chat read via attachment" ON storage.objects;
CREATE POLICY "client-documents chat read via attachment"
  ON storage.objects FOR SELECT TO authenticated
  USING (
    bucket_id = 'client-documents'
    AND public.can_read_chat_storage_path(auth.uid(), name)
  );
