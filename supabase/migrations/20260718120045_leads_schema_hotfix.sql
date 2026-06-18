-- Hotfix: patch_lead_draft (migration 40/42) references l.followup_history but migration 37 may not be published.
-- Also re-assert client language_tests (migration 44) idempotently.

ALTER TABLE public.leads
  ADD COLUMN IF NOT EXISTS followup_history jsonb NOT NULL DEFAULT '[]'::jsonb;

ALTER TABLE public.leads
  ADD COLUMN IF NOT EXISTS language_tests jsonb NOT NULL DEFAULT '{}'::jsonb;

ALTER TABLE public.clients
  ADD COLUMN IF NOT EXISTS language_tests jsonb NOT NULL DEFAULT '{}'::jsonb;

-- Background columns on leads (no-op if migration 40 applied).
ALTER TABLE public.leads
  ADD COLUMN IF NOT EXISTS education_history jsonb NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS english_test text,
  ADD COLUMN IF NOT EXISTS english_test_status text,
  ADD COLUMN IF NOT EXISTS english_overall text,
  ADD COLUMN IF NOT EXISTS english_test_date date,
  ADD COLUMN IF NOT EXISTS english_test_expiry date,
  ADD COLUMN IF NOT EXISTS english_sections jsonb NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS other_tests jsonb NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS work_experience jsonb NOT NULL DEFAULT '[]'::jsonb;

COMMENT ON COLUMN public.leads.followup_history IS
  'Completed follow-ups [{id, scheduled_at, channel, note, completed_at, completion_note}].';

NOTIFY pgrst, 'reload schema';
