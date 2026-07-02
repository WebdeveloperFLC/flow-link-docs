-- Phase 2A: Commission receipt posting + student allocation (schema)

CREATE TABLE IF NOT EXISTS public.upi_commission_remittance_batches (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  batch_reference text NOT NULL UNIQUE,
  payer_type text NOT NULL CHECK (payer_type IN ('institution', 'aggregator')),
  institution_id uuid REFERENCES public.upi_institutions(id) ON DELETE SET NULL,
  aggregator_id uuid REFERENCES public.upi_aggregators(id) ON DELETE SET NULL,
  total_amount numeric(14,2),
  currency text NOT NULL DEFAULT 'CAD',
  received_date date,
  status text NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'reconciled', 'disputed')),
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

DROP TRIGGER IF EXISTS trg_remittance_batches_updated_at ON public.upi_commission_remittance_batches;
CREATE TRIGGER trg_remittance_batches_updated_at
  BEFORE UPDATE ON public.upi_commission_remittance_batches
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

CREATE TABLE IF NOT EXISTS public.upi_commission_receipts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  receipt_number text NOT NULL UNIQUE,
  status text NOT NULL DEFAULT 'draft'
    CHECK (status IN ('draft', 'ready', 'posted', 'voided')),
  payer_type text NOT NULL CHECK (payer_type IN ('institution', 'aggregator')),
  payer_id uuid NOT NULL,
  payer_name_snapshot text NOT NULL,
  institution_id uuid REFERENCES public.upi_institutions(id) ON DELETE SET NULL,
  aggregator_id uuid REFERENCES public.upi_aggregators(id) ON DELETE SET NULL,
  context_institution_id uuid REFERENCES public.upi_institutions(id) ON DELETE SET NULL,
  remittance_batch_id uuid REFERENCES public.upi_commission_remittance_batches(id) ON DELETE SET NULL,
  remittance_reference text,
  bank_reference text,
  receipt_date date NOT NULL DEFAULT CURRENT_DATE,
  posting_date date,
  receipt_currency text NOT NULL DEFAULT 'CAD',
  receipt_amount numeric(14,2) NOT NULL CHECK (receipt_amount > 0),
  exchange_rate numeric(12,6) NOT NULL DEFAULT 1 CHECK (exchange_rate > 0),
  base_currency text NOT NULL DEFAULT 'CAD',
  base_amount numeric(14,2) GENERATED ALWAYS AS (round(receipt_amount * exchange_rate, 2)) STORED,
  amount_allocated numeric(14,2) NOT NULL DEFAULT 0 CHECK (amount_allocated >= 0),
  unallocated_amount numeric(14,2) NOT NULL DEFAULT 0 CHECK (unallocated_amount >= 0),
  fx_review_status text NOT NULL DEFAULT 'not_required'
    CHECK (fx_review_status IN ('not_required', 'pending', 'approved')),
  fx_reviewed_by uuid,
  fx_reviewed_at timestamptz,
  fx_review_notes text,
  payment_method text,
  notes text,
  metadata jsonb NOT NULL DEFAULT '{}',
  accounting_journal_id uuid,
  created_by uuid,
  ready_at timestamptz,
  ready_by uuid,
  posted_by uuid,
  posted_at timestamptz,
  voided_by uuid,
  voided_at timestamptz,
  void_reason text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CHECK (amount_allocated <= receipt_amount),
  CHECK (unallocated_amount = receipt_amount - amount_allocated)
);

CREATE INDEX IF NOT EXISTS idx_ucr_status ON public.upi_commission_receipts (status, receipt_date DESC);
CREATE INDEX IF NOT EXISTS idx_ucr_payer ON public.upi_commission_receipts (payer_type, payer_id);
CREATE INDEX IF NOT EXISTS idx_ucr_remittance ON public.upi_commission_receipts (remittance_reference);
CREATE INDEX IF NOT EXISTS idx_ucr_context_inst ON public.upi_commission_receipts (context_institution_id);

