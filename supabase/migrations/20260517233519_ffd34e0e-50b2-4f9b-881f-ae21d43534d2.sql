CREATE TABLE IF NOT EXISTS public.accounting_clients (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  legal_name text,
  segment text,
  client_type text,
  country text,
  tax_id text,
  payment_terms text,
  currency text DEFAULT 'INR',
  status text DEFAULT 'ACTIVE',
  email text,
  phone text,
  address text,
  account_manager text,
  counselor_id text,
  counselor_name text,
  service_package text,
  visa_category text,
  intake text,
  lead_source text,
  notes text,
  linked_crm_client_id uuid,
  linked_coa_id uuid REFERENCES public.accounting_coa(id),
  created_by uuid REFERENCES public.profiles(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.accounting_clients ENABLE ROW LEVEL SECURITY;

CREATE POLICY "accounting_users_all" ON public.accounting_clients
  USING (public.is_accounting_user(auth.uid()))
  WITH CHECK (public.is_accounting_user(auth.uid()));

CREATE TRIGGER trg_accounting_clients_updated_at
  BEFORE UPDATE ON public.accounting_clients
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();