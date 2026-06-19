-- =====================================================================
-- Phase 1 — Composite Invoice Line Classification
-- CRM client_invoices remain the sole source of truth for student money.
-- This bridge classifies each invoice line as REVENUE (FL earns) vs
-- TRUST (pass-through held for the student) vs TAX, so the journal engine
-- can split a single CRM invoice into revenue + liability + tax legs.
-- =====================================================================

CREATE TABLE IF NOT EXISTS public.accounting_crm_invoice_bridge (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_id          UUID NOT NULL REFERENCES public.client_invoices(id) ON DELETE CASCADE,
  client_id           UUID,
  entity_id           TEXT NOT NULL,
  branch_id           TEXT NOT NULL,
  currency            TEXT NOT NULL DEFAULT 'CAD',
  classification_status TEXT NOT NULL DEFAULT 'PENDING'
                        CHECK (classification_status IN ('PENDING','CLASSIFIED','POSTED')),
  total_revenue       NUMERIC(15,2) NOT NULL DEFAULT 0,
  total_trust         NUMERIC(15,2) NOT NULL DEFAULT 0,
  total_tax           NUMERIC(15,2) NOT NULL DEFAULT 0,
  journal_id          UUID REFERENCES public.accounting_journals(id),
  posted_at           TIMESTAMPTZ,
  -- Reserved nullable references for future commission integration.
  student_id          UUID,
  application_id      UUID,
  institution_id      UUID,
  aggregator_id       UUID,
  created_by          UUID REFERENCES public.profiles(id),
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (invoice_id)
);

CREATE TABLE IF NOT EXISTS public.accounting_invoice_line_classifications (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  bridge_id       UUID NOT NULL REFERENCES public.accounting_crm_invoice_bridge(id) ON DELETE CASCADE,
  line_index      INT  NOT NULL,
  line_label      TEXT,
  classification  TEXT NOT NULL DEFAULT 'REVENUE'
                    CHECK (classification IN ('REVENUE','TRUST','DEPOSIT')),
  role_key        TEXT NOT NULL,           -- revenue role or trust bucket role
  gross_amount    NUMERIC(15,2) NOT NULL DEFAULT 0,
  net_amount      NUMERIC(15,2) NOT NULL DEFAULT 0,
  tax_amount      NUMERIC(15,2) NOT NULL DEFAULT 0,
  tax_code        TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (bridge_id, line_index)
);

CREATE INDEX IF NOT EXISTS idx_crm_bridge_invoice ON public.accounting_crm_invoice_bridge(invoice_id);
CREATE INDEX IF NOT EXISTS idx_crm_bridge_entity  ON public.accounting_crm_invoice_bridge(entity_id);
CREATE INDEX IF NOT EXISTS idx_line_class_bridge  ON public.accounting_invoice_line_classifications(bridge_id);

ALTER TABLE public.accounting_crm_invoice_bridge ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.accounting_invoice_line_classifications ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "accounting_users_all" ON public.accounting_crm_invoice_bridge;
CREATE POLICY "accounting_users_all" ON public.accounting_crm_invoice_bridge FOR ALL
  USING (public.is_accounting_user(auth.uid()))
  WITH CHECK (public.is_accounting_user(auth.uid()));

DROP POLICY IF EXISTS "accounting_users_all" ON public.accounting_invoice_line_classifications;
CREATE POLICY "accounting_users_all" ON public.accounting_invoice_line_classifications FOR ALL
  USING (public.is_accounting_user(auth.uid()))
  WITH CHECK (public.is_accounting_user(auth.uid()));

CREATE TRIGGER trg_crm_invoice_bridge_updated_at
  BEFORE UPDATE ON public.accounting_crm_invoice_bridge
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();
