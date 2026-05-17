CREATE TABLE IF NOT EXISTS public.accounting_coa (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT NOT NULL,
  name TEXT NOT NULL,
  group_code TEXT NOT NULL,
  type_code TEXT,
  sub_type_code TEXT,
  parent_id UUID REFERENCES public.accounting_coa(id),
  entity_id TEXT,
  branch TEXT,
  country TEXT,
  currency TEXT DEFAULT 'CAD',
  normal_balance TEXT DEFAULT 'DEBIT',
  opening_balance NUMERIC(15,2) DEFAULT 0,
  current_balance NUMERIC(15,2) DEFAULT 0,
  tax_code TEXT,
  is_active BOOLEAN DEFAULT TRUE,
  reconciliation_enabled BOOLEAN DEFAULT FALSE,
  requires_approval BOOLEAN DEFAULT FALSE,
  manual_entries_allowed BOOLEAN DEFAULT TRUE,
  automation_tags TEXT[] DEFAULT '{}',
  ai_category TEXT,
  reporting_group TEXT,
  description TEXT,
  notes TEXT,
  created_by UUID REFERENCES public.profiles(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(code, entity_id)
);

ALTER TABLE public.accounting_coa ENABLE ROW LEVEL SECURITY;

CREATE POLICY "accounting_users_all"
  ON public.accounting_coa FOR ALL
  USING (public.is_accounting_user(auth.uid()))
  WITH CHECK (public.is_accounting_user(auth.uid()));

CREATE INDEX IF NOT EXISTS idx_coa_code ON public.accounting_coa(code);
CREATE INDEX IF NOT EXISTS idx_coa_entity ON public.accounting_coa(entity_id);
CREATE INDEX IF NOT EXISTS idx_coa_group ON public.accounting_coa(group_code);

CREATE TRIGGER trg_accounting_coa_updated_at
  BEFORE UPDATE ON public.accounting_coa
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();