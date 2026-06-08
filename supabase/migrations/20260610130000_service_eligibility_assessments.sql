-- Per-service eligibility assessments (Visa & Immigration)

CREATE TABLE IF NOT EXISTS public.service_eligibility_questions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  library_id uuid NOT NULL REFERENCES public.service_library(id) ON DELETE CASCADE,
  code text NOT NULL,
  section text NOT NULL DEFAULT 'eligibility',
  label text NOT NULL,
  help_text text,
  q_type text NOT NULL DEFAULT 'yes_no',
  options jsonb,
  conditional_on jsonb,
  rule jsonb NOT NULL DEFAULT '{}'::jsonb,
  prefill_field text,
  allows_pending_note boolean NOT NULL DEFAULT false,
  sort_order int NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (library_id, code)
);

CREATE INDEX IF NOT EXISTS idx_service_eligibility_questions_library
  ON public.service_eligibility_questions(library_id, sort_order);

ALTER TABLE public.assessment_sessions
  ADD COLUMN IF NOT EXISTS library_id uuid REFERENCES public.service_library(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS assessment_kind text NOT NULL DEFAULT 'settle_abroad',
  ADD COLUMN IF NOT EXISTS prospect_notes text,
  ADD COLUMN IF NOT EXISTS pending_items jsonb NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS source text NOT NULL DEFAULT 'staff',
  ADD COLUMN IF NOT EXISTS public_token text UNIQUE,
  ADD COLUMN IF NOT EXISTS prospect_name text,
  ADD COLUMN IF NOT EXISTS prospect_email text,
  ADD COLUMN IF NOT EXISTS prospect_phone text,
  ADD COLUMN IF NOT EXISTS created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_assessment_sessions_library
  ON public.assessment_sessions(library_id) WHERE library_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_assessment_sessions_public_token
  ON public.assessment_sessions(public_token) WHERE public_token IS NOT NULL;

ALTER TABLE public.service_eligibility_questions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "service_eligibility_questions_staff_read"
  ON public.service_eligibility_questions FOR SELECT TO authenticated USING (true);

CREATE POLICY "service_eligibility_questions_public_read"
  ON public.service_eligibility_questions FOR SELECT TO anon USING (is_active = true);

CREATE POLICY "service_eligibility_questions_admin_write"
  ON public.service_eligibility_questions FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role) OR public.has_role(auth.uid(), 'administrator'::app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role) OR public.has_role(auth.uid(), 'administrator'::app_role));

-- BOWP eligibility questions (client-facing items 1-9)
INSERT INTO public.service_eligibility_questions
  (library_id, code, section, label, help_text, q_type, options, conditional_on, rule, prefill_field, allows_pending_note, sort_order)
SELECT v.library_id, v.code, v.section, v.label, v.help_text, v.q_type, v.options, v.conditional_on, v.rule, v.prefill_field, v.allows_pending_note, v.sort_order
FROM (VALUES
  ('b2000001-0001-4000-8000-000000000017'::uuid, 'in_canada', 'location', 'Is the client physically in Canada when applying?', 'BOWP requires in-Canada filing.', 'yes_no', NULL::jsonb, NULL::jsonb, '{"block_if":{"equals":false},"outcome_if_fail":"not_yet"}'::jsonb, NULL, false, 10),
  ('b2000001-0001-4000-8000-000000000017'::uuid, 'valid_status', 'status', 'Does the client hold valid temporary resident status (or qualify to restore)?', 'Check expiry date before filing.', 'yes_no', NULL::jsonb, NULL::jsonb, '{"warn_if":{"equals":false}}'::jsonb, NULL, false, 20),
  ('b2000001-0001-4000-8000-000000000017'::uuid, 'restore_within_180', 'status', 'If status expired, is restoration within 180 days still possible?', 'Restoration must generally be filed within 90 days of expiry; confirm facts.', 'yes_no', NULL::jsonb, '{"question":"valid_status","equals":false}'::jsonb, '{"block_if":{"equals":false},"outcome_if_fail":"not_yet"}'::jsonb, NULL, false, 25),
  ('b2000001-0001-4000-8000-000000000017'::uuid, 'pr_submitted', 'pr_application', 'Has an eligible permanent residence application been submitted?', NULL, 'yes_no', NULL::jsonb, NULL::jsonb, '{"block_if":{"equals":false},"outcome_if_fail":"not_yet"}'::jsonb, NULL, false, 30),
  ('b2000001-0001-4000-8000-000000000017'::uuid, 'aor_proof', 'pr_application', 'What proof of PR submission exists?', 'Do not use payment receipt alone.', 'select', '["AOR (Acknowledgement of Receipt)","Completeness letter / proof","Payment receipt only","None yet"]'::jsonb, NULL, '{"block_if":{"equals":"None yet"},"warn_if":{"equals":"Payment receipt only"}}'::jsonb, NULL, true, 40),
  ('b2000001-0001-4000-8000-000000000017'::uuid, 'wp_expiry_ok', 'work_permit', 'Is the current work permit expiry within the allowed BOWP window, or is maintained status in place?', NULL, 'yes_no', NULL::jsonb, NULL::jsonb, '{"warn_if":{"equals":false}}'::jsonb, 'clients.study_permit_expiry', false, 50),
  ('b2000001-0001-4000-8000-000000000017'::uuid, 'passport_valid', 'documents', 'Is the passport valid for the requested work permit period?', NULL, 'yes_no', NULL::jsonb, NULL::jsonb, '{"warn_if":{"equals":false},"allows_pending":true}'::jsonb, 'clients.passport_expiry', true, 60),
  ('b2000001-0001-4000-8000-000000000017'::uuid, 'pnp_restriction', 'pnp', 'If PNP-based, does the nomination have employment restrictions that block an open permit?', 'Answer N/A if not PNP.', 'yes_no_na', NULL::jsonb, NULL::jsonb, '{"warn_if":{"equals":true},"senior_review_if":{"equals":true}}'::jsonb, NULL, false, 70),
  ('b2000001-0001-4000-8000-000000000017'::uuid, 'inadmissibility', 'compliance', 'Any inadmissibility, misrepresentation, or unresolved removal issues?', NULL, 'yes_no', NULL::jsonb, NULL::jsonb, '{"senior_review_if":{"equals":true},"block_if":{"equals":true},"outcome_if_fail":"senior_review"}'::jsonb, NULL, false, 80),
  ('b2000001-0001-4000-8000-000000000017'::uuid, 'correct_category', 'submission', 'Will the correct work permit category and fees be selected in the IRCC portal?', 'Counselor confirmation before lodging.', 'yes_no', NULL::jsonb, NULL::jsonb, '{"warn_if":{"equals":false}}'::jsonb, NULL, false, 90)
) AS v(library_id, code, section, label, help_text, q_type, options, conditional_on, rule, prefill_field, allows_pending_note, sort_order)
WHERE NOT EXISTS (
  SELECT 1 FROM public.service_eligibility_questions q
  WHERE q.library_id = v.library_id AND q.code = v.code
);
