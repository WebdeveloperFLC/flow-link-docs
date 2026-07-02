ALTER TABLE public.upi_claim_cycles
  ADD COLUMN IF NOT EXISTS aggregator_scope boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS cycle_label text;

UPDATE public.upi_claim_cycles SET cycle_label = period_label
WHERE cycle_label IS NULL AND period_label IS NOT NULL;