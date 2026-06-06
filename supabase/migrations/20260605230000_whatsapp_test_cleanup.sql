-- Allow admins to delete WhatsApp test conversations (messages cascade).

DROP POLICY IF EXISTS "whatsapp_conversations_delete_admin" ON public.whatsapp_conversations;
CREATE POLICY "whatsapp_conversations_delete_admin"
  ON public.whatsapp_conversations FOR DELETE TO authenticated
  USING (
    public.has_role(auth.uid(), 'admin'::public.app_role)
    OR public.has_role(auth.uid(), 'administrator'::public.app_role)
  );

DROP POLICY IF EXISTS "whatsapp_media_admin_delete" ON storage.objects;
CREATE POLICY "whatsapp_media_admin_delete"
  ON storage.objects FOR DELETE TO authenticated
  USING (
    bucket_id = 'whatsapp-media'
    AND (
      public.has_role(auth.uid(), 'admin'::public.app_role)
      OR public.has_role(auth.uid(), 'administrator'::public.app_role)
    )
  );
