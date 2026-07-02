-- Counselor-safe commission status view (definer rights — status columns only, no amounts in view)
-- Ensures lifecycle columns exist (20100 may not have run yet if migrations applied out of order).

ALTER TABLE public.upi_commission_students
  ADD COLUMN IF NOT EXISTS eligibility_status text DEFAULT 'pending',
  ADD COLUMN IF NOT EXISTS claim_status text DEFAULT 'not_ready',
  ADD COLUMN IF NOT EXISTS payment_status text DEFAULT 'unpaid',
  ADD COLUMN IF NOT EXISTS hold_status text DEFAULT 'none',
  ADD COLUMN IF NOT EXISTS hold_reason text,
  ADD COLUMN IF NOT EXISTS eligibility_date date,
  ADD COLUMN IF NOT EXISTS expected_claim_date date,
  ADD COLUMN IF NOT EXISTS commission_period_code text DEFAULT 'enrollment';

DROP VIEW IF EXISTS public.v_client_commission_status;

CREATE VIEW public.v_client_commission_status
WITH (security_invoker = false)
AS
SELECT
  ucs.client_id,
  ucs.id AS student_commission_id,
  ucs.institution_id,
  i.name AS institution_name,
  ucs.program_name,
  ucs.intake_term,
  ucs.commission_period_code,
  ucs.eligibility_status,
  ucs.claim_status,
  ucs.payment_status,
  ucs.hold_status,
  ucs.hold_reason,
  ucs.eligibility_date,
  ucs.expected_claim_date,
  ucs.commission_status AS legacy_status
FROM public.upi_commission_students ucs
LEFT JOIN public.upi_institutions i ON i.id = ucs.institution_id
WHERE ucs.client_id IS NOT NULL;

GRANT SELECT ON public.v_client_commission_status TO authenticated;

COMMENT ON VIEW public.v_client_commission_status IS
  'Counselor-safe commission lifecycle status (no amounts). security_invoker=false for read through confidential RLS.';
