CREATE TABLE IF NOT EXISTS public.accounting_journals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  journal_number TEXT UNIQUE NOT NULL,
  entry_date DATE NOT NULL,
  entity TEXT NOT NULL,
  currency TEXT DEFAULT 'CAD',
  fx_rate NUMERIC(10,6) DEFAULT 1,
  source_type TEXT DEFAULT 'MANUAL',
  reference TEXT,
  narration TEXT NOT NULL,
  status TEXT DEFAULT 'DRAFT',
  total_debit NUMERIC(15,2) DEFAULT 0,
  total_credit NUMERIC(15,2) DEFAULT 0,
  is_balanced BOOLEAN DEFAULT FALSE,
  posted_at TIMESTAMPTZ,
  posted_by UUID REFERENCES public.profiles(id),
  voided_at TIMESTAMPTZ,
  voided_by UUID REFERENCES public.profiles(id),
  void_reason TEXT,
  created_by UUID REFERENCES public.profiles(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.accounting_journal_lines (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  journal_id UUID NOT NULL REFERENCES public.accounting_journals(id) ON DELETE CASCADE,
  line_number INT NOT NULL,
  account_id UUID REFERENCES public.accounting_coa(id),
  account_code TEXT,
  account_name TEXT,
  branch TEXT,
  tax_code TEXT,
  description TEXT,
  debit NUMERIC(15,2) DEFAULT 0,
  credit NUMERIC(15,2) DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.accounting_journals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.accounting_journal_lines ENABLE ROW LEVEL SECURITY;

CREATE POLICY "accounting_users_all"
  ON public.accounting_journals FOR ALL
  USING (public.is_accounting_user(auth.uid()))
  WITH CHECK (public.is_accounting_user(auth.uid()));

CREATE POLICY "accounting_users_all"
  ON public.accounting_journal_lines FOR ALL
  USING (public.is_accounting_user(auth.uid()))
  WITH CHECK (public.is_accounting_user(auth.uid()));

CREATE INDEX IF NOT EXISTS idx_journals_date ON public.accounting_journals(entry_date);
CREATE INDEX IF NOT EXISTS idx_journals_entity ON public.accounting_journals(entity);
CREATE INDEX IF NOT EXISTS idx_journals_status ON public.accounting_journals(status);
CREATE INDEX IF NOT EXISTS idx_journal_lines_journal ON public.accounting_journal_lines(journal_id);
CREATE INDEX IF NOT EXISTS idx_journal_lines_account ON public.accounting_journal_lines(account_id);

CREATE OR REPLACE FUNCTION public.generate_journal_number()
RETURNS TRIGGER LANGUAGE plpgsql
SET search_path = public AS $$
DECLARE seq INT;
BEGIN
  SELECT COUNT(*) + 1 INTO seq
  FROM public.accounting_journals
  WHERE EXTRACT(YEAR FROM created_at) = EXTRACT(YEAR FROM NOW());
  NEW.journal_number := 'JE-' || TO_CHAR(NOW(), 'YYYY') || '-' || LPAD(seq::TEXT, 4, '0');
  RETURN NEW;
END;
$$;

CREATE TRIGGER set_journal_number
  BEFORE INSERT ON public.accounting_journals
  FOR EACH ROW
  WHEN (NEW.journal_number IS NULL OR NEW.journal_number = '')
  EXECUTE FUNCTION public.generate_journal_number();

CREATE TRIGGER trg_accounting_journals_updated_at
  BEFORE UPDATE ON public.accounting_journals
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();