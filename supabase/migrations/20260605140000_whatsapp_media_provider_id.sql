-- Store Meta media ID so CRM can lazy-fetch when webhook upload fails or is slow

ALTER TABLE public.whatsapp_messages
  ADD COLUMN IF NOT EXISTS media_provider_id text;
