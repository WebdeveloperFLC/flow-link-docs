-- Phase E1: Multi-attempt Tests module — storage columns on clients + leads.
-- Full attempt history lives in test_attempts; active_attempt_ids picks counselor-facing result per test type.
-- Legacy english_sections / other_tests / language_tests remain for triggers and dual-write mirror.

ALTER TABLE public.clients
  ADD COLUMN IF NOT EXISTS test_attempts jsonb NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS active_attempt_ids jsonb NOT NULL DEFAULT '{}'::jsonb;

ALTER TABLE public.leads
  ADD COLUMN IF NOT EXISTS test_attempts jsonb NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS active_attempt_ids jsonb NOT NULL DEFAULT '{}'::jsonb;

COMMENT ON COLUMN public.clients.test_attempts IS
  'Phase E: array of test attempt objects (attempt_id, test_id, status, scores, docs). Source of truth for Tests tab.';
COMMENT ON COLUMN public.clients.active_attempt_ids IS
  'Phase E: map test_id → attempt_id for active result per test type (e.g. ielts → test_abc123).';
COMMENT ON COLUMN public.leads.test_attempts IS
  'Phase E: test attempts on lead background — same shape as clients.test_attempts.';
COMMENT ON COLUMN public.leads.active_attempt_ids IS
  'Phase E: active attempt per test type on lead.';
