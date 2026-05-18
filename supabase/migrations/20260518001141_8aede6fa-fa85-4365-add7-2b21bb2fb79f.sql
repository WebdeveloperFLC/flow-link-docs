
CREATE TABLE IF NOT EXISTS public.accounting_intercompany (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  txn_number TEXT UNIQUE NOT NULL,
  txn_date DATE NOT NULL,
  from_entity TEXT NOT NULL,
  to_entity TEXT NOT NULL,
  transaction_type TEXT,
  description TEXT NOT NULL,
  currency TEXT NOT NULL,
  fx_rate NUMERIC(10,6) DEFAULT 1,
  amount NUMERIC(15,2) NOT NULL,
  tax_type TEXT,
  tax_rate NUMERIC(8,4),
  tax_amount NUMERIC(15,2) DEFAULT 0,
  net_amount NUMERIC(15,2) NOT NULL,
  from_debit_account TEXT,
  from_credit_account TEXT,
  to_debit_account TEXT,
  to_credit_account TEXT,
  from_journal_id UUID REFERENCES public.accounting_journals(id),
  to_journal_id UUID REFERENCES public.accounting_journals(id),
  status TEXT DEFAULT 'DRAFT',
  reference TEXT,
  notes TEXT,
  attachments JSONB DEFAULT '[]'::jsonb,
  posted_at TIMESTAMPTZ,
  created_by UUID REFERENCES public.profiles(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE public.accounting_intercompany ENABLE ROW LEVEL SECURITY;
CREATE POLICY "accounting_users_all_intercompany" ON public.accounting_intercompany
  FOR ALL USING (public.is_accounting_user(auth.uid())) WITH CHECK (public.is_accounting_user(auth.uid()));
CREATE INDEX IF NOT EXISTS idx_intercompany_date ON public.accounting_intercompany(txn_date);
CREATE INDEX IF NOT EXISTS idx_intercompany_entities ON public.accounting_intercompany(from_entity, to_entity);
CREATE TRIGGER touch_intercompany_updated_at BEFORE UPDATE ON public.accounting_intercompany
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

CREATE TABLE IF NOT EXISTS public.accounting_reimbursements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  claim_number TEXT UNIQUE NOT NULL,
  claim_date DATE NOT NULL,
  claimed_by TEXT NOT NULL,
  entity TEXT NOT NULL,
  branch TEXT,
  personal_card_account TEXT,
  company_bank_account TEXT,
  lines JSONB DEFAULT '[]'::jsonb,
  total_amount NUMERIC(15,2) DEFAULT 0,
  business_amount NUMERIC(15,2) DEFAULT 0,
  personal_amount NUMERIC(15,2) DEFAULT 0,
  reimbursable_amount NUMERIC(15,2) DEFAULT 0,
  status TEXT DEFAULT 'DRAFT',
  submitted_at TIMESTAMPTZ,
  reviewed_by TEXT,
  reviewed_at TIMESTAMPTZ,
  approved_by TEXT,
  approved_at TIMESTAMPTZ,
  rejection_reason TEXT,
  paid_at TIMESTAMPTZ,
  payment_mode TEXT,
  payment_reference TEXT,
  paid_by_account TEXT,
  expense_journal_id UUID REFERENCES public.accounting_journals(id),
  payment_journal_id UUID REFERENCES public.accounting_journals(id),
  notes TEXT,
  created_by UUID REFERENCES public.profiles(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE public.accounting_reimbursements ENABLE ROW LEVEL SECURITY;
CREATE POLICY "accounting_users_all_reimbursements" ON public.accounting_reimbursements
  FOR ALL USING (public.is_accounting_user(auth.uid())) WITH CHECK (public.is_accounting_user(auth.uid()));
CREATE INDEX IF NOT EXISTS idx_reimbursements_status ON public.accounting_reimbursements(status);
CREATE INDEX IF NOT EXISTS idx_reimbursements_claimedby ON public.accounting_reimbursements(claimed_by);
CREATE TRIGGER touch_reimbursements_updated_at BEFORE UPDATE ON public.accounting_reimbursements
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

CREATE TABLE IF NOT EXISTS public.accounting_card_reconciliation (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  reconciliation_number TEXT UNIQUE NOT NULL,
  statement_month TEXT NOT NULL,
  statement_from DATE,
  statement_to DATE,
  card_account_id TEXT,
  card_account_name TEXT,
  card_holder_name TEXT,
  card_type TEXT DEFAULT 'BUSINESS',
  entity TEXT,
  currency TEXT DEFAULT 'CAD',
  opening_balance NUMERIC(15,2) DEFAULT 0,
  closing_balance NUMERIC(15,2) DEFAULT 0,
  total_transactions INT DEFAULT 0,
  total_business NUMERIC(15,2) DEFAULT 0,
  total_personal NUMERIC(15,2) DEFAULT 0,
  total_income NUMERIC(15,2) DEFAULT 0,
  total_client_funds NUMERIC(15,2) DEFAULT 0,
  total_uncategorised NUMERIC(15,2) DEFAULT 0,
  lines JSONB DEFAULT '[]'::jsonb,
  generated_journal_id UUID REFERENCES public.accounting_journals(id),
  status TEXT DEFAULT 'DRAFT',
  imported_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ,
  notes TEXT,
  created_by UUID REFERENCES public.profiles(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE public.accounting_card_reconciliation ENABLE ROW LEVEL SECURITY;
CREATE POLICY "accounting_users_all_cardrecon" ON public.accounting_card_reconciliation
  FOR ALL USING (public.is_accounting_user(auth.uid())) WITH CHECK (public.is_accounting_user(auth.uid()));
CREATE INDEX IF NOT EXISTS idx_card_recon_status ON public.accounting_card_reconciliation(status);
CREATE INDEX IF NOT EXISTS idx_card_recon_entity ON public.accounting_card_reconciliation(entity);
CREATE TRIGGER touch_cardrecon_updated_at BEFORE UPDATE ON public.accounting_card_reconciliation
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();
