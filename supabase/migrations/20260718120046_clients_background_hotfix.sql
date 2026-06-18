-- Hotfix: client profile background save needs english_test_status on clients (leads had it from migration 40).
-- Idempotent — safe if migration 42/44/45 already applied.

ALTER TABLE public.clients
  ADD COLUMN IF NOT EXISTS english_test_status text;

COMMENT ON COLUMN public.clients.english_test_status IS 'not_taken | scheduled | taken | waived';

NOTIFY pgrst, 'reload schema';
