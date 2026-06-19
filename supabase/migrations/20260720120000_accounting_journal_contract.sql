-- =====================================================================
-- Phase 1 — Journal Contract
-- Adds the mandatory journal posting contract to the central ledger:
--   entity_id, branch_id, currency, source_module, source_record_id,
--   created_by (exists), posting_date, reversal links, attachment,
--   and nullable commission references reserved for future integration.
-- entity_id / branch_id are TEXT to match the existing system
-- (accounting_coa.entity_id TEXT and app entity ids like 'e-flc-india').
-- =====================================================================

-- ── accounting_journals ──────────────────────────────────────────────
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
  -- Reserved nullable references for future commission integration (Phase 2+).
  ADD COLUMN IF NOT EXISTS student_id            UUID,
  ADD COLUMN IF NOT EXISTS application_id        UUID,
  ADD COLUMN IF NOT EXISTS institution_id        UUID,
  ADD COLUMN IF NOT EXISTS aggregator_id         UUID;

-- Backfill contract columns from legacy fields.
UPDATE public.accounting_journals
   SET posting_date = COALESCE(posting_date, entry_date)
 WHERE posting_date IS NULL;

UPDATE public.accounting_journals
   SET entity_id = COALESCE(entity_id, entity)
 WHERE entity_id IS NULL;

UPDATE public.accounting_journals
   SET source_module = COALESCE(NULLIF(source_module, ''), source_type, 'MANUAL')
 WHERE source_module IS NULL OR source_module = '';

-- ── accounting_journal_lines ─────────────────────────────────────────
ALTER TABLE public.accounting_journal_lines
  ADD COLUMN IF NOT EXISTS entity_id    TEXT,
  ADD COLUMN IF NOT EXISTS branch_id    TEXT,
  ADD COLUMN IF NOT EXISTS account_role TEXT;

-- ── Indexes for reporting / lookups ──────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_journals_entity_id      ON public.accounting_journals(entity_id);
CREATE INDEX IF NOT EXISTS idx_journals_branch_id      ON public.accounting_journals(branch_id);
CREATE INDEX IF NOT EXISTS idx_journals_source         ON public.accounting_journals(source_module, source_record_id);
CREATE INDEX IF NOT EXISTS idx_journals_posting_date   ON public.accounting_journals(posting_date);
CREATE INDEX IF NOT EXISTS idx_journals_reversal_of    ON public.accounting_journals(reversal_of_journal_id);
CREATE INDEX IF NOT EXISTS idx_journals_student        ON public.accounting_journals(student_id);
CREATE INDEX IF NOT EXISTS idx_jlines_entity_id        ON public.accounting_journal_lines(entity_id);
CREATE INDEX IF NOT EXISTS idx_jlines_branch_id        ON public.accounting_journal_lines(branch_id);

COMMENT ON COLUMN public.accounting_journals.source_module IS
  'Originating workspace: MANUAL | CRM_AR | TRUST | AP | PAYROLL | TAX | CLOSE | BANK_RECON';
COMMENT ON COLUMN public.accounting_journals.source_record_id IS
  'PK of the source document that generated this journal (invoice/payment/bill/batch/...).';
COMMENT ON COLUMN public.accounting_journals.reversal_of_journal_id IS
  'When set, this journal reverses the referenced journal. Corrections are reversal-only.';
