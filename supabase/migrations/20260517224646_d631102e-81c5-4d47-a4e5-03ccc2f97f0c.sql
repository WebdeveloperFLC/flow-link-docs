CREATE TABLE IF NOT EXISTS public.accounting_vendors (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  company_name TEXT,
  category TEXT,
  email TEXT,
  phone TEXT,
  country TEXT,
  currency TEXT DEFAULT 'INR',
  payment_terms TEXT,
  tax_id TEXT,
  bank_name TEXT,
  bank_account TEXT,
  bank_ifsc TEXT,
  bank_swift TEXT,
  linked_coa_id UUID REFERENCES public.accounting_coa(id),
  status TEXT DEFAULT 'ACTIVE',
  notes TEXT,
  created_by UUID REFERENCES public.profiles(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.accounting_ap_bills (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  bill_number TEXT UNIQUE NOT NULL,
  vendor_id UUID REFERENCES public.accounting_vendors(id),
  vendor_name TEXT NOT NULL,
  bill_date DATE NOT NULL,
  due_date DATE,
  entity TEXT,
  currency TEXT DEFAULT 'INR',
  subtotal NUMERIC(15,2) DEFAULT 0,
  tax_amount NUMERIC(15,2) DEFAULT 0,
  total_amount NUMERIC(15,2) DEFAULT 0,
  paid_amount NUMERIC(15,2) DEFAULT 0,
  outstanding NUMERIC(15,2) DEFAULT 0,
  status TEXT DEFAULT 'DRAFT',
  payment_terms TEXT,
  payment_method TEXT,
  reference TEXT,
  notes TEXT,
  journal_id UUID REFERENCES public.accounting_journals(id),
  created_by UUID REFERENCES public.profiles(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.accounting_ar_invoices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_number TEXT UNIQUE NOT NULL,
  client_name TEXT NOT NULL,
  client_id UUID,
  invoice_date DATE NOT NULL,
  due_date DATE,
  entity TEXT,
  currency TEXT DEFAULT 'INR',
  subtotal NUMERIC(15,2) DEFAULT 0,
  tax_amount NUMERIC(15,2) DEFAULT 0,
  total_amount NUMERIC(15,2) DEFAULT 0,
  paid_amount NUMERIC(15,2) DEFAULT 0,
  outstanding_balance NUMERIC(15,2) DEFAULT 0,
  status TEXT DEFAULT 'DRAFT',
  service_type TEXT,
  payment_terms TEXT,
  payment_method TEXT,
  reference TEXT,
  notes TEXT,
  journal_id UUID REFERENCES public.accounting_journals(id),
  created_by UUID REFERENCES public.profiles(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.accounting_vendors ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.accounting_ap_bills ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.accounting_ar_invoices ENABLE ROW LEVEL SECURITY;

CREATE POLICY "accounting_users_all" ON public.accounting_vendors FOR ALL
  USING (public.is_accounting_user(auth.uid()))
  WITH CHECK (public.is_accounting_user(auth.uid()));

CREATE POLICY "accounting_users_all" ON public.accounting_ap_bills FOR ALL
  USING (public.is_accounting_user(auth.uid()))
  WITH CHECK (public.is_accounting_user(auth.uid()));

CREATE POLICY "accounting_users_all" ON public.accounting_ar_invoices FOR ALL
  USING (public.is_accounting_user(auth.uid()))
  WITH CHECK (public.is_accounting_user(auth.uid()));

CREATE INDEX IF NOT EXISTS idx_ap_bills_vendor ON public.accounting_ap_bills(vendor_id);
CREATE INDEX IF NOT EXISTS idx_ap_bills_status ON public.accounting_ap_bills(status);
CREATE INDEX IF NOT EXISTS idx_ar_invoices_client ON public.accounting_ar_invoices(client_id);
CREATE INDEX IF NOT EXISTS idx_ar_invoices_status ON public.accounting_ar_invoices(status);

CREATE TRIGGER trg_accounting_vendors_updated_at
  BEFORE UPDATE ON public.accounting_vendors
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();
CREATE TRIGGER trg_accounting_ap_bills_updated_at
  BEFORE UPDATE ON public.accounting_ap_bills
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();
CREATE TRIGGER trg_accounting_ar_invoices_updated_at
  BEFORE UPDATE ON public.accounting_ar_invoices
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();