-- Archive duplicates: keep earliest receipt per payment, archive the rest
WITH ranked AS (
  SELECT id, payment_id,
         ROW_NUMBER() OVER (PARTITION BY payment_id ORDER BY created_at ASC, id ASC) AS rn
  FROM public.client_invoice_receipts
  WHERE archived_at IS NULL AND payment_id IS NOT NULL
)
UPDATE public.client_invoice_receipts r
SET archived_at = now()
FROM ranked
WHERE r.id = ranked.id AND ranked.rn > 1;

CREATE UNIQUE INDEX IF NOT EXISTS uq_cir_payment_active
ON public.client_invoice_receipts (payment_id)
WHERE archived_at IS NULL AND payment_id IS NOT NULL;