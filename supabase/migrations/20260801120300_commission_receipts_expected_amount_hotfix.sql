-- Hotfix: ensure Phase 1 expected-amount columns exist before receipt backfill (retry after 42703)

ALTER TABLE public.upi_commission_students
  ADD COLUMN IF NOT EXISTS expected_amount numeric(14,2),
  ADD COLUMN IF NOT EXISTS amended_expected_amount numeric(14,2);

ALTER TABLE public.upi_commission_invoices
  ADD COLUMN IF NOT EXISTS invoice_currency text DEFAULT 'CAD';

UPDATE public.upi_commission_students
SET amount_outstanding = GREATEST(
  COALESCE(amended_expected_amount, expected_amount, commission_amount, 0) - COALESCE(amount_received, 0),
  0
)
WHERE amount_outstanding IS NULL;
