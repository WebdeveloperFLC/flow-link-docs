-- =====================================================================
-- Phase 1 — Student Trust Subledger
-- Tracks held student funds per (student/client, trust bucket, entity).
-- Pass-through money is a LIABILITY, never revenue. Every receipt /
-- disbursement / refund writes a subledger entry and updates the running
-- balance; the disbursement guard (next migration) reads this balance.
-- =====================================================================

CREATE TABLE IF NOT EXISTS public.accounting_trust_accounts (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id   UUID NOT NULL,                -- CRM client (source of truth)
  student_id  UUID,                         -- reserved for future commission integration
  entity_id   TEXT NOT NULL,
  branch_id   TEXT NOT NULL,
  role_key    TEXT NOT NULL,                -- trust bucket role (TRUST_TUITION, ...)
  currency    TEXT NOT NULL DEFAULT 'CAD',
  balance     NUMERIC(15,2) NOT NULL DEFAULT 0,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (client_id, role_key, entity_id, currency)
);

CREATE TABLE IF NOT EXISTS public.accounting_trust_entries (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  trust_account_id UUID NOT NULL REFERENCES public.accounting_trust_accounts(id) ON DELETE RESTRICT,
  entry_type       TEXT NOT NULL CHECK (entry_type IN ('RECEIPT','DISBURSEMENT','REFUND','ADJUSTMENT','REVERSAL')),
  amount           NUMERIC(15,2) NOT NULL,  -- signed: + increases held funds, - reduces
  currency         TEXT NOT NULL DEFAULT 'CAD',
  source_module    TEXT NOT NULL,
  source_record_id UUID,
  journal_id       UUID REFERENCES public.accounting_journals(id),
  memo             TEXT,
  created_by       UUID REFERENCES public.profiles(id),
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_trust_acct_client ON public.accounting_trust_accounts(client_id);
CREATE INDEX IF NOT EXISTS idx_trust_acct_entity ON public.accounting_trust_accounts(entity_id);
CREATE INDEX IF NOT EXISTS idx_trust_entry_acct  ON public.accounting_trust_entries(trust_account_id);
CREATE INDEX IF NOT EXISTS idx_trust_entry_src   ON public.accounting_trust_entries(source_module, source_record_id);

-- Maintain running balance on the subledger account.
CREATE OR REPLACE FUNCTION public.fn_trust_entry_apply_balance()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public AS $$
BEGIN
  UPDATE public.accounting_trust_accounts
     SET balance = balance + NEW.amount,
         updated_at = now()
   WHERE id = NEW.trust_account_id;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_trust_entry_apply_balance ON public.accounting_trust_entries;
CREATE TRIGGER trg_trust_entry_apply_balance
  AFTER INSERT ON public.accounting_trust_entries
  FOR EACH ROW EXECUTE FUNCTION public.fn_trust_entry_apply_balance();

ALTER TABLE public.accounting_trust_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.accounting_trust_entries ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "accounting_users_all" ON public.accounting_trust_accounts;
CREATE POLICY "accounting_users_all" ON public.accounting_trust_accounts FOR ALL
  USING (public.is_accounting_user(auth.uid()))
  WITH CHECK (public.is_accounting_user(auth.uid()));

DROP POLICY IF EXISTS "accounting_users_all" ON public.accounting_trust_entries;
CREATE POLICY "accounting_users_all" ON public.accounting_trust_entries FOR ALL
  USING (public.is_accounting_user(auth.uid()))
  WITH CHECK (public.is_accounting_user(auth.uid()));

CREATE TRIGGER trg_trust_accounts_updated_at
  BEFORE UPDATE ON public.accounting_trust_accounts
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();
