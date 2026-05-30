ALTER TABLE public.client_invoices
  ADD COLUMN IF NOT EXISTS applied_offer_id        uuid,
  ADD COLUMN IF NOT EXISTS offer_discount_amount   numeric NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS attributed_counselor_id uuid,
  ADD COLUMN IF NOT EXISTS tracking_code           text;

COMMENT ON COLUMN public.client_invoices.applied_offer_id IS
  'Phase 2: offer applied at draft creation. Record-keeping only — does not drive totals; amount is already reduced.';
COMMENT ON COLUMN public.client_invoices.offer_discount_amount IS
  'Phase 2: discount amount applied at creation, in the invoice currency. Record-keeping only.';
COMMENT ON COLUMN public.client_invoices.attributed_counselor_id IS
  'Phase 2: counselor credited for the offer-driven sale (revenue attribution).';
COMMENT ON COLUMN public.client_invoices.tracking_code IS
  'Phase 2: counselor tracking code that drove this redemption, if any.';

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
      FROM pg_constraint c
      JOIN pg_class t ON t.oid = c.conrelid
      JOIN pg_namespace n ON n.oid = t.relnamespace
     WHERE c.conname = 'client_invoices_applied_offer_fkey'
       AND t.relname = 'client_invoices'
       AND n.nspname = 'public'
  ) THEN
    ALTER TABLE public.client_invoices
      ADD CONSTRAINT client_invoices_applied_offer_fkey
      FOREIGN KEY (applied_offer_id) REFERENCES public.offers(id) ON DELETE SET NULL;
  END IF;
END $$;