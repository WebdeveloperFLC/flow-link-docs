CREATE TABLE IF NOT EXISTS public.accounting_bank_accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nickname TEXT NOT NULL,
  bank_name TEXT,
  account_holder TEXT,
  account_number TEXT,
  transit_number TEXT,
  institution_number TEXT,
  ifsc_code TEXT,
  swift_bic TEXT,
  iban TEXT,
  entity TEXT NOT NULL,
  branch TEXT,
  country TEXT NOT NULL,
  currency TEXT NOT NULL,
  linked_coa_id UUID REFERENCES public.accounting_coa(id),
  linked_coa_code TEXT,
  opening_balance NUMERIC(15,2) DEFAULT 0,
  current_balance NUMERIC(15,2) DEFAULT 0,
  is_default_payment BOOLEAN DEFAULT FALSE,
  is_default_payroll BOOLEAN DEFAULT FALSE,
  reconciliation_enabled BOOLEAN DEFAULT TRUE,
  reconciliation_status TEXT DEFAULT 'PENDING',
  last_reconciled_date DATE,
  status TEXT DEFAULT 'ACTIVE',
  notes TEXT,
  created_by UUID REFERENCES public.profiles(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.accounting_bank_accounts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "accounting_users_all"
  ON public.accounting_bank_accounts FOR ALL
  USING (public.is_accounting_user(auth.uid()))
  WITH CHECK (public.is_accounting_user(auth.uid()));

CREATE TRIGGER trg_accounting_bank_accounts_updated_at
  BEFORE UPDATE ON public.accounting_bank_accounts
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();