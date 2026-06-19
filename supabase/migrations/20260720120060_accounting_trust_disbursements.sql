-- =====================================================================
-- Phase 1 — Student Trust Disbursements + Balance Guard
-- Disbursing held funds clears the trust LIABILITY directly (decision #3:
-- never route pass-through through expense accounts). Decision #6: a guard
-- prevents any disbursement/refund from driving a trust balance negative.
-- Decision #7: attachment_path supports proof of payment.
-- =====================================================================

CREATE TABLE IF NOT EXISTS public.accounting_trust_disbursements (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id       UUID NOT NULL,
  entity_id       TEXT NOT NULL,
  branch_id       TEXT NOT NULL,
  role_key        TEXT NOT NULL,        -- trust bucket being disbursed
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
  -- Reserved nullable references for future commission integration.
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

-- ── Balance guard: forbid negative trust balances ────────────────────
CREATE OR REPLACE FUNCTION public.fn_trust_entry_balance_guard()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public AS $$
DECLARE
  v_balance NUMERIC(15,2);
BEGIN
  SELECT balance INTO v_balance
    FROM public.accounting_trust_accounts
   WHERE id = NEW.trust_account_id
   FOR UPDATE;

  IF v_balance IS NULL THEN
    RAISE EXCEPTION 'Trust account % not found.', NEW.trust_account_id;
  END IF;

  IF (v_balance + NEW.amount) < 0 THEN
    RAISE EXCEPTION
      'Trust disbursement exceeds available student funds. Available: %, requested change: %.',
      v_balance, NEW.amount;
  END IF;

  RETURN NEW;
END;
$$;

-- Runs BEFORE the balance-apply trigger (alphabetical order: aa_ prefix).
DROP TRIGGER IF EXISTS trg_aa_trust_entry_balance_guard ON public.accounting_trust_entries;
CREATE TRIGGER trg_aa_trust_entry_balance_guard
  BEFORE INSERT ON public.accounting_trust_entries
  FOR EACH ROW EXECUTE FUNCTION public.fn_trust_entry_balance_guard();

ALTER TABLE public.accounting_trust_disbursements ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "accounting_users_all" ON public.accounting_trust_disbursements;
CREATE POLICY "accounting_users_all" ON public.accounting_trust_disbursements FOR ALL
  USING (public.is_accounting_user(auth.uid()))
  WITH CHECK (public.is_accounting_user(auth.uid()));

CREATE TRIGGER trg_trust_disb_updated_at
  BEFORE UPDATE ON public.accounting_trust_disbursements
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();
