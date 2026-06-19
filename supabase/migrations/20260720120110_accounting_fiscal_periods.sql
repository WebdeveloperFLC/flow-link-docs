-- =====================================================================
-- Phase 1 — Fiscal Periods & Month-End Close
-- A period is OPEN, CLOSED (no new postings) or LOCKED (hard frozen).
-- The journal engine cannot post into a CLOSED/LOCKED period for that
-- entity. Close is gated on a balanced trial balance (validated in TS).
-- =====================================================================

CREATE TABLE IF NOT EXISTS public.accounting_fiscal_periods (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_id     TEXT NOT NULL,
  period_label  TEXT NOT NULL,             -- e.g. '2026-06'
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

ALTER TABLE public.accounting_fiscal_periods ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "accounting_users_read" ON public.accounting_fiscal_periods;
CREATE POLICY "accounting_users_read" ON public.accounting_fiscal_periods FOR SELECT
  USING (public.is_accounting_user(auth.uid()));
DROP POLICY IF EXISTS "accounting_admins_write" ON public.accounting_fiscal_periods;
CREATE POLICY "accounting_admins_write" ON public.accounting_fiscal_periods FOR ALL
  USING (public.is_accounting_admin(auth.uid()))
  WITH CHECK (public.is_accounting_admin(auth.uid()));

CREATE TRIGGER trg_fiscal_periods_updated_at
  BEFORE UPDATE ON public.accounting_fiscal_periods
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- ── Period-lock guard on the journal engine ──────────────────────────
CREATE OR REPLACE FUNCTION public.fn_accounting_period_lock_guard()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public AS $$
DECLARE
  v_status TEXT;
  v_date   DATE;
BEGIN
  v_date := COALESCE(NEW.posting_date, NEW.entry_date);
  IF NEW.entity_id IS NULL OR v_date IS NULL THEN
    RETURN NEW;
  END IF;

  SELECT status INTO v_status
    FROM public.accounting_fiscal_periods
   WHERE entity_id = NEW.entity_id
     AND v_date BETWEEN period_start AND period_end
   ORDER BY period_start DESC
   LIMIT 1;

  IF v_status IN ('CLOSED','LOCKED') THEN
    RAISE EXCEPTION 'Period for % on % is %; postings are not allowed.',
      NEW.entity_id, v_date, v_status;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_accounting_period_lock_guard ON public.accounting_journals;
CREATE TRIGGER trg_accounting_period_lock_guard
  BEFORE INSERT OR UPDATE OF posting_date, entry_date, status, entity_id
  ON public.accounting_journals
  FOR EACH ROW EXECUTE FUNCTION public.fn_accounting_period_lock_guard();
