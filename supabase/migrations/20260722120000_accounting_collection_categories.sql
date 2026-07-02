-- =====================================================================
-- R1 — Collection Category Master (hierarchical, user-configurable)
-- =====================================================================

CREATE TABLE IF NOT EXISTS public.accounting_collection_categories (
  id                          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  parent_id                   UUID REFERENCES public.accounting_collection_categories(id) ON DELETE RESTRICT,
  code                        TEXT NOT NULL,
  name                        TEXT NOT NULL,
  description                 TEXT,
  path                        TEXT NOT NULL DEFAULT '',
  depth                       INT NOT NULL DEFAULT 0,
  is_posting_group            BOOLEAN NOT NULL DEFAULT FALSE,
  lifecycle_status            TEXT NOT NULL DEFAULT 'DRAFT'
                              CHECK (lifecycle_status IN ('DRAFT','ACTIVE','INACTIVE','ARCHIVED')),
  is_system                   BOOLEAN NOT NULL DEFAULT FALSE,
  display_order               INT NOT NULL DEFAULT 0,
  accounting_treatment        TEXT NOT NULL DEFAULT 'THIRD_PARTY'
                              CHECK (accounting_treatment IN (
                                'REVENUE','THIRD_PARTY','RECOVERABLE','REIMBURSEMENT','INSTITUTION_RELATED'
                              )),
  default_tax_code            TEXT DEFAULT 'EXEMPT',
  default_tax_mode            TEXT NOT NULL DEFAULT 'EXEMPT'
                              CHECK (default_tax_mode IN ('EXCLUSIVE','INCLUSIVE','EXEMPT')),
  requires_trust              BOOLEAN NOT NULL DEFAULT FALSE,
  requires_disbursement       BOOLEAN NOT NULL DEFAULT FALSE,
  default_collection_currency TEXT,
  default_payment_currency    TEXT,
  default_payee_type          TEXT,
  expected_payee_name         TEXT,
  default_vendor_id           UUID REFERENCES public.accounting_vendors(id) ON DELETE SET NULL,
  default_institution_id      UUID,
  default_aggregator_id       UUID,
  default_revenue_role_key    TEXT,
  default_trust_role_key      TEXT,
  default_recoverable_role_key TEXT,
  default_reimbursement_role_key TEXT,
  commission_eligible         BOOLEAN NOT NULL DEFAULT FALSE,
  entity_id                   TEXT,
  created_by                  UUID REFERENCES public.profiles(id),
  created_at                  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at                  TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (code, entity_id)
);

CREATE INDEX IF NOT EXISTS idx_coll_cat_parent ON public.accounting_collection_categories(parent_id);
CREATE INDEX IF NOT EXISTS idx_coll_cat_path ON public.accounting_collection_categories(path);
CREATE INDEX IF NOT EXISTS idx_coll_cat_lifecycle ON public.accounting_collection_categories(lifecycle_status);
CREATE INDEX IF NOT EXISTS idx_coll_cat_treatment ON public.accounting_collection_categories(accounting_treatment);

CREATE TABLE IF NOT EXISTS public.accounting_collection_category_coa (
  id                              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  category_id                     UUID NOT NULL REFERENCES public.accounting_collection_categories(id) ON DELETE CASCADE,
  entity_id                       TEXT,
  revenue_account_code            TEXT,
  liability_account_code          TEXT,
  recoverable_account_code        TEXT,
  reimbursement_payable_account_code TEXT,
  institution_clearing_account_code  TEXT,
  role_key                        TEXT NOT NULL,
  created_at                      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at                      TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (category_id, entity_id)
);

CREATE TABLE IF NOT EXISTS public.accounting_collection_category_vendors (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  category_id  UUID NOT NULL REFERENCES public.accounting_collection_categories(id) ON DELETE CASCADE,
  vendor_id    UUID NOT NULL REFERENCES public.accounting_vendors(id) ON DELETE CASCADE,
  is_default   BOOLEAN NOT NULL DEFAULT FALSE,
  country      TEXT,
  notes        TEXT,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (category_id, vendor_id)
);

