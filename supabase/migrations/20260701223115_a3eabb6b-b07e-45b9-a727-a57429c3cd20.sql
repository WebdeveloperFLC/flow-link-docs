-- >>> FILE: 20260720120000_accounting_journal_contract.sql
ALTER TABLE public.accounting_journals
  ADD COLUMN IF NOT EXISTS entity_id             TEXT,
  ADD COLUMN IF NOT EXISTS branch_id             TEXT,
  ADD COLUMN IF NOT EXISTS source_module         TEXT NOT NULL DEFAULT 'MANUAL',
  ADD COLUMN IF NOT EXISTS source_record_id      UUID,
  ADD COLUMN IF NOT EXISTS posting_date          DATE,
  ADD COLUMN IF NOT EXISTS is_reversal           BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS reversal_of_journal_id UUID REFERENCES public.accounting_journals(id),
  ADD COLUMN IF NOT EXISTS reversed_by_journal_id UUID REFERENCES public.accounting_journals(id),
  ADD COLUMN IF NOT EXISTS attachment_path       TEXT,
  ADD COLUMN IF NOT EXISTS student_id            UUID,
  ADD COLUMN IF NOT EXISTS application_id        UUID,
  ADD COLUMN IF NOT EXISTS institution_id        UUID,
  ADD COLUMN IF NOT EXISTS aggregator_id         UUID;

UPDATE public.accounting_journals SET posting_date = COALESCE(posting_date, entry_date) WHERE posting_date IS NULL;
UPDATE public.accounting_journals SET entity_id = COALESCE(entity_id, entity) WHERE entity_id IS NULL;
UPDATE public.accounting_journals SET source_module = COALESCE(NULLIF(source_module, ''), source_type, 'MANUAL') WHERE source_module IS NULL OR source_module = '';

ALTER TABLE public.accounting_journal_lines
  ADD COLUMN IF NOT EXISTS entity_id    TEXT,
  ADD COLUMN IF NOT EXISTS branch_id    TEXT,
  ADD COLUMN IF NOT EXISTS account_role TEXT;

CREATE INDEX IF NOT EXISTS idx_journals_entity_id      ON public.accounting_journals(entity_id);
CREATE INDEX IF NOT EXISTS idx_journals_branch_id      ON public.accounting_journals(branch_id);
CREATE INDEX IF NOT EXISTS idx_journals_source         ON public.accounting_journals(source_module, source_record_id);
CREATE INDEX IF NOT EXISTS idx_journals_posting_date   ON public.accounting_journals(posting_date);
CREATE INDEX IF NOT EXISTS idx_journals_reversal_of    ON public.accounting_journals(reversal_of_journal_id);
CREATE INDEX IF NOT EXISTS idx_journals_student        ON public.accounting_journals(student_id);
CREATE INDEX IF NOT EXISTS idx_jlines_entity_id        ON public.accounting_journal_lines(entity_id);
CREATE INDEX IF NOT EXISTS idx_jlines_branch_id        ON public.accounting_journal_lines(branch_id);

-- >>> FILE: 20260720120000_hr_payroll_module_restructure_rbac.sql
UPDATE role_permissions
SET screens = screens || '{"documents": true,"approvals": true,"reports": true,"payrollCycle": true,"salaryRegister": true,"payrollHistory": true}'::jsonb
WHERE org_id = '00000000-0000-0000-0000-0000000000f1'
  AND role IN ('Super Admin', 'Admin', 'HR Manager', 'HR Executive');

UPDATE role_permissions
SET screens = screens || '{"documents": false,"approvals": true,"reports": false,"payrollCycle": false,"salaryRegister": false,"payrollHistory": false}'::jsonb
WHERE org_id = '00000000-0000-0000-0000-0000000000f1' AND role = 'Manager';

UPDATE role_permissions
SET screens = screens || '{"documents": false,"approvals": false,"reports": false,"payrollCycle": false,"salaryRegister": false,"payrollHistory": false}'::jsonb
WHERE org_id = '00000000-0000-0000-0000-0000000000f1' AND role = 'Employee';

CREATE OR REPLACE FUNCTION fn_reset_hr_role_permissions(p_org uuid)
RETURNS int LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT has_perm(p_org, 'configure') THEN
    RAISE EXCEPTION 'Configure permission required';
  END IF;
  DELETE FROM role_permissions WHERE org_id = p_org;
  INSERT INTO role_permissions(org_id, role, can_view, can_apply, can_approve, can_override, can_export, can_configure, can_manage_emp, screens) VALUES
    (p_org, 'Super Admin', true, true, true, true, true, true, true,
      '{"dashboard":true,"ess":true,"emp360":true,"employees":true,"documents":true,"training":true,"attendance":true,"leave":true,"compoff":true,"late":true,"mispunch":true,"holiday":true,"payrollCycle":true,"calculator":true,"verify":true,"salaryRegister":true,"payrollHistory":true,"approvals":true,"reports":true,"config":true,"docTypes":true,"shifts":true,"roles":true,"audit":true}'::jsonb),
    (p_org, 'Admin', true, true, true, true, true, true, true,
      '{"dashboard":true,"ess":true,"emp360":true,"employees":true,"documents":true,"training":true,"attendance":true,"leave":true,"compoff":true,"late":true,"mispunch":true,"holiday":true,"payrollCycle":true,"calculator":true,"verify":true,"salaryRegister":true,"payrollHistory":true,"approvals":true,"reports":true,"config":true,"docTypes":true,"shifts":true,"roles":true,"audit":true}'::jsonb),
    (p_org, 'HR Manager', true, true, true, true, true, false, true,
      '{"dashboard":true,"ess":true,"emp360":true,"employees":true,"documents":true,"training":true,"attendance":true,"leave":true,"compoff":true,"late":true,"mispunch":true,"holiday":true,"payrollCycle":true,"calculator":true,"verify":true,"salaryRegister":true,"payrollHistory":true,"approvals":true,"reports":true,"config":false,"docTypes":true,"shifts":true,"roles":true,"audit":true}'::jsonb),
    (p_org, 'HR Executive', true, true, true, false, true, false, true,
      '{"dashboard":true,"ess":true,"emp360":true,"employees":true,"documents":true,"training":true,"attendance":true,"leave":true,"compoff":true,"late":true,"mispunch":true,"holiday":true,"payrollCycle":true,"calculator":true,"verify":true,"salaryRegister":true,"payrollHistory":true,"approvals":true,"reports":true,"config":false,"docTypes":true,"shifts":false,"roles":false,"audit":true}'::jsonb),
    (p_org, 'Manager', true, true, true, false, false, false, false,
      '{"dashboard":true,"ess":true,"emp360":true,"employees":false,"documents":false,"training":true,"attendance":true,"leave":true,"compoff":true,"late":true,"mispunch":true,"holiday":false,"payrollCycle":false,"calculator":false,"verify":false,"salaryRegister":false,"payrollHistory":false,"approvals":true,"reports":false,"config":false,"docTypes":false,"shifts":false,"roles":false,"audit":false}'::jsonb),
    (p_org, 'Employee', true, true, false, false, false, false, false,
      '{"dashboard":false,"ess":true,"emp360":false,"employees":false,"documents":false,"training":false,"attendance":false,"leave":true,"compoff":true,"late":true,"mispunch":true,"holiday":true,"payrollCycle":false,"calculator":false,"verify":false,"salaryRegister":false,"payrollHistory":false,"approvals":false,"reports":false,"config":false,"docTypes":false,"shifts":false,"roles":false,"audit":false}'::jsonb);
  INSERT INTO audit_log (org_id, actor_label, action, target, new_value)
  VALUES (p_org, 'HR Admin', 'RBAC Reset', 'role_permissions', '6 roles (restructured nav)');
  RETURN 6;
