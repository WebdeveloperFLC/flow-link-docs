
-- Pipeline events for uploaded documents
CREATE TABLE IF NOT EXISTS public.upi_document_pipeline_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id uuid NOT NULL REFERENCES public.upi_uploaded_documents(id) ON DELETE CASCADE,
  state text NOT NULL CHECK (state IN ('uploaded','processing','extracted','needs_review','approved','rejected','failed')),
  edge_function text,
  message text,
  payload jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS upi_doc_pipeline_doc_idx ON public.upi_document_pipeline_events(document_id, created_at DESC);
ALTER TABLE public.upi_document_pipeline_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY "auth_all_pipeline_events" ON public.upi_document_pipeline_events FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Document extras
ALTER TABLE public.upi_uploaded_documents
  ADD COLUMN IF NOT EXISTS pipeline_status text DEFAULT 'uploaded',
  ADD COLUMN IF NOT EXISTS extracted_payload jsonb DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS linked_record_refs jsonb DEFAULT '[]'::jsonb;

-- Claim cycles
CREATE TABLE IF NOT EXISTS public.upi_claim_cycles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  institution_id uuid NOT NULL REFERENCES public.upi_institutions(id) ON DELETE CASCADE,
  period_label text NOT NULL,
  intake text,
  status text DEFAULT 'open' CHECK (status IN ('open','submitted','partially_paid','closed','disputed')),
  claim_due_date date,
  invoice_due_date date,
  total_expected numeric(14,2) DEFAULT 0,
  total_received numeric(14,2) DEFAULT 0,
  currency text DEFAULT 'CAD',
  notes text,
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.upi_claim_cycles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "auth_all_claim_cycles" ON public.upi_claim_cycles FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Invoices
CREATE TABLE IF NOT EXISTS public.upi_invoices (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  institution_id uuid NOT NULL REFERENCES public.upi_institutions(id) ON DELETE CASCADE,
  claim_cycle_id uuid REFERENCES public.upi_claim_cycles(id) ON DELETE SET NULL,
  invoice_no text,
  amount numeric(14,2) DEFAULT 0,
  currency text DEFAULT 'CAD',
  status text DEFAULT 'draft' CHECK (status IN ('draft','sent','paid','partially_paid','overdue','disputed','void')),
  sent_at timestamptz,
  paid_at timestamptz,
  file_path text,
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.upi_invoices ENABLE ROW LEVEL SECURITY;
CREATE POLICY "auth_all_invoices" ON public.upi_invoices FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Renewal alerts
CREATE TABLE IF NOT EXISTS public.upi_renewal_alerts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  agreement_id uuid NOT NULL REFERENCES public.upi_agreements(id) ON DELETE CASCADE,
  threshold_days integer NOT NULL,
  fire_at date NOT NULL,
  status text DEFAULT 'pending' CHECK (status IN ('pending','fired','dismissed','snoozed')),
  risk_flags jsonb DEFAULT '[]'::jsonb,
  dismissed_by uuid,
  dismissed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (agreement_id, threshold_days)
);
ALTER TABLE public.upi_renewal_alerts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "auth_all_renewal_alerts" ON public.upi_renewal_alerts FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE TRIGGER upi_claim_cycles_updated_at BEFORE UPDATE ON public.upi_claim_cycles
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();
CREATE TRIGGER upi_invoices_updated_at BEFORE UPDATE ON public.upi_invoices
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();
