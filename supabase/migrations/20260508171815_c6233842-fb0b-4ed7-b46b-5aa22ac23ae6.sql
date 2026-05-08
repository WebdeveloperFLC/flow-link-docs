ALTER TABLE public.telephony_provider_settings
  ADD COLUMN IF NOT EXISTS sbc_uri text,
  ADD COLUMN IF NOT EXISTS test_extension text;

ALTER TABLE public.telephony_agents
  ADD COLUMN IF NOT EXISTS sbc_user_id text,
  ADD COLUMN IF NOT EXISTS sbc_password text;