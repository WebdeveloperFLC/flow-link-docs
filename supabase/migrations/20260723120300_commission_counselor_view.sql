-- Counselor-safe commission status view (definer rights — status columns only, no amounts in view)

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