END;
$$;

-- >>> FILE: 20260720120010_accounting_journal_immutability.sql
CREATE OR REPLACE FUNCTION public.fn_accounting_journal_guard()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  IF (TG_OP = 'DELETE') THEN
    IF OLD.status = 'POSTED' THEN
      RAISE EXCEPTION 'Posted journal % cannot be deleted. Use a reversal entry.', OLD.journal_number;
    END IF;
    RETURN OLD;
  END IF;
  IF OLD.status = 'POSTED' THEN
    IF ( NEW.entry_date       IS DISTINCT FROM OLD.entry_date
      OR NEW.posting_date     IS DISTINCT FROM OLD.posting_date
      OR NEW.entity           IS DISTINCT FROM OLD.entity
      OR NEW.entity_id        IS DISTINCT FROM OLD.entity_id
      OR NEW.branch_id        IS DISTINCT FROM OLD.branch_id
      OR NEW.currency         IS DISTINCT FROM OLD.currency
      OR NEW.fx_rate          IS DISTINCT FROM OLD.fx_rate
      OR NEW.source_module    IS DISTINCT FROM OLD.source_module
      OR NEW.source_record_id IS DISTINCT FROM OLD.source_record_id
      OR NEW.total_debit      IS DISTINCT FROM OLD.total_debit
      OR NEW.total_credit     IS DISTINCT FROM OLD.total_credit
      OR NEW.narration        IS DISTINCT FROM OLD.narration ) THEN
      RAISE EXCEPTION 'Posted journal % is immutable. Create a reversal entry instead.', OLD.journal_number;
    END IF;
    IF NEW.status IS DISTINCT FROM OLD.status AND NEW.status <> 'VOIDED' THEN
      RAISE EXCEPTION 'Posted journal % can only transition to VOIDED.', OLD.journal_number;
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_accounting_journal_guard ON public.accounting_journals;
CREATE TRIGGER trg_accounting_journal_guard
  BEFORE UPDATE OR DELETE ON public.accounting_journals
  FOR EACH ROW EXECUTE FUNCTION public.fn_accounting_journal_guard();

CREATE OR REPLACE FUNCTION public.fn_accounting_journal_line_guard()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public AS $$
DECLARE v_status TEXT; v_jid UUID;
BEGIN
  v_jid := COALESCE(NEW.journal_id, OLD.journal_id);
  SELECT status INTO v_status FROM public.accounting_journals WHERE id = v_jid;
  IF v_status = 'POSTED' THEN
    RAISE EXCEPTION 'Lines of posted journal % are immutable. Use a reversal entry.', v_jid;
  END IF;
  IF (TG_OP = 'DELETE') THEN RETURN OLD; END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_accounting_journal_line_guard ON public.accounting_journal_lines;
CREATE TRIGGER trg_accounting_journal_line_guard
  BEFORE INSERT OR UPDATE OR DELETE ON public.accounting_journal_lines
  FOR EACH ROW EXECUTE FUNCTION public.fn_accounting_journal_line_guard();

-- >>> FILE: 20260720120020_accounting_account_roles.sql
CREATE TABLE IF NOT EXISTS public.accounting_account_roles (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  role_key      TEXT NOT NULL,
  entity_id     TEXT,
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
  country       TEXT,
  leg_order     INT  NOT NULL DEFAULT 0,
  role_key      TEXT NOT NULL,
  dr_cr         TEXT NOT NULL CHECK (dr_cr IN ('DR','CR')),
  amount_expr   TEXT NOT NULL,
  is_optional   BOOLEAN NOT NULL DEFAULT FALSE,
  notes         TEXT,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (source_module, event_key, country, leg_order, role_key)
);

CREATE INDEX IF NOT EXISTS idx_acct_roles_key   ON public.accounting_account_roles(role_key);
CREATE INDEX IF NOT EXISTS idx_posting_rules_evt ON public.accounting_posting_rules(source_module, event_key, country);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.accounting_account_roles TO authenticated;
GRANT ALL ON public.accounting_account_roles TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.accounting_posting_rules TO authenticated;
GRANT ALL ON public.accounting_posting_rules TO service_role;

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

DROP TRIGGER IF EXISTS trg_accounting_account_roles_updated_at ON public.accounting_account_roles;
CREATE TRIGGER trg_accounting_account_roles_updated_at
  BEFORE UPDATE ON public.accounting_account_roles
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

INSERT INTO public.accounting_account_roles (role_key, entity_id, account_code, description) VALUES
  ('AR_STUDENT',            NULL, '1200', 'Accounts receivable — students'),
  ('AR_CORPORATE',          NULL, '1205', 'Accounts receivable — corporate/internal'),
  ('BANK_OPERATING',        NULL, '1010', 'Default operating bank'),
  ('BANK_TRUST',            NULL, '1201', 'Student trust bank'),
  ('STUDENT_FUNDS_CLEARING',NULL, '2480', 'Student funds clearing (unallocated)'),
  ('SUSPENSE',              NULL, '9001', 'Suspense — unclassified'),
  ('TRUST_TUITION',         NULL, '2401', 'Client funds — tuition held'),
  ('TRUST_EMBASSY',         NULL, '2402', 'Client funds — embassy/visa fees'),
  ('TRUST_APPLICATION',     NULL, '2403', 'Client funds — application fees'),
  ('TRUST_GIC',             NULL, '2404', 'Client funds — GIC held'),
  ('TRUST_OTHER',           NULL, '2405', 'Client funds — other'),
  ('TRUST_BIOMETRICS',      NULL, '2406', 'Client funds — biometrics'),
  ('TRUST_MEDICAL',         NULL, '2407', 'Client funds — medical/police'),
  ('DEPOSIT_REFUNDABLE',    NULL, '2481', 'Refundable deposits — service'),
  ('COLLEGE_PAYABLE',       NULL, '2420', 'College / institution payable'),
  ('REVENUE_SERVICE',       NULL, '4103', 'FL service / consulting revenue'),
  ('REVENUE_VISA',          NULL, '4101', 'Visa service revenue'),
  ('REVENUE_COACHING',      NULL, '4201', 'Coaching fees revenue'),
  ('TAX_OUTPUT_HST',        NULL, '2310', 'GST/HST output payable'),
  ('TAX_INPUT_HST',         NULL, '1340', 'GST/HST input tax credit'),
  ('TAX_OUTPUT_CGST',       NULL, '2360', 'CGST output payable'),
  ('TAX_OUTPUT_SGST',       NULL, '2361', 'SGST output payable'),
  ('TAX_OUTPUT_IGST',       NULL, '2362', 'IGST output payable'),
  ('TAX_INPUT_GST',         NULL, '1370', 'GST input tax credit (India)'),
  ('TDS_PAYABLE_VENDOR',    NULL, '2370', 'TDS payable — vendors'),
  ('TDS_PAYABLE_SALARY',    NULL, '2371', 'TDS payable — salary'),
  ('AP_TRADE',              NULL, '2000', 'Accounts payable — trade'),
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
  ('RETAINED_EARNINGS',     NULL, '3900', 'Retained earnings')
