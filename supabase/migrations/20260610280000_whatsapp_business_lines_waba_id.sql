-- Store Meta WhatsApp Business Account ID (WABA) per line for multi-helpline setups.

ALTER TABLE public.whatsapp_business_lines
  ADD COLUMN IF NOT EXISTS meta_waba_id text;

COMMENT ON COLUMN public.whatsapp_business_lines.meta_waba_id IS
  'Meta WhatsApp Business Account ID (WABA). Required for multi-line setups; used for admin reference and future per-WABA features.';
