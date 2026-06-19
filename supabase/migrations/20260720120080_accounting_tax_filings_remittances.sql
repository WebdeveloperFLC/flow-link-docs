-- =====================================================================
-- Phase 1 — Tax Filings & Remittances
-- A filing summarises output vs input tax for a period and entity.
-- A remittance posts the cash settlement of the net payable:
--   DR tax payable role(s)   CR bank
-- Attachment support per decision #7.
-- =====================================================================

CREATE TABLE IF NOT EXISTS public.accounting_tax_filings (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_id        TEXT NOT NULL,
  branch_id        TEXT NOT NULL,
  country          TEXT NOT NULL,
  tax_type         TEXT NOT NULL,
  tax_code         TEXT,
  period_label     TEXT NOT NULL,
  period_start     DATE NOT NULL,
  period_end       DATE NOT NULL,
  due_date         DATE,
  currency         TEXT NOT NULL DEFAULT 'CAD',
  output_tax       NUMERIC(15,2) NOT NULL DEFAULT 0,
  input_tax        NUMERIC(15,2) NOT NULL DEFAULT 0,
  net_payable      NUMERIC(15,2) NOT NULL DEFAULT 0,
  status           TEXT NOT NULL DEFAULT 'OPEN' CHECK (status IN ('OPEN','FILED','REMITTED')),
  filed_date       DATE,
  filed_by         UUID REFERENCES public.profiles(id),
  reference_number TEXT,
  attachment_path  TEXT,
  notes            TEXT,
  created_by       UUID REFERENCES public.profiles(id),
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.accounting_tax_remittances (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  filing_id       UUID REFERENCES public.accounting_tax_filings(id) ON DELETE SET NULL,
  entity_id       TEXT NOT NULL,
  branch_id       TEXT NOT NULL,
  amount          NUMERIC(15,2) NOT NULL CHECK (amount > 0),
  currency        TEXT NOT NULL DEFAULT 'CAD',
  payment_method  TEXT,
  reference       TEXT,
  bank_role_key   TEXT NOT NULL DEFAULT 'BANK_OPERATING',
  posting_date    DATE NOT NULL DEFAULT CURRENT_DATE,
  attachment_path TEXT,
  status          TEXT NOT NULL DEFAULT 'DRAFT' CHECK (status IN ('DRAFT','POSTED','VOIDED')),
  journal_id      UUID REFERENCES public.accounting_journals(id),
  created_by      UUID REFERENCES public.profiles(id),
  posted_by       UUID REFERENCES public.profiles(id),
  posted_at       TIMESTAMPTZ,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_tax_filings_entity ON public.accounting_tax_filings(entity_id);
CREATE INDEX IF NOT EXISTS idx_tax_filings_status ON public.accounting_tax_filings(status);
CREATE INDEX IF NOT EXISTS idx_tax_remit_filing   ON public.accounting_tax_remittances(filing_id);

ALTER TABLE public.accounting_tax_filings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.accounting_tax_remittances ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "accounting_users_all" ON public.accounting_tax_filings;
CREATE POLICY "accounting_users_all" ON public.accounting_tax_filings FOR ALL
  USING (public.is_accounting_user(auth.uid()))
  WITH CHECK (public.is_accounting_user(auth.uid()));

DROP POLICY IF EXISTS "accounting_users_all" ON public.accounting_tax_remittances;
CREATE POLICY "accounting_users_all" ON public.accounting_tax_remittances FOR ALL
  USING (public.is_accounting_user(auth.uid()))
  WITH CHECK (public.is_accounting_user(auth.uid()));

CREATE TRIGGER trg_tax_filings_updated_at
  BEFORE UPDATE ON public.accounting_tax_filings
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();
CREATE TRIGGER trg_tax_remit_updated_at
  BEFORE UPDATE ON public.accounting_tax_remittances
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();
