-- =====================================================================
-- Phase 1 — Journal Immutability
-- Posted journals are immutable. Corrections are reversal-only.
--   * POSTED journals cannot be deleted.
--   * POSTED journals can only be mutated to record void / reversal links.
--   * Lines of a POSTED journal cannot be inserted/updated/deleted.
-- =====================================================================

CREATE OR REPLACE FUNCTION public.fn_accounting_journal_guard()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public AS $$
BEGIN
  IF (TG_OP = 'DELETE') THEN
    IF OLD.status = 'POSTED' THEN
      RAISE EXCEPTION 'Posted journal % cannot be deleted. Use a reversal entry.', OLD.journal_number;
    END IF;
    RETURN OLD;
  END IF;

  -- UPDATE path
  IF OLD.status = 'POSTED' THEN
    -- Allow only void / reversal-linking metadata changes on a posted journal.
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

    -- Status may only move POSTED -> VOIDED.
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

-- ── Line immutability when parent is POSTED ──────────────────────────
CREATE OR REPLACE FUNCTION public.fn_accounting_journal_line_guard()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public AS $$
DECLARE
  v_status TEXT;
  v_jid    UUID;
BEGIN
  v_jid := COALESCE(NEW.journal_id, OLD.journal_id);
  SELECT status INTO v_status FROM public.accounting_journals WHERE id = v_jid;

  -- Allow cascade deletes when the parent journal is being deleted (not POSTED).
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
