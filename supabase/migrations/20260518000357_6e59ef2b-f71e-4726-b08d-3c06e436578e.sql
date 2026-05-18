CREATE TABLE IF NOT EXISTS public.accounting_petty_cash (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  branch TEXT NOT NULL,
  voucher_number TEXT,
  txn_date DATE NOT NULL,
  txn_type TEXT NOT NULL,
  category TEXT,
  description TEXT NOT NULL,
  amount NUMERIC(15,2) NOT NULL,
  paid_to TEXT,
  approved_by TEXT,
  payment_mode TEXT,
  receipt_url TEXT,
  status TEXT DEFAULT 'PENDING',
  entity TEXT,
  currency TEXT DEFAULT 'INR',
  created_by UUID REFERENCES public.profiles(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.accounting_petty_cash ENABLE ROW LEVEL SECURITY;

CREATE POLICY "accounting_users_all_petty_cash"
  ON public.accounting_petty_cash
  FOR ALL
  USING (public.is_accounting_user(auth.uid()))
  WITH CHECK (public.is_accounting_user(auth.uid()));

CREATE INDEX IF NOT EXISTS idx_petty_cash_branch ON public.accounting_petty_cash(branch);
CREATE INDEX IF NOT EXISTS idx_petty_cash_date ON public.accounting_petty_cash(txn_date);

CREATE TRIGGER trg_accounting_petty_cash_updated_at
  BEFORE UPDATE ON public.accounting_petty_cash
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();