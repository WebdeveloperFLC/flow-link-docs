-- Service Library rich content (JSON). Master = default; override = per-country patches.
ALTER TABLE public.service_library
  ADD COLUMN IF NOT EXISTS academy_metadata jsonb NOT NULL DEFAULT '{}'::jsonb;

ALTER TABLE public.service_library_overrides
  ADD COLUMN IF NOT EXISTS academy_metadata jsonb NOT NULL DEFAULT '{}'::jsonb;

COMMENT ON COLUMN public.service_library.academy_metadata IS
  'Service Library UI: KPIs, red flags, FAQs, eligibility, alerts, changelog, etc.';

COMMENT ON COLUMN public.service_library_overrides.academy_metadata IS
  'Per-country Service Library metadata overrides (merged on top of master.academy_metadata).';
