
-- 1) Lock down UPI internal tables to commission admins only for SELECT
DROP POLICY IF EXISTS "upi_uploaded_documents read" ON public.upi_uploaded_documents;
DROP POLICY IF EXISTS "upi uploaded docs read" ON public.upi_uploaded_documents;
DROP POLICY IF EXISTS "Authenticated can read upi_uploaded_documents" ON public.upi_uploaded_documents;
DROP POLICY IF EXISTS "upi_uploaded_documents select" ON public.upi_uploaded_documents;
CREATE POLICY "upi_uploaded_documents admin read"
  ON public.upi_uploaded_documents FOR SELECT
  TO authenticated
  USING (public.is_commission_admin(auth.uid()));

DROP POLICY IF EXISTS "upi_ai_suggestions read" ON public.upi_ai_suggestions;
DROP POLICY IF EXISTS "Authenticated can read upi_ai_suggestions" ON public.upi_ai_suggestions;
DROP POLICY IF EXISTS "upi_ai_suggestions select" ON public.upi_ai_suggestions;
CREATE POLICY "upi_ai_suggestions admin read"
  ON public.upi_ai_suggestions FOR SELECT
  TO authenticated
  USING (public.is_commission_admin(auth.uid()));

DROP POLICY IF EXISTS "upi_sync_jobs read" ON public.upi_sync_jobs;
DROP POLICY IF EXISTS "Authenticated can read upi_sync_jobs" ON public.upi_sync_jobs;
DROP POLICY IF EXISTS "upi_sync_jobs select" ON public.upi_sync_jobs;
CREATE POLICY "upi_sync_jobs admin read"
  ON public.upi_sync_jobs FOR SELECT
  TO authenticated
  USING (public.is_commission_admin(auth.uid()));

DROP POLICY IF EXISTS "upi_sync_logs read" ON public.upi_sync_logs;
DROP POLICY IF EXISTS "Authenticated can read upi_sync_logs" ON public.upi_sync_logs;
DROP POLICY IF EXISTS "upi_sync_logs select" ON public.upi_sync_logs;
CREATE POLICY "upi_sync_logs admin read"
  ON public.upi_sync_logs FOR SELECT
  TO authenticated
  USING (public.is_commission_admin(auth.uid()));

-- 2) Restrict chat_message_reactions SELECT to channel members / message viewers
DROP POLICY IF EXISTS "chat_message_reactions read" ON public.chat_message_reactions;
DROP POLICY IF EXISTS "Reactions are viewable" ON public.chat_message_reactions;
DROP POLICY IF EXISTS "chat_message_reactions select" ON public.chat_message_reactions;
CREATE POLICY "chat_message_reactions view if can view message"
  ON public.chat_message_reactions FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.chat_messages m
      WHERE m.id = chat_message_reactions.message_id
        AND (
          (m.channel_id IS NOT NULL AND public.is_chat_channel_member(auth.uid(), m.channel_id))
          OR (m.client_id IS NOT NULL AND public.can_view_client(auth.uid(), m.client_id))
        )
    )
  );