ON CONFLICT (role_key, entity_id) DO NOTHING;

-- >>> FILE: 20260720120030_accounting_phase1_coa_seed.sql
INSERT INTO public.accounting_coa
  (code, name, group_code, type_code, currency, normal_balance, entity_id, is_active, description)
SELECT v.code, v.name, v.grp, v.typ, v.cur, v.nb, NULL, TRUE, v.descr
FROM (VALUES
  ('1010','Operating Bank','ASSET','BANK','CAD','DEBIT','Default operating bank account'),
  ('1201','Student Trust Bank','ASSET','BANK','CAD','DEBIT','Segregated student trust bank account'),
  ('1200','Accounts Receivable — Students','ASSET','AR','CAD','DEBIT','Receivable from students (corporate AR only)'),
  ('1205','Accounts Receivable — Corporate','ASSET','AR','CAD','DEBIT','Receivable from internal/corporate clients'),
  ('1340','GST/HST Input Tax Credit','ASSET','TAX_INPUT','CAD','DEBIT','Recoverable GST/HST on purchases'),
  ('1370','GST Input Tax Credit (India)','ASSET','TAX_INPUT','INR','DEBIT','Recoverable GST on purchases (India)'),
  ('2000','Accounts Payable — Trade','LIABILITY','AP','CAD','CREDIT','Trade vendor payables'),
  ('2420','College / Institution Payable','LIABILITY','AP','CAD','CREDIT','Amounts owed to institutions for student funds'),
  ('2480','Student Funds Clearing','LIABILITY','AP','CAD','CREDIT','Unallocated student funds clearing'),
  ('2481','Refundable Deposits — Service','LIABILITY','AP','CAD','CREDIT','Refundable service deposits held'),
  ('2310','GST/HST Output Payable','LIABILITY','TAX_PAYABLE','CAD','CREDIT','GST/HST collected on sales'),
  ('2360','CGST Output Payable','LIABILITY','TAX_PAYABLE','INR','CREDIT','CGST collected on sales'),
  ('2361','SGST Output Payable','LIABILITY','TAX_PAYABLE','INR','CREDIT','SGST collected on sales'),
  ('2362','IGST Output Payable','LIABILITY','TAX_PAYABLE','INR','CREDIT','IGST collected on sales'),
  ('2370','TDS Payable — Vendors','LIABILITY','TAX_PAYABLE','INR','CREDIT','Tax deducted at source on vendor payments'),
  ('2371','TDS Payable — Salary','LIABILITY','TAX_PAYABLE','INR','CREDIT','Tax deducted at source on salaries'),
  ('2330','CPP Payable','LIABILITY','PAYROLL_LIAB','CAD','CREDIT','Canada Pension Plan payable'),
  ('2332','EI Payable','LIABILITY','PAYROLL_LIAB','CAD','CREDIT','Employment Insurance payable'),
  ('2334','Income Tax Withheld','LIABILITY','PAYROLL_LIAB','CAD','CREDIT','Employee income tax withheld (Canada)'),
  ('2340','Net Payroll Payable','LIABILITY','PAYROLL_LIAB','CAD','CREDIT','Net salaries payable to employees'),
  ('2350','PF Payable','LIABILITY','PAYROLL_LIAB','INR','CREDIT','Provident Fund payable (India)'),
  ('2352','ESIC Payable','LIABILITY','PAYROLL_LIAB','INR','CREDIT','ESIC payable (India)'),
  ('2354','Professional Tax Payable','LIABILITY','PAYROLL_LIAB','INR','CREDIT','Professional tax payable (India)'),
  ('6100','Salaries & Wages','EXPENSE','SALARIES','CAD','DEBIT','Gross salaries and wages'),
  ('6110','CPP Employer Expense','EXPENSE','SALARIES','CAD','DEBIT','Employer CPP contributions'),
  ('6111','EI Employer Expense','EXPENSE','SALARIES','CAD','DEBIT','Employer EI contributions'),
  ('6120','PF Employer Expense','EXPENSE','SALARIES','INR','DEBIT','Employer PF contributions (India)'),
  ('6121','ESIC Employer Expense','EXPENSE','SALARIES','INR','DEBIT','Employer ESIC contributions (India)'),
  ('3900','Retained Earnings','EQUITY','RETAINED','CAD','CREDIT','Accumulated retained earnings')
) AS v(code, name, grp, typ, cur, nb, descr)
WHERE NOT EXISTS (SELECT 1 FROM public.accounting_coa c WHERE c.code = v.code AND c.entity_id IS NULL);

-- >>> FILE: 20260720120040_accounting_invoice_classification.sql
CREATE TABLE IF NOT EXISTS public.accounting_crm_invoice_bridge (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_id          UUID NOT NULL REFERENCES public.client_invoices(id) ON DELETE CASCADE,
  client_id           UUID,
  entity_id           TEXT NOT NULL,
  branch_id           TEXT NOT NULL,
  currency            TEXT NOT NULL DEFAULT 'CAD',
  classification_status TEXT NOT NULL DEFAULT 'PENDING'
                        CHECK (classification_status IN ('PENDING','CLASSIFIED','POSTED')),
  total_revenue       NUMERIC(15,2) NOT NULL DEFAULT 0,
  total_trust         NUMERIC(15,2) NOT NULL DEFAULT 0,
  total_tax           NUMERIC(15,2) NOT NULL DEFAULT 0,
  journal_id          UUID REFERENCES public.accounting_journals(id),
  posted_at           TIMESTAMPTZ,
  student_id          UUID,
  application_id      UUID,
  institution_id      UUID,
  aggregator_id       UUID,
  created_by          UUID REFERENCES public.profiles(id),
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (invoice_id)
);

