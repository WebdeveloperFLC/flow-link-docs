-- Phase 1: verification workflow + payment source
ALTER TABLE public.client_invoice_payments
  ADD COLUMN IF NOT EXISTS payment_status text,
  ADD COLUMN IF NOT EXISTS payment_source text,
  ADD COLUMN IF NOT EXISTS verification_notes text,
  ADD COLUMN IF NOT EXISTS verification_rejected_reason text;

-- Backfill existing rows so behaviour is unchanged
UPDATE public.client_invoice_payments
   SET payment_status = 'verified'
 WHERE payment_status IS NULL;

UPDATE public.client_invoice_payments
   SET payment_source = 'manual'
 WHERE payment_source IS NULL;

ALTER TABLE public.client_invoice_payments
  ALTER COLUMN payment_status SET DEFAULT 'verified';

-- Constrain values
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'cip_payment_status_check'
  ) THEN
    ALTER TABLE public.client_invoice_payments
      ADD CONSTRAINT cip_payment_status_check
      CHECK (payment_status IN ('awaiting_verification','verified','rejected','cancelled'));
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'cip_payment_source_check'
  ) THEN
    ALTER TABLE public.client_invoice_payments
      ADD CONSTRAINT cip_payment_source_check
      CHECK (payment_source IS NULL OR payment_source IN
        ('walk_in','portal','counselor_collection','whatsapp_link','manual','branch_counter','online_gateway'));
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_cip_invoice_status
  ON public.client_invoice_payments (invoice_id, payment_status)
  WHERE archived_at IS NULL;

-- Update the recompute trigger to only count verified payments
CREATE OR REPLACE FUNCTION public.fn_recompute_invoice_totals()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE v_inv_id uuid;
        v_total numeric;
        v_paid numeric;
        v_paid_inr numeric;
        v_paid_cad numeric;
        v_paid_usd numeric;
        v_curr text;
        v_status text;
        v_old_status text;
        v_fx_inr numeric;
        v_fx_cad numeric;
        v_fx_usd numeric;
BEGIN
  v_inv_id := COALESCE(NEW.invoice_id, OLD.invoice_id);
  SELECT amount, currency, status,
         COALESCE(fx_rate_to_inr,1), COALESCE(fx_rate_to_cad,1), COALESCE(fx_rate_to_usd,1)
    INTO v_total, v_curr, v_old_status, v_fx_inr, v_fx_cad, v_fx_usd
    FROM public.client_invoices WHERE id = v_inv_id;

  SELECT
    COALESCE(SUM(CASE WHEN is_refund THEN -amount ELSE amount END), 0),
    COALESCE(SUM(CASE WHEN is_refund THEN -COALESCE(amount_in_inr, amount * v_fx_inr) ELSE COALESCE(amount_in_inr, amount * v_fx_inr) END), 0),
    COALESCE(SUM(CASE WHEN is_refund THEN -COALESCE(amount_in_cad, amount * v_fx_cad) ELSE COALESCE(amount_in_cad, amount * v_fx_cad) END), 0),
    COALESCE(SUM(CASE WHEN is_refund THEN -COALESCE(amount_in_usd, amount * v_fx_usd) ELSE COALESCE(amount_in_usd, amount * v_fx_usd) END), 0)
    INTO v_paid, v_paid_inr, v_paid_cad, v_paid_usd
    FROM public.client_invoice_payments
   WHERE invoice_id = v_inv_id
     AND archived_at IS NULL
     AND COALESCE(payment_status, 'verified') = 'verified';

  v_status := v_old_status;
  IF v_old_status NOT IN ('cancelled','refunded') THEN
    IF v_paid <= 0 THEN
      v_status := CASE WHEN v_old_status IN ('draft') THEN 'draft' ELSE COALESCE(v_old_status,'pending_payment') END;
    ELSIF v_paid >= v_total THEN
      v_status := 'paid';
    ELSE
      v_status := 'partially_paid';
    END IF;
  END IF;

  UPDATE public.client_invoices
     SET amount_paid = v_paid,
         amount_paid_in_inr = v_paid_inr,
         amount_paid_in_cad = v_paid_cad,
         amount_paid_in_usd = v_paid_usd,
         balance_due_in_inr = GREATEST((COALESCE(subtotal_in_inr, v_total * v_fx_inr)) - v_paid_inr, 0),
         balance_due_in_cad = GREATEST((COALESCE(subtotal_in_cad, v_total * v_fx_cad)) - v_paid_cad, 0),
         balance_due_in_usd = GREATEST((COALESCE(subtotal_in_usd, v_total * v_fx_usd)) - v_paid_usd, 0),
         status = v_status,
         paid_at = CASE WHEN v_status = 'paid' AND paid_at IS NULL THEN now() ELSE paid_at END,
         invoice_locked_for_edit = CASE WHEN v_status = 'paid' AND immutable_after_paid THEN true ELSE invoice_locked_for_edit END
   WHERE id = v_inv_id;

  RETURN NULL;
END $function$;