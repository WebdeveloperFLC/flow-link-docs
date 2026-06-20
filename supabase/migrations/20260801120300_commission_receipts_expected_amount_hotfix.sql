-- Hotfix: prepare invoice/student receipt columns before backfill.
-- Safe when 20260801120000 rolled back (no amount_outstanding yet) or Phase 1 columns missing.

-- Phase 1 lifecycle columns (20260723120100 may not have run)
ALTER TABLE public.upi_commission_students
  ADD COLUMN IF NOT EXISTS expected_amount numeric(14,2),
  ADD COLUMN IF NOT EXISTS amended_expected_amount numeric(14,2);

-- Receipt ledger columns on students (no FK here — receipts table may not exist yet)
ALTER TABLE public.upi_commission_students
  ADD COLUMN IF NOT EXISTS amount_received numeric(14,2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS amount_outstanding numeric(14,2);

-- Invoice extensions (no last_receipt_id FK here — receipts table may not exist yet)
ALTER TABLE public.upi_commission_invoices
  ADD COLUMN IF NOT EXISTS amount_received numeric(14,2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS amount_outstanding numeric(14,2),
  ADD COLUMN IF NOT EXISTS short_paid boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS invoice_currency text DEFAULT 'CAD';

UPDATE public.upi_commission_invoices
SET amount_outstanding = GREATEST(total_amount - COALESCE(amount_received, 0), 0)
WHERE amount_outstanding IS NULL;

UPDATE public.upi_commission_students
SET amount_outstanding = GREATEST(
  COALESCE(amended_expected_amount, expected_amount, commission_amount, 0) - COALESCE(amount_received, 0),
  0
)
WHERE amount_outstanding IS NULL;

-- Add last_receipt_id FK only after receipts table exists (20000 creates it)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'upi_commission_receipts'
  ) THEN
    ALTER TABLE public.upi_commission_invoices
      ADD COLUMN IF NOT EXISTS last_receipt_id uuid
        REFERENCES public.upi_commission_receipts(id) ON DELETE SET NULL;
    ALTER TABLE public.upi_commission_students
      ADD COLUMN IF NOT EXISTS last_receipt_id uuid
        REFERENCES public.upi_commission_receipts(id) ON DELETE SET NULL;
  END IF;
END $$;
