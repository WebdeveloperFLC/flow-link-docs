CREATE TABLE IF NOT EXISTS public.accounting_entities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  type TEXT NOT NULL,
  parent_id UUID REFERENCES public.accounting_entities(id),
  country TEXT,
  currency TEXT,
  fiscal_year_start TEXT,
  tax_ids JSONB DEFAULT '[]'::jsonb,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.accounting_masters (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  list_key TEXT NOT NULL,
  code TEXT NOT NULL,
  label TEXT NOT NULL,
  metadata JSONB DEFAULT '{}'::jsonb,
  is_system BOOLEAN DEFAULT FALSE,
  sort_order INT DEFAULT 0,
  created_by UUID REFERENCES public.profiles(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(list_key, code)
);

ALTER TABLE public.accounting_entities ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.accounting_masters ENABLE ROW LEVEL SECURITY;

CREATE POLICY "accounting_users_all" ON public.accounting_entities FOR ALL
  USING (public.is_accounting_user(auth.uid()))
  WITH CHECK (public.is_accounting_user(auth.uid()));

CREATE POLICY "accounting_users_all" ON public.accounting_masters FOR ALL
  USING (public.is_accounting_user(auth.uid()))
  WITH CHECK (public.is_accounting_user(auth.uid()));