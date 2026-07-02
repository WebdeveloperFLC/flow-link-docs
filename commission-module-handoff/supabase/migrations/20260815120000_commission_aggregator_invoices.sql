-- Phase 2B: Aggregator consolidated invoices + institution invoice links

ALTER TABLE public.upi_aggregators
  ADD COLUMN IF NOT EXISTS default_billing_profile_id uuid
    REFERENCES public.upi_billing_profiles(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS remittance_format text,
  ADD COLUMN IF NOT EXISTS metadata jsonb NOT NULL DEFAULT '{}';

CREATE TABLE IF NOT EXISTS public.upi_commission_aggregator_invoices (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  aggregator_invoice_number text NOT NULL UNIQUE,
  aggregator_id uuid NOT NULL REFERENCES public.upi_aggregators(id) ON DELETE RESTRICT,
  aggregator_reference_number text,
  commission_period_code text REFERENCES public.upi_commission_periods(code) ON DELETE SET NULL,
  claim_cycle_id uuid REFERENCES public.upi_claim_cycles(id) ON DELETE SET NULL,
  invoice_date date NOT NULL DEFAULT CURRENT_DATE,
  due_date date,
  currency text NOT NULL DEFAULT 'CAD',
  subtotal numeric(14,2) NOT NULL DEFAULT 0,
  total_amount numeric(14,2) NOT NULL DEFAULT 0,
  amount_invoiced numeric(14,2) NOT NULL DEFAULT 0,
  amount_received numeric(14,2) NOT NULL DEFAULT 0,
  amount_outstanding numeric(14,2) NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'draft'
    CHECK (status IN ('draft', 'submitted', 'approved', 'partially_paid', 'paid', 'disputed', 'cancelled')),
  billing_profile_id uuid REFERENCES public.upi_billing_profiles(id) ON DELETE SET NULL,
  notes text,
  metadata jsonb NOT NULL DEFAULT '{}',
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_ucai_agg ON public.upi_commission_aggregator_invoices (aggregator_id, invoice_date DESC);
CREATE INDEX IF NOT EXISTS idx_ucai_period ON public.upi_commission_aggregator_invoices (aggregator_id, commission_period_code);

DROP TRIGGER IF EXISTS trg_ucai_updated_at ON public.upi_commission_aggregator_invoices;
CREATE TRIGGER trg_ucai_updated_at
  BEFORE UPDATE ON public.upi_commission_aggregator_invoices
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

CREATE TABLE IF NOT EXISTS public.upi_commission_aggregator_invoice_lines (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  aggregator_invoice_id uuid NOT NULL
    REFERENCES public.upi_commission_aggregator_invoices(id) ON DELETE CASCADE,
  institution_id uuid NOT NULL REFERENCES public.upi_institutions(id) ON DELETE RESTRICT,
  institution_invoice_id uuid NOT NULL REFERENCES public.upi_commission_invoices(id) ON DELETE RESTRICT,
  line_amount numeric(14,2) NOT NULL CHECK (line_amount > 0),
  amount_received numeric(14,2) NOT NULL DEFAULT 0,
  amount_outstanding numeric(14,2) NOT NULL DEFAULT 0,
  sort_order int NOT NULL DEFAULT 0,
  UNIQUE (aggregator_invoice_id, institution_invoice_id)
);

CREATE INDEX IF NOT EXISTS idx_ucail_inst ON public.upi_commission_aggregator_invoice_lines (institution_id);
CREATE INDEX IF NOT EXISTS idx_ucail_inst_inv ON public.upi_commission_aggregator_invoice_lines (institution_invoice_id);

ALTER TABLE public.upi_commission_invoices
  ADD COLUMN IF NOT EXISTS aggregator_id uuid REFERENCES public.upi_aggregators(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS aggregator_invoice_id uuid
    REFERENCES public.upi_commission_aggregator_invoices(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_uci_aggregator ON public.upi_commission_invoices (aggregator_id);
CREATE INDEX IF NOT EXISTS idx_uci_agg_inv ON public.upi_commission_invoices (aggregator_invoice_id);

ALTER TABLE public.upi_commission_aggregator_invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.upi_commission_aggregator_invoice_lines ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS ucai_confidential ON public.upi_commission_aggregator_invoices;
CREATE POLICY ucai_confidential ON public.upi_commission_aggregator_invoices
  FOR ALL TO authenticated
  USING (public.can_view_upi_confidential(auth.uid()))
  WITH CHECK (public.can_view_upi_confidential(auth.uid()));

DROP POLICY IF EXISTS ucail_confidential ON public.upi_commission_aggregator_invoice_lines;
CREATE POLICY ucail_confidential ON public.upi_commission_aggregator_invoice_lines
  FOR ALL TO authenticated
  USING (public.can_view_upi_confidential(auth.uid()))
  WITH CHECK (public.can_view_upi_confidential(auth.uid()));
