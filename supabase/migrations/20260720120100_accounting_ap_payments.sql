-- =====================================================================
-- Phase 1 — AP Approval + Partial Payments
-- Adds approval gating + journal contract to AP bills, and an allocation
-- model so one payment can settle multiple bills partially:
--   Payment: DR accounts payable (allocated)
--            CR bank (cash paid)
--            CR TDS payable (withholding, India)
-- =====================================================================

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

UPDATE public.accounting_ap_bills
   SET entity_id = COALESCE(entity_id, entity)
 WHERE entity_id IS NULL;

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

CREATE TRIGGER trg_ap_payments_updated_at
  BEFORE UPDATE ON public.accounting_ap_payments
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();