CREATE TABLE IF NOT EXISTS public.accounting_category_audit_log (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  category_id  UUID NOT NULL REFERENCES public.accounting_collection_categories(id) ON DELETE CASCADE,
  action       TEXT NOT NULL,
  old_values   JSONB,
  new_values   JSONB,
  changed_by   UUID REFERENCES public.profiles(id),
  changed_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Extend line classification enum values
ALTER TABLE public.accounting_invoice_line_classifications
  DROP CONSTRAINT IF EXISTS accounting_invoice_line_classifications_classification_check;

ALTER TABLE public.accounting_invoice_line_classifications
  ADD CONSTRAINT accounting_invoice_line_classifications_classification_check
  CHECK (classification IN ('REVENUE','TRUST','DEPOSIT','INSTITUTION','RECOVERABLE','REIMBURSEMENT'));

ALTER TABLE public.accounting_invoice_line_classifications
  ADD COLUMN IF NOT EXISTS collection_category_id UUID REFERENCES public.accounting_collection_categories(id);

ALTER TABLE public.accounting_trust_accounts
  ADD COLUMN IF NOT EXISTS collection_category_id UUID REFERENCES public.accounting_collection_categories(id);

ALTER TABLE public.accounting_trust_entries
  ADD COLUMN IF NOT EXISTS collection_category_id UUID REFERENCES public.accounting_collection_categories(id);

ALTER TABLE public.accounting_trust_disbursements
  ADD COLUMN IF NOT EXISTS collection_category_id UUID REFERENCES public.accounting_collection_categories(id),
  ADD COLUMN IF NOT EXISTS vendor_id UUID REFERENCES public.accounting_vendors(id),
  ADD COLUMN IF NOT EXISTS collection_currency TEXT,
  ADD COLUMN IF NOT EXISTS payment_currency TEXT,
  ADD COLUMN IF NOT EXISTS fx_rate NUMERIC(15,6),
  ADD COLUMN IF NOT EXISTS disbursement_bank_account_id UUID,
  ADD COLUMN IF NOT EXISTS collection_bank_account_id UUID;

ALTER TABLE public.client_invoice_payment_allocations
  ADD COLUMN IF NOT EXISTS collection_category_id UUID REFERENCES public.accounting_collection_categories(id);

-- service_catalogue retired in 20260610190000; guard for greenfield replay.
DO $$
BEGIN
  IF to_regclass('public.service_catalogue') IS NOT NULL THEN
    ALTER TABLE public.service_catalogue
      ADD COLUMN IF NOT EXISTS collection_category_id
      UUID REFERENCES public.accounting_collection_categories(id);
  END IF;
END $$;

-- Reserved FX/bank columns on trust (R3/R5)
ALTER TABLE public.accounting_trust_accounts
  ADD COLUMN IF NOT EXISTS collection_currency TEXT,
  ADD COLUMN IF NOT EXISTS payment_currency TEXT;

ALTER TABLE public.accounting_trust_entries
  ADD COLUMN IF NOT EXISTS collection_currency TEXT,
  ADD COLUMN IF NOT EXISTS payment_currency TEXT,
  ADD COLUMN IF NOT EXISTS fx_rate NUMERIC(15,6);

ALTER TABLE public.client_invoice_payments
  ADD COLUMN IF NOT EXISTS collection_bank_account_id UUID,
  ADD COLUMN IF NOT EXISTS collection_category_id UUID REFERENCES public.accounting_collection_categories(id);

CREATE INDEX IF NOT EXISTS idx_trust_acct_category ON public.accounting_trust_accounts(collection_category_id);
CREATE INDEX IF NOT EXISTS idx_line_class_category ON public.accounting_invoice_line_classifications(collection_category_id);
CREATE INDEX IF NOT EXISTS idx_cipa_category ON public.client_invoice_payment_allocations(collection_category_id);

-- RLS
ALTER TABLE public.accounting_collection_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.accounting_collection_category_coa ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.accounting_collection_category_vendors ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.accounting_category_audit_log ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "accounting_users_read_categories" ON public.accounting_collection_categories;
CREATE POLICY "accounting_users_read_categories" ON public.accounting_collection_categories FOR SELECT
  USING (public.is_accounting_user(auth.uid()) OR auth.role() = 'authenticated');

DROP POLICY IF EXISTS "accounting_admins_write_categories" ON public.accounting_collection_categories;
CREATE POLICY "accounting_admins_write_categories" ON public.accounting_collection_categories FOR ALL
  USING (public.is_accounting_admin(auth.uid()) OR public.has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (public.is_accounting_admin(auth.uid()) OR public.has_role(auth.uid(), 'admin'::app_role));

DROP POLICY IF EXISTS "accounting_users_read_category_coa" ON public.accounting_collection_category_coa;
CREATE POLICY "accounting_users_read_category_coa" ON public.accounting_collection_category_coa FOR SELECT
  USING (public.is_accounting_user(auth.uid()));

DROP POLICY IF EXISTS "accounting_admins_write_category_coa" ON public.accounting_collection_category_coa;
CREATE POLICY "accounting_admins_write_category_coa" ON public.accounting_collection_category_coa FOR ALL
  USING (public.is_accounting_admin(auth.uid()) OR public.has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (public.is_accounting_admin(auth.uid()) OR public.has_role(auth.uid(), 'admin'::app_role));

DROP POLICY IF EXISTS "accounting_users_read_category_vendors" ON public.accounting_collection_category_vendors;
CREATE POLICY "accounting_users_read_category_vendors" ON public.accounting_collection_category_vendors FOR SELECT
  USING (public.is_accounting_user(auth.uid()) OR auth.role() = 'authenticated');

DROP POLICY IF EXISTS "accounting_admins_write_category_vendors" ON public.accounting_collection_category_vendors;
CREATE POLICY "accounting_admins_write_category_vendors" ON public.accounting_collection_category_vendors FOR ALL
  USING (public.is_accounting_admin(auth.uid()) OR public.has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (public.is_accounting_admin(auth.uid()) OR public.has_role(auth.uid(), 'admin'::app_role));

DROP POLICY IF EXISTS "accounting_admins_read_category_audit" ON public.accounting_category_audit_log;
CREATE POLICY "accounting_admins_read_category_audit" ON public.accounting_category_audit_log FOR SELECT
  USING (public.is_accounting_admin(auth.uid()) OR public.has_role(auth.uid(), 'admin'::app_role));

CREATE TRIGGER trg_collection_categories_updated_at
  BEFORE UPDATE ON public.accounting_collection_categories
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

CREATE TRIGGER trg_collection_category_coa_updated_at
  BEFORE UPDATE ON public.accounting_collection_category_coa
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- Block lifecycle change to INACTIVE/ARCHIVED when trust balance > 0
CREATE OR REPLACE FUNCTION public.fn_collection_category_lifecycle_guard()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public AS $$
DECLARE
  v_balance NUMERIC(15,2);
BEGIN
  IF NEW.lifecycle_status IN ('INACTIVE', 'ARCHIVED')
     AND OLD.lifecycle_status NOT IN ('INACTIVE', 'ARCHIVED') THEN
    SELECT COALESCE(SUM(ta.balance), 0) INTO v_balance
      FROM public.accounting_trust_accounts ta
     WHERE ta.collection_category_id = NEW.id;
    IF v_balance > 0.005 THEN
      RAISE EXCEPTION 'Cannot deactivate or archive category % — trust balance % remains.',
        NEW.code, v_balance;
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_collection_category_lifecycle_guard ON public.accounting_collection_categories;
CREATE TRIGGER trg_collection_category_lifecycle_guard
  BEFORE UPDATE OF lifecycle_status ON public.accounting_collection_categories
  FOR EACH ROW EXECUTE FUNCTION public.fn_collection_category_lifecycle_guard();
