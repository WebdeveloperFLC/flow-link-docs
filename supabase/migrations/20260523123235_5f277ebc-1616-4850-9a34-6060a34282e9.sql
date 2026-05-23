
ALTER TABLE public.clients
  ADD COLUMN IF NOT EXISTS english_sections   jsonb NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS education_history  jsonb NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS work_experience    jsonb NOT NULL DEFAULT '[]'::jsonb;

ALTER TABLE public.client_family_members
  ADD COLUMN IF NOT EXISTS last_education      text,
  ADD COLUMN IF NOT EXISTS institution_name    text,
  ADD COLUMN IF NOT EXISTS year_of_passing     integer,
  ADD COLUMN IF NOT EXISTS percentage_cgpa     text,
  ADD COLUMN IF NOT EXISTS english_test        text,
  ADD COLUMN IF NOT EXISTS english_overall     text,
  ADD COLUMN IF NOT EXISTS english_test_date   date,
  ADD COLUMN IF NOT EXISTS english_test_expiry date,
  ADD COLUMN IF NOT EXISTS english_sections    jsonb NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS other_tests         jsonb NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS education_history   jsonb NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS work_experience     jsonb NOT NULL DEFAULT '[]'::jsonb;