DROP TRIGGER IF EXISTS trg_ucr_updated_at ON public.upi_commission_receipts;
CREATE TRIGGER trg_ucr_updated_at
  BEFORE UPDATE ON public.upi_commission_receipts
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

CREATE OR REPLACE FUNCTION public.block_commission_receipt_edit()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF OLD.status IN ('posted', 'voided') THEN
    RAISE EXCEPTION 'Receipt is % — edit not allowed; void and recreate', OLD.status;
  END IF;
  IF OLD.status = 'ready' AND NEW.status = OLD.status THEN
    RAISE EXCEPTION 'Receipt is ready — reopen to draft before editing';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_block_receipt_edit ON public.upi_commission_receipts;
CREATE TRIGGER trg_block_receipt_edit
  BEFORE UPDATE ON public.upi_commission_receipts
  FOR EACH ROW EXECUTE FUNCTION public.block_commission_receipt_edit();

CREATE TABLE IF NOT EXISTS public.upi_commission_receipt_invoice_allocations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  receipt_id uuid NOT NULL REFERENCES public.upi_commission_receipts(id) ON DELETE CASCADE,
  invoice_id uuid NOT NULL REFERENCES public.upi_commission_invoices(id) ON DELETE RESTRICT,
  amount_allocated numeric(14,2) NOT NULL CHECK (amount_allocated > 0),
  currency text NOT NULL DEFAULT 'CAD',
  allocated_at timestamptz NOT NULL DEFAULT now(),
  allocated_by uuid,
  UNIQUE (receipt_id, invoice_id)
);

CREATE INDEX IF NOT EXISTS idx_ucria_invoice ON public.upi_commission_receipt_invoice_allocations (invoice_id);
CREATE INDEX IF NOT EXISTS idx_ucria_receipt ON public.upi_commission_receipt_invoice_allocations (receipt_id);

CREATE TABLE IF NOT EXISTS public.upi_commission_receipt_student_allocations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  receipt_id uuid NOT NULL REFERENCES public.upi_commission_receipts(id) ON DELETE CASCADE,
  invoice_allocation_id uuid NOT NULL
    REFERENCES public.upi_commission_receipt_invoice_allocations(id) ON DELETE CASCADE,
  student_commission_id uuid NOT NULL
    REFERENCES public.upi_commission_students(id) ON DELETE RESTRICT,
  invoice_line_item_id uuid REFERENCES public.upi_invoice_line_items(id) ON DELETE SET NULL,
  snapshot_id uuid REFERENCES public.upi_commission_snapshots(id) ON DELETE SET NULL,
  amount_allocated numeric(14,2) NOT NULL CHECK (amount_allocated > 0),
  currency text NOT NULL DEFAULT 'CAD',
  allocation_method text NOT NULL DEFAULT 'manual'
    CHECK (allocation_method IN ('manual', 'pro_rata', 'fifo', 'full_line')),
  allocated_at timestamptz NOT NULL DEFAULT now(),
  allocated_by uuid
);

CREATE INDEX IF NOT EXISTS idx_ucrsa_student ON public.upi_commission_receipt_student_allocations (student_commission_id);
CREATE INDEX IF NOT EXISTS idx_ucrsa_receipt ON public.upi_commission_receipt_student_allocations (receipt_id);

CREATE TABLE IF NOT EXISTS public.upi_commission_receipt_attachments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  receipt_id uuid NOT NULL REFERENCES public.upi_commission_receipts(id) ON DELETE CASCADE,
  attachment_type text NOT NULL
    CHECK (attachment_type IN ('payment_advice', 'remittance', 'wire_confirmation', 'supporting')),
  file_name text NOT NULL,
  storage_path text NOT NULL,
  mime_type text,
  file_size_bytes bigint,
  uploaded_by uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_ucra_receipt ON public.upi_commission_receipt_attachments (receipt_id);

