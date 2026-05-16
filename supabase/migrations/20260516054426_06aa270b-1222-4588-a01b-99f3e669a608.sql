-- ============================================================
-- PLANNED — Client → Commission bridge scaffolding.
-- All additions are dormant and safe to ship.
-- ============================================================

-- 1. Nullable bridge columns on clients (no defaults, no triggers).
ALTER TABLE public.clients
  ADD COLUMN IF NOT EXISTS linked_institution_id uuid REFERENCES public.upi_institutions(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS linked_student_record_id uuid REFERENCES public.upi_commission_students(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS institution_student_id text,
  ADD COLUMN IF NOT EXISTS consent_form_submitted boolean,
  ADD COLUMN IF NOT EXISTS consent_form_date date,
  ADD COLUMN IF NOT EXISTS study_permit_number text,
  ADD COLUMN IF NOT EXISTS study_permit_approved_date date,
  ADD COLUMN IF NOT EXISTS study_permit_expiry date;

COMMENT ON COLUMN public.clients.linked_institution_id IS 'PLANNED bridge — institution this client''s commission record belongs to.';
COMMENT ON COLUMN public.clients.linked_student_record_id IS 'PLANNED bridge — direct link to upi_commission_students row.';

-- 2. Dormant trigger functions. NOT attached to any table.
--    Body wrapped in IF false so calls are guaranteed no-ops.

-- PLANNED: Enable after testing complete
CREATE OR REPLACE FUNCTION public.on_visa_approved()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF false THEN
    -- TODO(activation): match client → upi_commission_students by passport/email,
    -- set study_permit_approved_date = NEW.visa_approval_date,
    -- if enrolled set enrollment_status='enrolled', re-evaluate eligibility,
    -- INSERT INTO upi_ai_suggestions (...) with action='visa_approved'.
    RAISE NOTICE 'on_visa_approved disabled';
  END IF;
  RETURN NEW;
END;
$$;

-- PLANNED: Enable after testing complete
CREATE OR REPLACE FUNCTION public.on_tuition_paid()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF false THEN
    -- TODO(activation): update tuition_paid_amount/date, recompute commission_amount
    -- from institution commission rules, flip status to 'eligible' when all checks pass,
    -- emit AI suggestion.
    RAISE NOTICE 'on_tuition_paid disabled';
  END IF;
  RETURN NEW;
END;
$$;

-- PLANNED: Enable after testing complete
CREATE OR REPLACE FUNCTION public.on_application_submitted()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF false THEN
    -- TODO(activation): upsert upi_commission_students row with commission_status='pending',
    -- link client_id, emit "ensure consent form" AI suggestion.
    RAISE NOTICE 'on_application_submitted disabled';
  END IF;
  RETURN NEW;
END;
$$;

-- PLANNED: Enable after testing complete
CREATE OR REPLACE FUNCTION public.on_consent_form_submitted()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF false THEN
    -- TODO(activation): set consent_form_submitted=true, consent_form_date=current_date,
    -- clear any 'no_consent_form' block, re-run eligibility.
    RAISE NOTICE 'on_consent_form_submitted disabled';
  END IF;
  RETURN NEW;
END;
$$;

COMMENT ON FUNCTION public.on_visa_approved IS 'PLANNED — dormant. Enable after activation checklist in src/institutions/planned/INTEGRATION_PLAN.md.';
COMMENT ON FUNCTION public.on_tuition_paid IS 'PLANNED — dormant.';
COMMENT ON FUNCTION public.on_application_submitted IS 'PLANNED — dormant.';
COMMENT ON FUNCTION public.on_consent_form_submitted IS 'PLANNED — dormant.';