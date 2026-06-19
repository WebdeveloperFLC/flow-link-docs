-- =====================================================================
-- Phase 1 — Payroll Accounting
-- Bridges HR payouts into the GL. A batch accrues then pays:
--   Accrual: DR salary & employer-cost expenses
--            CR deduction payables (CPP/EI/Tax | PF/ESIC/PT/TDS)
--            CR net payroll payable
--   Payment: DR net payroll payable  CR bank
-- Posting components (role_key + dr_cr + amount) drive the engine so
-- multi-country deductions stay declarative. Attachment per decision #7.
-- =====================================================================

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
  status              TEXT NOT NULL DEFAULT 'DRAFT'
                        CHECK (status IN ('DRAFT','ACCRUED','PAID','VOIDED')),
  accrual_journal_id  UUID REFERENCES public.accounting_journals(id),
  payment_journal_id  UUID REFERENCES public.accounting_journals(id),
  source_payout_id    UUID,                 -- optional link to HR accounting_payouts
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

-- Batch-level posting legs (role -> dr/cr -> amount) that build the accrual.
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

CREATE TRIGGER trg_payroll_batches_updated_at
  BEFORE UPDATE ON public.accounting_payroll_batches
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();
