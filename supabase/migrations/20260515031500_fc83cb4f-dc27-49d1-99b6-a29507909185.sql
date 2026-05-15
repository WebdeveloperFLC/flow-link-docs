
-- 1. Voice notes storage INSERT: scope to client folder + edit rights
DROP POLICY IF EXISTS "voice notes insert" ON storage.objects;
CREATE POLICY "voice notes insert"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'voice-notes'
  AND (storage.foldername(name))[1] ~ '^[0-9a-f-]{36}$'
  AND public.can_edit_client(auth.uid(), ((storage.foldername(name))[1])::uuid)
);

-- 2. Chat message attachments: restrict SELECT to channel members / client viewers
DROP POLICY IF EXISTS "attachments read via message" ON public.chat_message_attachments;
CREATE POLICY "attachments read via message"
ON public.chat_message_attachments
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.chat_messages m
    WHERE m.id = chat_message_attachments.message_id
      AND (
        (m.channel_type IN ('staff_internal','staff_client') AND public.can_view_client(auth.uid(), m.client_id))
        OR (m.channel_type IN ('direct','team_group') AND public.is_chat_channel_member(auth.uid(), m.channel_id))
      )
  )
);

-- 3. Set fixed search_path on email queue helper functions
ALTER FUNCTION public.delete_email(text, bigint) SET search_path = public;
ALTER FUNCTION public.enqueue_email(text, jsonb) SET search_path = public;
ALTER FUNCTION public.move_to_dlq(text, text, bigint, jsonb) SET search_path = public;
ALTER FUNCTION public.read_email_batch(text, integer, integer) SET search_path = public;
