-- =====================================================================
-- Phase 1 — Bank Reconciliation Framework
-- Persistent reconciliation sessions over real GL journal lines:
--   session       : one statement reconciliation for a bank account/period
--   statement line : an imported bank line (signed amount)
--   match          : link between a statement line and a journal line
-- =====================================================================

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
  amount       NUMERIC(15,2) NOT NULL,     -- signed: + deposit, - withdrawal
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

CREATE TRIGGER trg_recon_sessions_updated_at
  BEFORE UPDATE ON public.accounting_recon_sessions
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();
