-- =====================================================================
-- Phase 1 — Tax Framework
-- Configurable, multi-country tax engine inputs:
--   accounting_tax_codes        : a sellable/payable tax code (HST 13%, ...)
--   accounting_tax_components   : how a code splits into legs + which COA
--                                 role receives each leg (output/input)
--   accounting_entity_tax_config: per-entity registration + default codes,
--                                 incl. configurable commission tax (dec #5)
-- =====================================================================

CREATE TABLE IF NOT EXISTS public.accounting_tax_codes (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code           TEXT NOT NULL,
  name           TEXT NOT NULL,
  country        TEXT NOT NULL,            -- CA | IN | US | AE
  tax_type       TEXT NOT NULL,            -- GST_HST | GST | TDS | VAT | ...
  total_rate     NUMERIC(7,4) NOT NULL DEFAULT 0,   -- percent, e.g. 13.0000
  is_recoverable BOOLEAN NOT NULL DEFAULT TRUE,
  is_withholding BOOLEAN NOT NULL DEFAULT FALSE,     -- TDS / TCS
  entity_id      TEXT,                     -- NULL = global
  is_active      BOOLEAN NOT NULL DEFAULT TRUE,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (code, entity_id)
);

CREATE TABLE IF NOT EXISTS public.accounting_tax_components (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tax_code_id     UUID NOT NULL REFERENCES public.accounting_tax_codes(id) ON DELETE CASCADE,
  component       TEXT NOT NULL,           -- HST | GST | CGST | SGST | IGST | PST | TDS
  rate            NUMERIC(7,4) NOT NULL DEFAULT 0,
  output_role_key TEXT,                    -- COA role credited on sale
  input_role_key  TEXT,                    -- COA role debited on purchase
  leg_order       INT NOT NULL DEFAULT 0,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.accounting_entity_tax_config (
  id                       UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_id                TEXT NOT NULL,
  country                  TEXT NOT NULL,
  is_tax_registered        BOOLEAN NOT NULL DEFAULT TRUE,
  registration_number      TEXT,           -- GST/HST # or GSTIN
  default_output_tax_code  TEXT,
  default_input_tax_code   TEXT,
  -- Decision #5: India commission tax treatment is configurable, not hard-coded.
  commission_tax_code      TEXT,
  commission_tax_mode      TEXT DEFAULT 'EXCLUSIVE'
                             CHECK (commission_tax_mode IN ('EXCLUSIVE','INCLUSIVE','EXEMPT','RCM')),
  default_tds_code         TEXT,
  settings                 JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at               TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at               TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (entity_id)
);

CREATE INDEX IF NOT EXISTS idx_tax_codes_country ON public.accounting_tax_codes(country);
CREATE INDEX IF NOT EXISTS idx_tax_comp_code     ON public.accounting_tax_components(tax_code_id);

ALTER TABLE public.accounting_tax_codes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.accounting_tax_components ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.accounting_entity_tax_config ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "accounting_users_read" ON public.accounting_tax_codes;
CREATE POLICY "accounting_users_read" ON public.accounting_tax_codes FOR SELECT
  USING (public.is_accounting_user(auth.uid()));
DROP POLICY IF EXISTS "accounting_admins_write" ON public.accounting_tax_codes;
CREATE POLICY "accounting_admins_write" ON public.accounting_tax_codes FOR ALL
  USING (public.is_accounting_admin(auth.uid()))
  WITH CHECK (public.is_accounting_admin(auth.uid()));

DROP POLICY IF EXISTS "accounting_users_read" ON public.accounting_tax_components;
CREATE POLICY "accounting_users_read" ON public.accounting_tax_components FOR SELECT
  USING (public.is_accounting_user(auth.uid()));
DROP POLICY IF EXISTS "accounting_admins_write" ON public.accounting_tax_components;
CREATE POLICY "accounting_admins_write" ON public.accounting_tax_components FOR ALL
  USING (public.is_accounting_admin(auth.uid()))
  WITH CHECK (public.is_accounting_admin(auth.uid()));

DROP POLICY IF EXISTS "accounting_users_all" ON public.accounting_entity_tax_config;
CREATE POLICY "accounting_users_all" ON public.accounting_entity_tax_config FOR ALL
  USING (public.is_accounting_user(auth.uid()))
  WITH CHECK (public.is_accounting_user(auth.uid()));

CREATE TRIGGER trg_tax_codes_updated_at
  BEFORE UPDATE ON public.accounting_tax_codes
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();
CREATE TRIGGER trg_entity_tax_config_updated_at
  BEFORE UPDATE ON public.accounting_entity_tax_config
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- ── Seed global tax codes ────────────────────────────────────────────
INSERT INTO public.accounting_tax_codes (code, name, country, tax_type, total_rate, is_recoverable, is_withholding, entity_id)
SELECT v.code, v.name, v.country, v.tt, v.rate, v.rec, v.wh, NULL
FROM (VALUES
  ('HST_ON_13','HST Ontario 13%','CA','GST_HST',13.0,TRUE,FALSE),
  ('GST_CA_5','GST 5%','CA','GST_HST',5.0,TRUE,FALSE),
  ('ZERO_CA','Zero-rated','CA','GST_HST',0.0,TRUE,FALSE),
  ('EXEMPT_CA','Exempt','CA','GST_HST',0.0,FALSE,FALSE),
  ('GST_IN_18','GST 18% (intra-state)','IN','GST',18.0,TRUE,FALSE),
  ('IGST_IN_18','IGST 18% (inter-state)','IN','GST',18.0,TRUE,FALSE),
  ('GST_IN_5','GST 5% (intra-state)','IN','GST',5.0,TRUE,FALSE),
  ('EXEMPT_IN','Exempt','IN','GST',0.0,FALSE,FALSE),
  ('TDS_194J','TDS 194J Professional 10%','IN','TDS',10.0,FALSE,TRUE),
  ('TDS_194C','TDS 194C Contractor 2%','IN','TDS',2.0,FALSE,TRUE),
  ('TDS_192','TDS 192 Salary','IN','TDS',0.0,FALSE,TRUE)
) AS v(code, name, country, tt, rate, rec, wh)
WHERE NOT EXISTS (
  SELECT 1 FROM public.accounting_tax_codes c WHERE c.code = v.code AND c.entity_id IS NULL
);

-- ── Seed components (split codes into legs + COA roles) ───────────────
-- Canada: single HST/GST output & input.
INSERT INTO public.accounting_tax_components (tax_code_id, component, rate, output_role_key, input_role_key, leg_order)
SELECT c.id, 'HST', 13.0, 'TAX_OUTPUT_HST', 'TAX_INPUT_HST', 0
FROM public.accounting_tax_codes c
WHERE c.code='HST_ON_13' AND c.entity_id IS NULL
  AND NOT EXISTS (SELECT 1 FROM public.accounting_tax_components x WHERE x.tax_code_id=c.id);

INSERT INTO public.accounting_tax_components (tax_code_id, component, rate, output_role_key, input_role_key, leg_order)
SELECT c.id, 'GST', 5.0, 'TAX_OUTPUT_HST', 'TAX_INPUT_HST', 0
FROM public.accounting_tax_codes c
WHERE c.code='GST_CA_5' AND c.entity_id IS NULL
  AND NOT EXISTS (SELECT 1 FROM public.accounting_tax_components x WHERE x.tax_code_id=c.id);

-- India intra-state GST 18% = CGST 9 + SGST 9.
INSERT INTO public.accounting_tax_components (tax_code_id, component, rate, output_role_key, input_role_key, leg_order)
SELECT c.id, 'CGST', 9.0, 'TAX_OUTPUT_CGST', 'TAX_INPUT_GST', 0
FROM public.accounting_tax_codes c
WHERE c.code='GST_IN_18' AND c.entity_id IS NULL
  AND NOT EXISTS (SELECT 1 FROM public.accounting_tax_components x WHERE x.tax_code_id=c.id);
INSERT INTO public.accounting_tax_components (tax_code_id, component, rate, output_role_key, input_role_key, leg_order)
SELECT c.id, 'SGST', 9.0, 'TAX_OUTPUT_SGST', 'TAX_INPUT_GST', 1
FROM public.accounting_tax_codes c
WHERE c.code='GST_IN_18' AND c.entity_id IS NULL
  AND (SELECT COUNT(*) FROM public.accounting_tax_components x WHERE x.tax_code_id=c.id) < 2;

-- India intra-state GST 5% = CGST 2.5 + SGST 2.5.
INSERT INTO public.accounting_tax_components (tax_code_id, component, rate, output_role_key, input_role_key, leg_order)
SELECT c.id, 'CGST', 2.5, 'TAX_OUTPUT_CGST', 'TAX_INPUT_GST', 0
FROM public.accounting_tax_codes c
WHERE c.code='GST_IN_5' AND c.entity_id IS NULL
  AND NOT EXISTS (SELECT 1 FROM public.accounting_tax_components x WHERE x.tax_code_id=c.id);
INSERT INTO public.accounting_tax_components (tax_code_id, component, rate, output_role_key, input_role_key, leg_order)
SELECT c.id, 'SGST', 2.5, 'TAX_OUTPUT_SGST', 'TAX_INPUT_GST', 1
FROM public.accounting_tax_codes c
WHERE c.code='GST_IN_5' AND c.entity_id IS NULL
  AND (SELECT COUNT(*) FROM public.accounting_tax_components x WHERE x.tax_code_id=c.id) < 2;

-- India inter-state IGST 18%.
INSERT INTO public.accounting_tax_components (tax_code_id, component, rate, output_role_key, input_role_key, leg_order)
SELECT c.id, 'IGST', 18.0, 'TAX_OUTPUT_IGST', 'TAX_INPUT_GST', 0
FROM public.accounting_tax_codes c
WHERE c.code='IGST_IN_18' AND c.entity_id IS NULL
  AND NOT EXISTS (SELECT 1 FROM public.accounting_tax_components x WHERE x.tax_code_id=c.id);

-- TDS withholding components (credit the payable role).
INSERT INTO public.accounting_tax_components (tax_code_id, component, rate, output_role_key, input_role_key, leg_order)
SELECT c.id, 'TDS', c.total_rate, 'TDS_PAYABLE_VENDOR', NULL, 0
FROM public.accounting_tax_codes c
WHERE c.code IN ('TDS_194J','TDS_194C') AND c.entity_id IS NULL
  AND NOT EXISTS (SELECT 1 FROM public.accounting_tax_components x WHERE x.tax_code_id=c.id);
INSERT INTO public.accounting_tax_components (tax_code_id, component, rate, output_role_key, input_role_key, leg_order)
SELECT c.id, 'TDS', 0.0, 'TDS_PAYABLE_SALARY', NULL, 0
FROM public.accounting_tax_codes c
WHERE c.code='TDS_192' AND c.entity_id IS NULL
  AND NOT EXISTS (SELECT 1 FROM public.accounting_tax_components x WHERE x.tax_code_id=c.id);
