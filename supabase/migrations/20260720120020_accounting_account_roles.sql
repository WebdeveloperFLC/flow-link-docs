-- =====================================================================
-- Phase 1 — Account Roles & Posting Rules
-- Decouples the journal engine from hard-coded COA codes.
--   accounting_account_roles : symbolic role -> COA account (per entity,
--     with entity_id NULL acting as the global fallback).
--   accounting_posting_rules : declarative debit/credit legs per
--     (source_module, event_key, country).
-- The TypeScript journal engine resolves roles -> accounts and builds
-- balanced journals; these tables are the single source of mapping truth.
-- =====================================================================

CREATE TABLE IF NOT EXISTS public.accounting_account_roles (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  role_key      TEXT NOT NULL,
  entity_id     TEXT,                 -- NULL = global fallback
  account_code  TEXT NOT NULL,
  description   TEXT,
  is_system     BOOLEAN NOT NULL DEFAULT TRUE,
  created_by    UUID REFERENCES public.profiles(id),
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (role_key, entity_id)
);

CREATE TABLE IF NOT EXISTS public.accounting_posting_rules (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  source_module TEXT NOT NULL,
  event_key     TEXT NOT NULL,
  country       TEXT,                 -- NULL = any country
  leg_order     INT  NOT NULL DEFAULT 0,
  role_key      TEXT NOT NULL,
  dr_cr         TEXT NOT NULL CHECK (dr_cr IN ('DR','CR')),
  amount_expr   TEXT NOT NULL,        -- engine token: e.g. 'NET','TAX_TOTAL','TOTAL','LINE'
  is_optional   BOOLEAN NOT NULL DEFAULT FALSE,
  notes         TEXT,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (source_module, event_key, country, leg_order, role_key)
);

CREATE INDEX IF NOT EXISTS idx_acct_roles_key   ON public.accounting_account_roles(role_key);
CREATE INDEX IF NOT EXISTS idx_posting_rules_evt ON public.accounting_posting_rules(source_module, event_key, country);

ALTER TABLE public.accounting_account_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.accounting_posting_rules ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "accounting_users_all" ON public.accounting_account_roles;
CREATE POLICY "accounting_users_all" ON public.accounting_account_roles FOR ALL
  USING (public.is_accounting_user(auth.uid()))
  WITH CHECK (public.is_accounting_user(auth.uid()));

DROP POLICY IF EXISTS "accounting_users_read" ON public.accounting_posting_rules;
CREATE POLICY "accounting_users_read" ON public.accounting_posting_rules FOR SELECT
  USING (public.is_accounting_user(auth.uid()));

DROP POLICY IF EXISTS "accounting_admins_write" ON public.accounting_posting_rules;
CREATE POLICY "accounting_admins_write" ON public.accounting_posting_rules FOR ALL
  USING (public.is_accounting_admin(auth.uid()))
  WITH CHECK (public.is_accounting_admin(auth.uid()));

CREATE TRIGGER trg_accounting_account_roles_updated_at
  BEFORE UPDATE ON public.accounting_account_roles
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- ── Global role -> account_code mappings (entity_id NULL fallback) ────
INSERT INTO public.accounting_account_roles (role_key, entity_id, account_code, description) VALUES
  -- AR / bank / clearing
  ('AR_STUDENT',            NULL, '1200', 'Accounts receivable — students'),
  ('AR_CORPORATE',          NULL, '1205', 'Accounts receivable — corporate/internal'),
  ('BANK_OPERATING',        NULL, '1010', 'Default operating bank'),
  ('BANK_TRUST',            NULL, '1201', 'Student trust bank'),
  ('STUDENT_FUNDS_CLEARING',NULL, '2480', 'Student funds clearing (unallocated)'),
  ('SUSPENSE',              NULL, '9001', 'Suspense — unclassified'),
  -- Trust liability buckets
  ('TRUST_TUITION',         NULL, '2401', 'Client funds — tuition held'),
  ('TRUST_EMBASSY',         NULL, '2402', 'Client funds — embassy/visa fees'),
  ('TRUST_APPLICATION',     NULL, '2403', 'Client funds — application fees'),
  ('TRUST_GIC',             NULL, '2404', 'Client funds — GIC held'),
  ('TRUST_OTHER',           NULL, '2405', 'Client funds — other'),
  ('TRUST_BIOMETRICS',      NULL, '2406', 'Client funds — biometrics'),
  ('TRUST_MEDICAL',         NULL, '2407', 'Client funds — medical/police'),
  ('DEPOSIT_REFUNDABLE',    NULL, '2481', 'Refundable deposits — service'),
  ('COLLEGE_PAYABLE',       NULL, '2420', 'College / institution payable'),
  -- Revenue
  ('REVENUE_SERVICE',       NULL, '4103', 'FL service / consulting revenue'),
  ('REVENUE_VISA',          NULL, '4101', 'Visa service revenue'),
  ('REVENUE_COACHING',      NULL, '4201', 'Coaching fees revenue'),
  -- Output tax (Canada)
  ('TAX_OUTPUT_HST',        NULL, '2310', 'GST/HST output payable'),
  ('TAX_INPUT_HST',         NULL, '1340', 'GST/HST input tax credit'),
  -- Output tax (India)
  ('TAX_OUTPUT_CGST',       NULL, '2360', 'CGST output payable'),
  ('TAX_OUTPUT_SGST',       NULL, '2361', 'SGST output payable'),
  ('TAX_OUTPUT_IGST',       NULL, '2362', 'IGST output payable'),
  ('TAX_INPUT_GST',         NULL, '1370', 'GST input tax credit (India)'),
  ('TDS_PAYABLE_VENDOR',    NULL, '2370', 'TDS payable — vendors'),
  ('TDS_PAYABLE_SALARY',    NULL, '2371', 'TDS payable — salary'),
  -- AP
  ('AP_TRADE',              NULL, '2000', 'Accounts payable — trade'),
  -- Payroll
  ('SALARY_EXPENSE',        NULL, '6100', 'Salaries & wages expense'),
  ('CPP_EXPENSE',           NULL, '6110', 'CPP employer expense'),
  ('EI_EXPENSE',            NULL, '6111', 'EI employer expense'),
  ('CPP_PAYABLE',           NULL, '2330', 'CPP payable'),
  ('EI_PAYABLE',            NULL, '2332', 'EI payable'),
  ('TAX_WITHHELD',          NULL, '2334', 'Income tax withheld (Canada)'),
  ('PF_EXPENSE',            NULL, '6120', 'PF employer expense'),
  ('ESIC_EXPENSE',          NULL, '6121', 'ESIC employer expense'),
  ('PF_PAYABLE',            NULL, '2350', 'PF payable'),
  ('ESIC_PAYABLE',          NULL, '2352', 'ESIC payable'),
  ('PT_PAYABLE',            NULL, '2354', 'Professional tax payable (India)'),
  ('NET_PAYROLL_PAYABLE',   NULL, '2340', 'Net payroll payable'),
  -- Equity / close
  ('RETAINED_EARNINGS',     NULL, '3900', 'Retained earnings')
ON CONFLICT (role_key, entity_id) DO NOTHING;
