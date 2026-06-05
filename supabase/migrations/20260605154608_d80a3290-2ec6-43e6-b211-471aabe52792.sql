ALTER TABLE public.whatsapp_messages
  ADD COLUMN IF NOT EXISTS media_provider_id text;

CREATE INDEX IF NOT EXISTS idx_whatsapp_messages_media_provider_id
  ON public.whatsapp_messages (media_provider_id)
  WHERE media_provider_id IS NOT NULL;