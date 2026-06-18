-- Hotfix: Register as Client requires language_tests on clients (migration 42 may not be published yet).
-- Idempotent — safe to run even if 20260718120042 already applied.

ALTER TABLE public.clients
  ADD COLUMN IF NOT EXISTS language_tests jsonb NOT NULL DEFAULT '{}'::jsonb;

ALTER TABLE public.leads
  ADD COLUMN IF NOT EXISTS language_tests jsonb NOT NULL DEFAULT '{}'::jsonb;

COMMENT ON COLUMN public.clients.language_tests IS 'French/german blocks {french:{...}, german:{...}} copied from lead on conversion';

NOTIFY pgrst, 'reload schema';
