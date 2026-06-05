-- WhatsApp inbound media (images, documents) — Phase 1.5

ALTER TABLE public.whatsapp_messages
  ADD COLUMN IF NOT EXISTS message_type text NOT NULL DEFAULT 'text'
    CHECK (message_type IN ('text', 'image', 'document', 'video', 'audio', 'unknown')),
  ADD COLUMN IF NOT EXISTS media_storage_path text,
  ADD COLUMN IF NOT EXISTS media_mime text;

INSERT INTO storage.buckets (id, name, public)
VALUES ('whatsapp-media', 'whatsapp-media', false)
ON CONFLICT (id) DO NOTHING;

-- Staff who can view the conversation may read its media (path: {conversation_id}/...)
CREATE POLICY "whatsapp_media_staff_read"
  ON storage.objects FOR SELECT TO authenticated
  USING (
    bucket_id = 'whatsapp-media'
    AND public.whatsapp_can_view_conversation(
      auth.uid(),
      ((storage.foldername(name))[1])::uuid
    )
  );
