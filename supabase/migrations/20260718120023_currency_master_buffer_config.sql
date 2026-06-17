-- Global FX buffer config on Currency Master (master_lists.metadata).
-- Preserves existing per-row buffer_fixed on fx_rates.

ALTER TABLE public.master_lists
  ADD COLUMN IF NOT EXISTS metadata jsonb NOT NULL DEFAULT '{}'::jsonb;

UPDATE public.master_lists
SET metadata = COALESCE(metadata, '{}'::jsonb) || jsonb_build_object(
  'default_buffer_fixed', COALESCE((metadata->>'default_buffer_fixed')::numeric, 2),
  'default_buffer_pct', COALESCE((metadata->>'default_buffer_pct')::numeric, 0)
)
WHERE key = 'currencies';

COMMENT ON COLUMN public.master_lists.metadata IS
  'List-level config. currencies: default_buffer_fixed, default_buffer_pct for CRM FX policy.';
