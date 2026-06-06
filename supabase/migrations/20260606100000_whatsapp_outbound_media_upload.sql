-- Allow staff to upload outbound WhatsApp attachments (counselor → client)

CREATE POLICY "whatsapp_media_staff_upload"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'whatsapp-media'
    AND public.whatsapp_can_edit_conversation(
      auth.uid(),
      ((storage.foldername(name))[1])::uuid
    )
  );
