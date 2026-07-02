CREATE OR REPLACE VIEW public.v_commission_aggregator_student_rows AS
SELECT
  ucs.id AS student_commission_id,
  ucs.aggregator_id,
  ucs.institution_id,
  i.name AS institution_name,
  ucs.student_name,
  ucs.program_name,
  ucs.intake_term,
  ucs.intake_year,
  ucs.eligibility_status,
  ucs.claim_status,
  ucs.payment_status,
  ucs.hold_status,
  ucs.hold_reason,
  ucs.commission_status,
  ucs.commission_period_code,
  ucs.invoice_id,
  public.fn_student_commission_expected(ucs.id) AS expected_amount,
  COALESCE(ucs.amount_received, 0) AS amount_received,
  COALESCE(
    ucs.amount_outstanding,
    public.fn_student_commission_expected(ucs.id) - COALESCE(ucs.amount_received, 0)
  ) AS amount_outstanding,
  EXISTS (
    SELECT 1 FROM public.upi_commission_transfer_events te
    WHERE te.source_student_commission_id = ucs.id AND te.event_status = 'open'
  ) AS has_open_transfer,
  (
    ucs.hold_reason = 'transfer_under_review'
    OR EXISTS (
      SELECT 1 FROM public.upi_commission_transfer_events te
      WHERE te.source_student_commission_id = ucs.id AND te.event_status = 'open'
    )
  ) AS transfer_flag
FROM public.upi_commission_students ucs
LEFT JOIN public.upi_institutions i ON i.id = ucs.institution_id
WHERE ucs.aggregator_id IS NOT NULL;

CREATE OR REPLACE VIEW public.v_commission_institution_metrics_agg AS
SELECT
  ucs.aggregator_id,
  ucs.institution_id,
  i.name AS institution_name,
  ucs.commission_period_code,
  SUM(public.fn_student_commission_expected(ucs.id)) AS amount_expected,
  SUM(CASE WHEN ucs.invoice_id IS NOT NULL THEN public.fn_student_commission_expected(ucs.id) ELSE 0 END) AS amount_invoiced,
  SUM(COALESCE(ucs.amount_received, 0)) AS amount_received,
  SUM(GREATEST(
    public.fn_student_commission_expected(ucs.id) - COALESCE(ucs.amount_received, 0),
    0
  )) AS amount_outstanding,
  SUM(CASE WHEN ucs.hold_status = 'active' THEN public.fn_student_commission_expected(ucs.id) ELSE 0 END) AS amount_held
FROM public.upi_commission_students ucs
LEFT JOIN public.upi_institutions i ON i.id = ucs.institution_id
WHERE ucs.aggregator_id IS NOT NULL
GROUP BY ucs.aggregator_id, ucs.institution_id, i.name, ucs.commission_period_code;

CREATE OR REPLACE VIEW public.v_commission_aggregator_metrics AS
SELECT
  aggregator_id,
  commission_period_code,
  SUM(amount_expected) AS amount_expected,
  SUM(amount_invoiced) AS amount_invoiced,
  SUM(amount_received) AS amount_received,
  SUM(amount_outstanding) AS amount_outstanding,
  SUM(amount_held) AS amount_held
FROM public.v_commission_institution_metrics_agg
GROUP BY aggregator_id, commission_period_code;

CREATE OR REPLACE VIEW public.v_commission_batch_reconciliation AS
SELECT
  b.id AS batch_id,
  b.batch_reference,
  b.aggregator_reference_number,
  b.aggregator_id,
  b.commission_period_code,
  b.amount_expected,
  b.amount_received,
  COALESCE(b.amount_outstanding, GREATEST(COALESCE(b.amount_expected, 0) - b.amount_received, 0)) AS amount_outstanding,
  b.receipt_count,
  b.status,
  b.dispute_reason,
  b.dispute_opened_date,
  b.dispute_resolved_date,
  b.received_date,
  (SELECT COUNT(*) FROM public.upi_commission_remittance_batch_statements s WHERE s.batch_id = b.id) AS statement_count
FROM public.upi_commission_remittance_batches b
WHERE b.payer_type = 'aggregator';

GRANT SELECT ON public.v_commission_aggregator_student_rows TO authenticated;
GRANT SELECT ON public.v_commission_institution_metrics_agg TO authenticated;
GRANT SELECT ON public.v_commission_aggregator_metrics TO authenticated;
GRANT SELECT ON public.v_commission_batch_reconciliation TO authenticated;