ALTER TABLE public.upi_commission_invoices
  ADD COLUMN IF NOT EXISTS amount_received numeric(14,2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS amount_outstanding numeric(14,2),
  ADD COLUMN IF NOT EXISTS last_receipt_id uuid REFERENCES public.upi_commission_receipts(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS short_paid boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS invoice_currency text DEFAULT 'CAD';

UPDATE public.upi_commission_invoices
SET amount_outstanding = GREATEST(total_amount - COALESCE(amount_received, 0), 0)
WHERE amount_outstanding IS NULL;

ALTER TABLE public.upi_commission_students
  ADD COLUMN IF NOT EXISTS amount_received numeric(14,2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS amount_outstanding numeric(14,2),
  ADD COLUMN IF NOT EXISTS last_receipt_id uuid REFERENCES public.upi_commission_receipts(id) ON DELETE SET NULL;

ALTER TABLE public.upi_commission_students
  ADD COLUMN IF NOT EXISTS expected_amount numeric(14,2),
  ADD COLUMN IF NOT EXISTS amended_expected_amount numeric(14,2);

UPDATE public.upi_commission_students
SET amount_outstanding = GREATEST(
  COALESCE(amended_expected_amount, expected_amount, commission_amount, 0) - COALESCE(amount_received, 0),
  0
)
WHERE amount_outstanding IS NULL;

ALTER TABLE public.upi_invoice_line_items
  ADD COLUMN IF NOT EXISTS amount_received numeric(14,2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS line_outstanding numeric(14,2);

CREATE OR REPLACE FUNCTION public.fn_student_commission_expected(p_student_id uuid)
RETURNS numeric
LANGUAGE sql
STABLE
SET search_path = public
AS $$
  SELECT COALESCE(
    amended_expected_amount,
    expected_amount,
    commission_amount,
    0
  )
  FROM public.upi_commission_students
  WHERE id = p_student_id;
$$;

CREATE OR REPLACE FUNCTION public.fn_refresh_receipt_allocation_totals(p_receipt_id uuid)
RETURNS void
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  v_sum numeric;
  v_amount numeric;
BEGIN
  SELECT COALESCE(SUM(amount_allocated), 0) INTO v_sum
  FROM public.upi_commission_receipt_invoice_allocations
  WHERE receipt_id = p_receipt_id;

  SELECT receipt_amount INTO v_amount FROM public.upi_commission_receipts WHERE id = p_receipt_id;

  UPDATE public.upi_commission_receipts
  SET amount_allocated = v_sum,
      unallocated_amount = v_amount - v_sum
  WHERE id = p_receipt_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.fn_refresh_receipt_fx_review(p_receipt_id uuid)
RETURNS void
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  v_receipt_currency text;
  v_cross boolean;
BEGIN
  SELECT receipt_currency INTO v_receipt_currency
  FROM public.upi_commission_receipts WHERE id = p_receipt_id;

  SELECT EXISTS (
    SELECT 1
    FROM public.upi_commission_receipt_invoice_allocations ia
    JOIN public.upi_commission_invoices inv ON inv.id = ia.invoice_id
    WHERE ia.receipt_id = p_receipt_id
      AND COALESCE(inv.invoice_currency, inv.currency, 'CAD') <> v_receipt_currency
  ) INTO v_cross;

  UPDATE public.upi_commission_receipts
  SET fx_review_status = CASE
    WHEN v_cross THEN
      CASE WHEN fx_review_status = 'approved' THEN 'approved' ELSE 'pending' END
    ELSE 'not_required'
  END
  WHERE id = p_receipt_id;
END;
$$;

CREATE OR REPLACE VIEW public.v_commission_receipt_open_items AS
SELECT
  inv.id AS invoice_id,
  inv.institution_id,
  inv.invoice_number,
  inv.total_amount,
  inv.amount_received,
  COALESCE(inv.amount_outstanding, inv.total_amount - COALESCE(inv.amount_received, 0)) AS amount_outstanding,
  inv.status,
  inv.currency
FROM public.upi_commission_invoices inv
WHERE COALESCE(inv.amount_outstanding, inv.total_amount - COALESCE(inv.amount_received, 0)) > 0;

CREATE OR REPLACE VIEW public.v_commission_student_receipt_ledger AS
SELECT
  ucs.id AS student_commission_id,
  ucs.institution_id,
  ucs.student_name,
  public.fn_student_commission_expected(ucs.id) AS expected_amount,
  ucs.amount_received,
  COALESCE(
    ucs.amount_outstanding,
    public.fn_student_commission_expected(ucs.id) - COALESCE(ucs.amount_received, 0)
  ) AS amount_outstanding,
  ucs.payment_status,
  ucs.eligibility_status,
  ucs.claim_status
FROM public.upi_commission_students ucs;

CREATE OR REPLACE VIEW public.v_commission_receipts_in_progress AS
SELECT *
FROM public.upi_commission_receipts
WHERE status IN ('draft', 'ready');

ALTER TABLE public.upi_commission_remittance_batches ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.upi_commission_receipts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.upi_commission_receipt_invoice_allocations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.upi_commission_receipt_student_allocations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.upi_commission_receipt_attachments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS ucr_batches_confidential ON public.upi_commission_remittance_batches;
CREATE POLICY ucr_batches_confidential ON public.upi_commission_remittance_batches
  FOR ALL TO authenticated
  USING (public.can_view_upi_confidential(auth.uid()))
  WITH CHECK (public.can_view_upi_confidential(auth.uid()));

DROP POLICY IF EXISTS ucr_receipts_confidential ON public.upi_commission_receipts;
CREATE POLICY ucr_receipts_confidential ON public.upi_commission_receipts
  FOR ALL TO authenticated
  USING (public.can_view_upi_confidential(auth.uid()))
  WITH CHECK (public.can_view_upi_confidential(auth.uid()));

DROP POLICY IF EXISTS ucr_invoice_alloc_confidential ON public.upi_commission_receipt_invoice_allocations;
CREATE POLICY ucr_invoice_alloc_confidential ON public.upi_commission_receipt_invoice_allocations
  FOR ALL TO authenticated
  USING (public.can_view_upi_confidential(auth.uid()))
  WITH CHECK (public.can_view_upi_confidential(auth.uid()));

DROP POLICY IF EXISTS ucr_student_alloc_confidential ON public.upi_commission_receipt_student_allocations;
CREATE POLICY ucr_student_alloc_confidential ON public.upi_commission_receipt_student_allocations
  FOR ALL TO authenticated
  USING (public.can_view_upi_confidential(auth.uid()))
  WITH CHECK (public.can_view_upi_confidential(auth.uid()));

DROP POLICY IF EXISTS ucr_attachments_confidential ON public.upi_commission_receipt_attachments;
CREATE POLICY ucr_attachments_confidential ON public.upi_commission_receipt_attachments
  FOR ALL TO authenticated
  USING (public.can_view_upi_confidential(auth.uid()))
  WITH CHECK (public.can_view_upi_confidential(auth.uid()));

GRANT SELECT ON public.v_commission_receipt_open_items TO authenticated;
GRANT SELECT ON public.v_commission_student_receipt_ledger TO authenticated;
GRANT SELECT ON public.v_commission_receipts_in_progress TO authenticated;

DO $g$
DECLARE t text;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'upi_commission_remittance_batches','upi_commission_receipts',
    'upi_commission_receipt_invoice_allocations',
    'upi_commission_receipt_student_allocations',
    'upi_commission_receipt_attachments'
  ] LOOP
    EXECUTE format('GRANT SELECT, INSERT, UPDATE, DELETE ON public.%I TO authenticated', t);
    EXECUTE format('GRANT ALL ON public.%I TO service_role', t);
  END LOOP;
END $g$;