CREATE TABLE IF NOT EXISTS public.accounting_invoice_line_classifications (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  bridge_id       UUID NOT NULL REFERENCES public.accounting_crm_invoice_bridge(id) ON DELETE CASCADE,
  line_index      INT  NOT NULL,
  line_label      TEXT,
  classification  TEXT NOT NULL DEFAULT 'REVENUE'
                    CHECK (classification IN ('REVENUE','TRUST','DEPOSIT')),
  role_key        TEXT NOT NULL,
  gross_amount    NUMERIC(15,2) NOT NULL DEFAULT 0,
  net_amount      NUMERIC(15,2) NOT NULL DEFAULT 0,
  tax_amount      NUMERIC(15,2) NOT NULL DEFAULT 0,
  tax_code        TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (bridge_id, line_index)
);

CREATE INDEX IF NOT EXISTS idx_crm_bridge_invoice ON public.accounting_crm_invoice_bridge(invoice_id);
CREATE INDEX IF NOT EXISTS idx_crm_bridge_entity  ON public.accounting_crm_invoice_bridge(entity_id);
CREATE INDEX IF NOT EXISTS idx_line_class_bridge  ON public.accounting_invoice_line_classifications(bridge_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.accounting_crm_invoice_bridge TO authenticated;
GRANT ALL ON public.accounting_crm_invoice_bridge TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.accounting_invoice_line_classifications TO authenticated;
GRANT ALL ON public.accounting_invoice_line_classifications TO service_role;

ALTER TABLE public.accounting_crm_invoice_bridge ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.accounting_invoice_line_classifications ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "accounting_users_all" ON public.accounting_crm_invoice_bridge;
CREATE POLICY "accounting_users_all" ON public.accounting_crm_invoice_bridge FOR ALL
  USING (public.is_accounting_user(auth.uid()))
  WITH CHECK (public.is_accounting_user(auth.uid()));

DROP POLICY IF EXISTS "accounting_users_all" ON public.accounting_invoice_line_classifications;
CREATE POLICY "accounting_users_all" ON public.accounting_invoice_line_classifications FOR ALL
  USING (public.is_accounting_user(auth.uid()))
  WITH CHECK (public.is_accounting_user(auth.uid()));

DROP TRIGGER IF EXISTS trg_crm_invoice_bridge_updated_at ON public.accounting_crm_invoice_bridge;
CREATE TRIGGER trg_crm_invoice_bridge_updated_at
  BEFORE UPDATE ON public.accounting_crm_invoice_bridge
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- >>> FILE: 20260720120050_accounting_trust_subledger.sql
CREATE TABLE IF NOT EXISTS public.accounting_trust_accounts (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id   UUID NOT NULL,
  student_id  UUID,
  entity_id   TEXT NOT NULL,
  branch_id   TEXT NOT NULL,
  role_key    TEXT NOT NULL,
  currency    TEXT NOT NULL DEFAULT 'CAD',
  balance     NUMERIC(15,2) NOT NULL DEFAULT 0,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (client_id, role_key, entity_id, currency)
);

ALTER TABLE public.accounting_trust_entries
  ADD COLUMN IF NOT EXISTS trust_account_id UUID REFERENCES public.accounting_trust_accounts(id) ON DELETE RESTRICT,
  ADD COLUMN IF NOT EXISTS entry_type       TEXT,
  ADD COLUMN IF NOT EXISTS amount           NUMERIC(15,2),
  ADD COLUMN IF NOT EXISTS currency         TEXT NOT NULL DEFAULT 'CAD',
  ADD COLUMN IF NOT EXISTS source_module    TEXT,
  ADD COLUMN IF NOT EXISTS source_record_id UUID,
  ADD COLUMN IF NOT EXISTS journal_id       UUID REFERENCES public.accounting_journals(id),
  ADD COLUMN IF NOT EXISTS memo             TEXT,
  ADD COLUMN IF NOT EXISTS created_by       UUID REFERENCES public.profiles(id);

CREATE INDEX IF NOT EXISTS idx_trust_acct_client ON public.accounting_trust_accounts(client_id);
CREATE INDEX IF NOT EXISTS idx_trust_acct_entity ON public.accounting_trust_accounts(entity_id);
CREATE INDEX IF NOT EXISTS idx_trust_entry_acct  ON public.accounting_trust_entries(trust_account_id);
CREATE INDEX IF NOT EXISTS idx_trust_entry_src   ON public.accounting_trust_entries(source_module, source_record_id);

CREATE OR REPLACE FUNCTION public.fn_trust_entry_apply_balance()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  UPDATE public.accounting_trust_accounts
     SET balance = balance + NEW.amount, updated_at = now()
   WHERE id = NEW.trust_account_id;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_trust_entry_apply_balance ON public.accounting_trust_entries;
CREATE TRIGGER trg_trust_entry_apply_balance
  AFTER INSERT ON public.accounting_trust_entries
  FOR EACH ROW EXECUTE FUNCTION public.fn_trust_entry_apply_balance();

GRANT SELECT, INSERT, UPDATE, DELETE ON public.accounting_trust_accounts TO authenticated;
GRANT ALL ON public.accounting_trust_accounts TO service_role;

ALTER TABLE public.accounting_trust_accounts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "accounting_users_all" ON public.accounting_trust_accounts;
CREATE POLICY "accounting_users_all" ON public.accounting_trust_accounts FOR ALL
  USING (public.is_accounting_user(auth.uid()))
  WITH CHECK (public.is_accounting_user(auth.uid()));

DROP TRIGGER IF EXISTS trg_trust_accounts_updated_at ON public.accounting_trust_accounts;
CREATE TRIGGER trg_trust_accounts_updated_at
  BEFORE UPDATE ON public.accounting_trust_accounts
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- >>> FILE: 20260720120060_accounting_trust_disbursements.sql
CREATE TABLE IF NOT EXISTS public.accounting_trust_disbursements (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id       UUID NOT NULL,
  entity_id       TEXT NOT NULL,
  branch_id       TEXT NOT NULL,
  role_key        TEXT NOT NULL,
  payee_type      TEXT NOT NULL CHECK (payee_type IN ('INSTITUTION','VENDOR','STUDENT_REFUND','THIRD_PARTY')),
  payee_name      TEXT NOT NULL,
  amount          NUMERIC(15,2) NOT NULL CHECK (amount > 0),
  currency        TEXT NOT NULL DEFAULT 'CAD',
  payment_method  TEXT,
  reference       TEXT,
  posting_date    DATE NOT NULL DEFAULT CURRENT_DATE,
  memo            TEXT,
  attachment_path TEXT,
  status          TEXT NOT NULL DEFAULT 'DRAFT' CHECK (status IN ('DRAFT','POSTED','VOIDED')),
  is_refund       BOOLEAN NOT NULL DEFAULT FALSE,
  journal_id      UUID REFERENCES public.accounting_journals(id),
  trust_entry_id  UUID REFERENCES public.accounting_trust_entries(id),
  student_id      UUID,
  application_id  UUID,
  institution_id  UUID,
  aggregator_id   UUID,
  created_by      UUID REFERENCES public.profiles(id),
  posted_by       UUID REFERENCES public.profiles(id),
  posted_at       TIMESTAMPTZ,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_trust_disb_client ON public.accounting_trust_disbursements(client_id);
CREATE INDEX IF NOT EXISTS idx_trust_disb_entity ON public.accounting_trust_disbursements(entity_id);
CREATE INDEX IF NOT EXISTS idx_trust_disb_status ON public.accounting_trust_disbursements(status);

CREATE OR REPLACE FUNCTION public.fn_trust_entry_balance_guard()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public AS $$
DECLARE v_balance NUMERIC(15,2);
BEGIN
  SELECT balance INTO v_balance FROM public.accounting_trust_accounts WHERE id = NEW.trust_account_id FOR UPDATE;
  IF v_balance IS NULL THEN
    RAISE EXCEPTION 'Trust account % not found.', NEW.trust_account_id;
  END IF;
  IF (v_balance + NEW.amount) < 0 THEN
    RAISE EXCEPTION 'Trust disbursement exceeds available student funds. Available: %, requested change: %.', v_balance, NEW.amount;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_aa_trust_entry_balance_guard ON public.accounting_trust_entries;
CREATE TRIGGER trg_aa_trust_entry_balance_guard
  BEFORE INSERT ON public.accounting_trust_entries
  FOR EACH ROW EXECUTE FUNCTION public.fn_trust_entry_balance_guard();

GRANT SELECT, INSERT, UPDATE, DELETE ON public.accounting_trust_disbursements TO authenticated;
GRANT ALL ON public.accounting_trust_disbursements TO service_role;

ALTER TABLE public.accounting_trust_disbursements ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "accounting_users_all" ON public.accounting_trust_disbursements;
CREATE POLICY "accounting_users_all" ON public.accounting_trust_disbursements FOR ALL
  USING (public.is_accounting_user(auth.uid()))
  WITH CHECK (public.is_accounting_user(auth.uid()));

DROP TRIGGER IF EXISTS trg_trust_disb_updated_at ON public.accounting_trust_disbursements;
CREATE TRIGGER trg_trust_disb_updated_at
  BEFORE UPDATE ON public.accounting_trust_disbursements
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- >>> FILE: 20260720120070_accounting_tax_framework.sql
CREATE TABLE IF NOT EXISTS public.accounting_tax_codes (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code           TEXT NOT NULL,
  name           TEXT NOT NULL,
  country        TEXT NOT NULL,
  tax_type       TEXT NOT NULL,
  total_rate     NUMERIC(7,4) NOT NULL DEFAULT 0,
  is_recoverable BOOLEAN NOT NULL DEFAULT TRUE,
  is_withholding BOOLEAN NOT NULL DEFAULT FALSE,
  entity_id      TEXT,
  is_active      BOOLEAN NOT NULL DEFAULT TRUE,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (code, entity_id)
);

CREATE TABLE IF NOT EXISTS public.accounting_tax_components (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tax_code_id     UUID NOT NULL REFERENCES public.accounting_tax_codes(id) ON DELETE CASCADE,
  component       TEXT NOT NULL,
  rate            NUMERIC(7,4) NOT NULL DEFAULT 0,
  output_role_key TEXT,
  input_role_key  TEXT,
  leg_order       INT NOT NULL DEFAULT 0,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.accounting_entity_tax_config (
  id                       UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_id                TEXT NOT NULL,
  country                  TEXT NOT NULL,
  is_tax_registered        BOOLEAN NOT NULL DEFAULT TRUE,
  registration_number      TEXT,
  default_output_tax_code  TEXT,
  default_input_tax_code   TEXT,
  commission_tax_code      TEXT,
  commission_tax_mode      TEXT DEFAULT 'EXCLUSIVE' CHECK (commission_tax_mode IN ('EXCLUSIVE','INCLUSIVE','EXEMPT','RCM')),
  default_tds_code         TEXT,
  settings                 JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at               TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at               TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (entity_id)
);

CREATE INDEX IF NOT EXISTS idx_tax_codes_country ON public.accounting_tax_codes(country);
CREATE INDEX IF NOT EXISTS idx_tax_comp_code     ON public.accounting_tax_components(tax_code_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.accounting_tax_codes TO authenticated;
GRANT ALL ON public.accounting_tax_codes TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.accounting_tax_components TO authenticated;
GRANT ALL ON public.accounting_tax_components TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.accounting_entity_tax_config TO authenticated;
GRANT ALL ON public.accounting_entity_tax_config TO service_role;

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

DROP TRIGGER IF EXISTS trg_tax_codes_updated_at ON public.accounting_tax_codes;
CREATE TRIGGER trg_tax_codes_updated_at
  BEFORE UPDATE ON public.accounting_tax_codes
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();
DROP TRIGGER IF EXISTS trg_entity_tax_config_updated_at ON public.accounting_entity_tax_config;
CREATE TRIGGER trg_entity_tax_config_updated_at
  BEFORE UPDATE ON public.accounting_entity_tax_config
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

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
WHERE NOT EXISTS (SELECT 1 FROM public.accounting_tax_codes c WHERE c.code = v.code AND c.entity_id IS NULL);

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

INSERT INTO public.accounting_tax_components (tax_code_id, component, rate, output_role_key, input_role_key, leg_order)
SELECT c.id, 'IGST', 18.0, 'TAX_OUTPUT_IGST', 'TAX_INPUT_GST', 0
FROM public.accounting_tax_codes c
WHERE c.code='IGST_IN_18' AND c.entity_id IS NULL
  AND NOT EXISTS (SELECT 1 FROM public.accounting_tax_components x WHERE x.tax_code_id=c.id);

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

-- >>> FILE: 20260720120080_accounting_tax_filings_remittances.sql
CREATE TABLE IF NOT EXISTS public.accounting_tax_filings (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_id        TEXT NOT NULL,
  branch_id        TEXT NOT NULL,
  country          TEXT NOT NULL,
  tax_type         TEXT NOT NULL,
  tax_code         TEXT,
  period_label     TEXT NOT NULL,
  period_start     DATE NOT NULL,
  period_end       DATE NOT NULL,
  due_date         DATE,
  currency         TEXT NOT NULL DEFAULT 'CAD',
  output_tax       NUMERIC(15,2) NOT NULL DEFAULT 0,
  input_tax        NUMERIC(15,2) NOT NULL DEFAULT 0,
  net_payable      NUMERIC(15,2) NOT NULL DEFAULT 0,
  status           TEXT NOT NULL DEFAULT 'OPEN' CHECK (status IN ('OPEN','FILED','REMITTED')),
  filed_date       DATE,
  filed_by         UUID REFERENCES public.profiles(id),
  reference_number TEXT,
  attachment_path  TEXT,
  notes            TEXT,
  created_by       UUID REFERENCES public.profiles(id),
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.accounting_tax_remittances (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  filing_id       UUID REFERENCES public.accounting_tax_filings(id) ON DELETE SET NULL,
  entity_id       TEXT NOT NULL,
  branch_id       TEXT NOT NULL,
  amount          NUMERIC(15,2) NOT NULL CHECK (amount > 0),
  currency        TEXT NOT NULL DEFAULT 'CAD',
  payment_method  TEXT,
  reference       TEXT,
  bank_role_key   TEXT NOT NULL DEFAULT 'BANK_OPERATING',
  posting_date    DATE NOT NULL DEFAULT CURRENT_DATE,
  attachment_path TEXT,
  status          TEXT NOT NULL DEFAULT 'DRAFT' CHECK (status IN ('DRAFT','POSTED','VOIDED')),
  journal_id      UUID REFERENCES public.accounting_journals(id),
  created_by      UUID REFERENCES public.profiles(id),
  posted_by       UUID REFERENCES public.profiles(id),
  posted_at       TIMESTAMPTZ,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_tax_filings_entity ON public.accounting_tax_filings(entity_id);
CREATE INDEX IF NOT EXISTS idx_tax_filings_status ON public.accounting_tax_filings(status);
CREATE INDEX IF NOT EXISTS idx_tax_remit_filing   ON public.accounting_tax_remittances(filing_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.accounting_tax_filings TO authenticated;
GRANT ALL ON public.accounting_tax_filings TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.accounting_tax_remittances TO authenticated;
GRANT ALL ON public.accounting_tax_remittances TO service_role;

ALTER TABLE public.accounting_tax_filings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.accounting_tax_remittances ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "accounting_users_all" ON public.accounting_tax_filings;
CREATE POLICY "accounting_users_all" ON public.accounting_tax_filings FOR ALL
  USING (public.is_accounting_user(auth.uid()))
  WITH CHECK (public.is_accounting_user(auth.uid()));

DROP POLICY IF EXISTS "accounting_users_all" ON public.accounting_tax_remittances;
CREATE POLICY "accounting_users_all" ON public.accounting_tax_remittances FOR ALL
  USING (public.is_accounting_user(auth.uid()))
  WITH CHECK (public.is_accounting_user(auth.uid()));

DROP TRIGGER IF EXISTS trg_tax_filings_updated_at ON public.accounting_tax_filings;
CREATE TRIGGER trg_tax_filings_updated_at
  BEFORE UPDATE ON public.accounting_tax_filings
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();
DROP TRIGGER IF EXISTS trg_tax_remit_updated_at ON public.accounting_tax_remittances;
CREATE TRIGGER trg_tax_remit_updated_at
  BEFORE UPDATE ON public.accounting_tax_remittances
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- >>> FILE: 20260720120090_accounting_payroll.sql
CREATE TABLE IF NOT EXISTS public.accounting_payroll_batches (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_id           TEXT NOT NULL,
  branch_id           TEXT NOT NULL,
  country             TEXT NOT NULL,
  period_label        TEXT NOT NULL,
  period_start        DATE NOT NULL,
  period_end          DATE NOT NULL,
  posting_date        DATE NOT NULL DEFAULT CURRENT_DATE,
  currency            TEXT NOT NULL DEFAULT 'CAD',
  gross_total         NUMERIC(15,2) NOT NULL DEFAULT 0,
  deductions_total    NUMERIC(15,2) NOT NULL DEFAULT 0,
  employer_cost_total NUMERIC(15,2) NOT NULL DEFAULT 0,
  net_total           NUMERIC(15,2) NOT NULL DEFAULT 0,
  status              TEXT NOT NULL DEFAULT 'DRAFT' CHECK (status IN ('DRAFT','ACCRUED','PAID','VOIDED')),
  accrual_journal_id  UUID REFERENCES public.accounting_journals(id),
  payment_journal_id  UUID REFERENCES public.accounting_journals(id),
  source_payout_id    UUID,
  attachment_path     TEXT,
  bank_role_key       TEXT NOT NULL DEFAULT 'BANK_OPERATING',
  created_by          UUID REFERENCES public.profiles(id),
  posted_by           UUID REFERENCES public.profiles(id),
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.accounting_payroll_lines (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  batch_id         UUID NOT NULL REFERENCES public.accounting_payroll_batches(id) ON DELETE CASCADE,
  employee_id      UUID,
  employee_name    TEXT NOT NULL,
  gross            NUMERIC(15,2) NOT NULL DEFAULT 0,
  deductions_total NUMERIC(15,2) NOT NULL DEFAULT 0,
  employer_cost    NUMERIC(15,2) NOT NULL DEFAULT 0,
  net              NUMERIC(15,2) NOT NULL DEFAULT 0,
  components       JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.accounting_payroll_components (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  batch_id    UUID NOT NULL REFERENCES public.accounting_payroll_batches(id) ON DELETE CASCADE,
  role_key    TEXT NOT NULL,
  dr_cr       TEXT NOT NULL CHECK (dr_cr IN ('DR','CR')),
  amount      NUMERIC(15,2) NOT NULL DEFAULT 0,
  label       TEXT,
  leg_order   INT NOT NULL DEFAULT 0,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_payroll_batch_entity ON public.accounting_payroll_batches(entity_id);
CREATE INDEX IF NOT EXISTS idx_payroll_batch_status ON public.accounting_payroll_batches(status);
CREATE INDEX IF NOT EXISTS idx_payroll_lines_batch  ON public.accounting_payroll_lines(batch_id);
CREATE INDEX IF NOT EXISTS idx_payroll_comp_batch   ON public.accounting_payroll_components(batch_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.accounting_payroll_batches TO authenticated;
GRANT ALL ON public.accounting_payroll_batches TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.accounting_payroll_lines TO authenticated;
GRANT ALL ON public.accounting_payroll_lines TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.accounting_payroll_components TO authenticated;
GRANT ALL ON public.accounting_payroll_components TO service_role;

ALTER TABLE public.accounting_payroll_batches ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.accounting_payroll_lines ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.accounting_payroll_components ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "accounting_users_all" ON public.accounting_payroll_batches;
CREATE POLICY "accounting_users_all" ON public.accounting_payroll_batches FOR ALL
  USING (public.is_accounting_user(auth.uid()))
  WITH CHECK (public.is_accounting_user(auth.uid()));

DROP POLICY IF EXISTS "accounting_users_all" ON public.accounting_payroll_lines;
CREATE POLICY "accounting_users_all" ON public.accounting_payroll_lines FOR ALL
  USING (public.is_accounting_user(auth.uid()))
  WITH CHECK (public.is_accounting_user(auth.uid()));

DROP POLICY IF EXISTS "accounting_users_all" ON public.accounting_payroll_components;
CREATE POLICY "accounting_users_all" ON public.accounting_payroll_components FOR ALL
  USING (public.is_accounting_user(auth.uid()))
  WITH CHECK (public.is_accounting_user(auth.uid()));

DROP TRIGGER IF EXISTS trg_payroll_batches_updated_at ON public.accounting_payroll_batches;
CREATE TRIGGER trg_payroll_batches_updated_at
  BEFORE UPDATE ON public.accounting_payroll_batches
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- >>> FILE: 20260720120100_accounting_ap_payments.sql
ALTER TABLE public.accounting_ap_bills
  ADD COLUMN IF NOT EXISTS entity_id       TEXT,
  ADD COLUMN IF NOT EXISTS branch_id       TEXT,
  ADD COLUMN IF NOT EXISTS approval_status TEXT NOT NULL DEFAULT 'PENDING'
        CHECK (approval_status IN ('PENDING','APPROVED','REJECTED')),
  ADD COLUMN IF NOT EXISTS approved_by     UUID REFERENCES public.profiles(id),
  ADD COLUMN IF NOT EXISTS approved_at     TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS tax_code        TEXT,
  ADD COLUMN IF NOT EXISTS tds_code        TEXT,
  ADD COLUMN IF NOT EXISTS expense_role_key TEXT,
  ADD COLUMN IF NOT EXISTS attachment_path TEXT;

UPDATE public.accounting_ap_bills SET entity_id = COALESCE(entity_id, entity) WHERE entity_id IS NULL;

CREATE TABLE IF NOT EXISTS public.accounting_ap_payments (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  payment_number  TEXT,
  vendor_id       UUID REFERENCES public.accounting_vendors(id),
  vendor_name     TEXT NOT NULL,
  entity_id       TEXT NOT NULL,
  branch_id       TEXT NOT NULL,
  currency        TEXT NOT NULL DEFAULT 'CAD',
  amount          NUMERIC(15,2) NOT NULL CHECK (amount > 0),
  tds_amount      NUMERIC(15,2) NOT NULL DEFAULT 0,
  posting_date    DATE NOT NULL DEFAULT CURRENT_DATE,
  payment_method  TEXT,
  reference       TEXT,
  bank_role_key   TEXT NOT NULL DEFAULT 'BANK_OPERATING',
  tds_role_key    TEXT,
  attachment_path TEXT,
  status          TEXT NOT NULL DEFAULT 'DRAFT' CHECK (status IN ('DRAFT','POSTED','VOIDED')),
  journal_id      UUID REFERENCES public.accounting_journals(id),
  created_by      UUID REFERENCES public.profiles(id),
  posted_by       UUID REFERENCES public.profiles(id),
  posted_at       TIMESTAMPTZ,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.accounting_ap_payment_allocations (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  payment_id  UUID NOT NULL REFERENCES public.accounting_ap_payments(id) ON DELETE CASCADE,
  bill_id     UUID NOT NULL REFERENCES public.accounting_ap_bills(id) ON DELETE RESTRICT,
  amount      NUMERIC(15,2) NOT NULL CHECK (amount > 0),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_ap_pay_vendor   ON public.accounting_ap_payments(vendor_id);
CREATE INDEX IF NOT EXISTS idx_ap_pay_status   ON public.accounting_ap_payments(status);
CREATE INDEX IF NOT EXISTS idx_ap_pay_alloc_p  ON public.accounting_ap_payment_allocations(payment_id);
CREATE INDEX IF NOT EXISTS idx_ap_pay_alloc_b  ON public.accounting_ap_payment_allocations(bill_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.accounting_ap_payments TO authenticated;
GRANT ALL ON public.accounting_ap_payments TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.accounting_ap_payment_allocations TO authenticated;
GRANT ALL ON public.accounting_ap_payment_allocations TO service_role;

ALTER TABLE public.accounting_ap_payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.accounting_ap_payment_allocations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "accounting_users_all" ON public.accounting_ap_payments;
CREATE POLICY "accounting_users_all" ON public.accounting_ap_payments FOR ALL
  USING (public.is_accounting_user(auth.uid()))
  WITH CHECK (public.is_accounting_user(auth.uid()));

DROP POLICY IF EXISTS "accounting_users_all" ON public.accounting_ap_payment_allocations;
CREATE POLICY "accounting_users_all" ON public.accounting_ap_payment_allocations FOR ALL
  USING (public.is_accounting_user(auth.uid()))
  WITH CHECK (public.is_accounting_user(auth.uid()));

DROP TRIGGER IF EXISTS trg_ap_payments_updated_at ON public.accounting_ap_payments;
CREATE TRIGGER trg_ap_payments_updated_at
  BEFORE UPDATE ON public.accounting_ap_payments
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- >>> FILE: 20260720120110_accounting_fiscal_periods.sql
CREATE TABLE IF NOT EXISTS public.accounting_fiscal_periods (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_id     TEXT NOT NULL,
  period_label  TEXT NOT NULL,
  period_start  DATE NOT NULL,
  period_end    DATE NOT NULL,
  status        TEXT NOT NULL DEFAULT 'OPEN' CHECK (status IN ('OPEN','CLOSED','LOCKED')),
  total_debit   NUMERIC(15,2) NOT NULL DEFAULT 0,
  total_credit  NUMERIC(15,2) NOT NULL DEFAULT 0,
  closed_by     UUID REFERENCES public.profiles(id),
  closed_at     TIMESTAMPTZ,
  reopened_by   UUID REFERENCES public.profiles(id),
  reopened_at   TIMESTAMPTZ,
  notes         TEXT,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (entity_id, period_label)
);

CREATE INDEX IF NOT EXISTS idx_fiscal_periods_entity ON public.accounting_fiscal_periods(entity_id);
CREATE INDEX IF NOT EXISTS idx_fiscal_periods_range  ON public.accounting_fiscal_periods(period_start, period_end);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.accounting_fiscal_periods TO authenticated;
GRANT ALL ON public.accounting_fiscal_periods TO service_role;

ALTER TABLE public.accounting_fiscal_periods ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "accounting_users_read" ON public.accounting_fiscal_periods;
CREATE POLICY "accounting_users_read" ON public.accounting_fiscal_periods FOR SELECT
  USING (public.is_accounting_user(auth.uid()));
DROP POLICY IF EXISTS "accounting_admins_write" ON public.accounting_fiscal_periods;
CREATE POLICY "accounting_admins_write" ON public.accounting_fiscal_periods FOR ALL
  USING (public.is_accounting_admin(auth.uid()))
  WITH CHECK (public.is_accounting_admin(auth.uid()));

DROP TRIGGER IF EXISTS trg_fiscal_periods_updated_at ON public.accounting_fiscal_periods;
CREATE TRIGGER trg_fiscal_periods_updated_at
  BEFORE UPDATE ON public.accounting_fiscal_periods
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

CREATE OR REPLACE FUNCTION public.fn_accounting_period_lock_guard()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public AS $$
DECLARE v_status TEXT; v_date DATE;
BEGIN
  v_date := COALESCE(NEW.posting_date, NEW.entry_date);
  IF NEW.entity_id IS NULL OR v_date IS NULL THEN RETURN NEW; END IF;
  SELECT status INTO v_status FROM public.accounting_fiscal_periods
   WHERE entity_id = NEW.entity_id AND v_date BETWEEN period_start AND period_end
   ORDER BY period_start DESC LIMIT 1;
  IF v_status IN ('CLOSED','LOCKED') THEN
    RAISE EXCEPTION 'Period for % on % is %; postings are not allowed.', NEW.entity_id, v_date, v_status;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_accounting_period_lock_guard ON public.accounting_journals;
CREATE TRIGGER trg_accounting_period_lock_guard
  BEFORE INSERT OR UPDATE OF posting_date, entry_date, status, entity_id
  ON public.accounting_journals
  FOR EACH ROW EXECUTE FUNCTION public.fn_accounting_period_lock_guard();

-- >>> FILE: 20260720120120_accounting_bank_reconciliation.sql
CREATE TABLE IF NOT EXISTS public.accounting_recon_sessions (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_id         TEXT NOT NULL,
  branch_id         TEXT NOT NULL,
  bank_account_code TEXT NOT NULL,
  bank_role_key     TEXT,
  currency          TEXT NOT NULL DEFAULT 'CAD',
  statement_start   DATE NOT NULL,
  statement_end     DATE NOT NULL,
  opening_balance   NUMERIC(15,2) NOT NULL DEFAULT 0,
  closing_balance   NUMERIC(15,2) NOT NULL DEFAULT 0,
  matched_count     INT NOT NULL DEFAULT 0,
  unmatched_count   INT NOT NULL DEFAULT 0,
  difference        NUMERIC(15,2) NOT NULL DEFAULT 0,
  status            TEXT NOT NULL DEFAULT 'IN_PROGRESS' CHECK (status IN ('IN_PROGRESS','COMPLETED')),
  created_by        UUID REFERENCES public.profiles(id),
  completed_by      UUID REFERENCES public.profiles(id),
  completed_at      TIMESTAMPTZ,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.accounting_recon_statement_lines (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id   UUID NOT NULL REFERENCES public.accounting_recon_sessions(id) ON DELETE CASCADE,
  txn_date     DATE NOT NULL,
  description  TEXT,
  reference    TEXT,
  amount       NUMERIC(15,2) NOT NULL,
  is_matched   BOOLEAN NOT NULL DEFAULT FALSE,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.accounting_recon_matches (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id       UUID NOT NULL REFERENCES public.accounting_recon_sessions(id) ON DELETE CASCADE,
  statement_line_id UUID REFERENCES public.accounting_recon_statement_lines(id) ON DELETE CASCADE,
  journal_id       UUID REFERENCES public.accounting_journals(id),
  journal_line_id  UUID REFERENCES public.accounting_journal_lines(id),
  amount           NUMERIC(15,2) NOT NULL DEFAULT 0,
  matched_by       UUID REFERENCES public.profiles(id),
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_recon_sess_entity  ON public.accounting_recon_sessions(entity_id);
CREATE INDEX IF NOT EXISTS idx_recon_lines_sess   ON public.accounting_recon_statement_lines(session_id);
CREATE INDEX IF NOT EXISTS idx_recon_match_sess   ON public.accounting_recon_matches(session_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.accounting_recon_sessions TO authenticated;
GRANT ALL ON public.accounting_recon_sessions TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.accounting_recon_statement_lines TO authenticated;
GRANT ALL ON public.accounting_recon_statement_lines TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.accounting_recon_matches TO authenticated;
GRANT ALL ON public.accounting_recon_matches TO service_role;

ALTER TABLE public.accounting_recon_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.accounting_recon_statement_lines ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.accounting_recon_matches ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "accounting_users_all" ON public.accounting_recon_sessions;
CREATE POLICY "accounting_users_all" ON public.accounting_recon_sessions FOR ALL
  USING (public.is_accounting_user(auth.uid()))
  WITH CHECK (public.is_accounting_user(auth.uid()));

DROP POLICY IF EXISTS "accounting_users_all" ON public.accounting_recon_statement_lines;
CREATE POLICY "accounting_users_all" ON public.accounting_recon_statement_lines FOR ALL
  USING (public.is_accounting_user(auth.uid()))
  WITH CHECK (public.is_accounting_user(auth.uid()));

DROP POLICY IF EXISTS "accounting_users_all" ON public.accounting_recon_matches;
CREATE POLICY "accounting_users_all" ON public.accounting_recon_matches FOR ALL
  USING (public.is_accounting_user(auth.uid()))
  WITH CHECK (public.is_accounting_user(auth.uid()));

DROP TRIGGER IF EXISTS trg_recon_sessions_updated_at ON public.accounting_recon_sessions;
CREATE TRIGGER trg_recon_sessions_updated_at
  BEFORE UPDATE ON public.accounting_recon_sessions
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- >>> FILE: 20260720120130_accounting_attachments_and_helpers.sql
-- Storage bucket + storage.objects policies deferred to storage_create_bucket tool call
CREATE OR REPLACE FUNCTION public.fn_trust_available_balance(
  p_client_id UUID, p_role_key TEXT, p_entity_id TEXT, p_currency TEXT DEFAULT 'CAD'
)
RETURNS NUMERIC LANGUAGE sql STABLE SET search_path = public AS $$
  SELECT COALESCE(
    (SELECT balance FROM public.accounting_trust_accounts
      WHERE client_id = p_client_id AND role_key = p_role_key
        AND entity_id = p_entity_id AND currency = p_currency
      LIMIT 1), 0);
$$;

GRANT EXECUTE ON FUNCTION public.fn_trust_available_balance(UUID, TEXT, TEXT, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.fn_trust_available_balance(UUID, TEXT, TEXT, TEXT) TO service_role;