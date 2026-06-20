-- Commission Phase 1: three-axis lifecycle, currency, holds, multi-period,
-- snapshot expansion + immutability, transfer events, invoice extensions.

-- ---------------------------------------------------------------------------
-- Student commission: three-axis lifecycle + currency + holds + periods
-- ---------------------------------------------------------------------------
ALTER TABLE public.upi_commission_students
  ADD COLUMN IF NOT EXISTS eligibility_status text DEFAULT 'pending'
    CHECK (eligibility_status IN ('pending', 'eligible', 'ineligible', 'cancelled')),
  ADD COLUMN IF NOT EXISTS claim_status text DEFAULT 'not_ready'
    CHECK (claim_status IN ('not_ready', 'ready', 'submitted', 'approved', 'rejected', 'carried_forward')),
  ADD COLUMN IF NOT EXISTS payment_status text DEFAULT 'unpaid'
    CHECK (payment_status IN ('unpaid', 'partially_paid', 'paid', 'written_off')),
  ADD COLUMN IF NOT EXISTS expected_amount numeric(14,2),
  ADD COLUMN IF NOT EXISTS amended_expected_amount numeric(14,2),
  ADD COLUMN IF NOT EXISTS approved_amount numeric(14,2),
  ADD COLUMN IF NOT EXISTS snapshot_currency text DEFAULT 'CAD',
  ADD COLUMN IF NOT EXISTS invoice_currency text DEFAULT 'CAD',
  ADD COLUMN IF NOT EXISTS receipt_currency text DEFAULT 'CAD',
  ADD COLUMN IF NOT EXISTS base_currency text DEFAULT 'CAD',
  ADD COLUMN IF NOT EXISTS eligibility_date date,
  ADD COLUMN IF NOT EXISTS agreement_version_id uuid
    REFERENCES public.upi_agreement_versions(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS eligibility_config_id uuid
    REFERENCES public.upi_commission_eligibility_configs(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS hold_status text DEFAULT 'none'
    CHECK (hold_status IN ('none', 'active', 'released')),
  ADD COLUMN IF NOT EXISTS hold_reason text
    REFERENCES public.upi_commission_hold_reasons(code) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS hold_notes text,
  ADD COLUMN IF NOT EXISTS expected_claim_date date,
  ADD COLUMN IF NOT EXISTS commission_period_code text DEFAULT 'enrollment'
    REFERENCES public.upi_commission_periods(code) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS commission_period_label text,
  ADD COLUMN IF NOT EXISTS clawback_amount numeric(14,2),
  ADD COLUMN IF NOT EXISTS clawback_status text
    CHECK (clawback_status IS NULL OR clawback_status IN ('none', 'pending', 'applied', 'waived')),
  ADD COLUMN IF NOT EXISTS institution_reference_number text,
  ADD COLUMN IF NOT EXISTS remittance_reference_number text,
  ADD COLUMN IF NOT EXISTS matched_rule_id uuid
    REFERENCES public.upi_commission_rules(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS billing_profile_id uuid
    REFERENCES public.upi_billing_profiles(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_ucs_lifecycle
  ON public.upi_commission_students (institution_id, eligibility_status, claim_status, payment_status);

CREATE INDEX IF NOT EXISTS idx_ucs_period
  ON public.upi_commission_students (institution_id, commission_period_code);

CREATE UNIQUE INDEX IF NOT EXISTS idx_ucs_student_route_period
  ON public.upi_commission_students (
    COALESCE(client_id, id),
    COALESCE(partnership_route_id, '00000000-0000-0000-0000-000000000000'::uuid),
    commission_period_code
  )
  WHERE client_id IS NOT NULL AND commission_period_code IS NOT NULL;

-- Backfill three-axis from legacy commission_status
UPDATE public.upi_commission_students SET
  eligibility_status = CASE
    WHEN commission_status IN ('eligible', 'paid', 'partially_paid') THEN 'eligible'
    WHEN commission_status = 'rejected' THEN 'cancelled'
    WHEN commission_status = 'blocked' THEN 'ineligible'
    ELSE 'pending'
  END,
  claim_status = CASE
    WHEN is_carried_forward OR commission_status = 'carried_forward' THEN 'carried_forward'
    WHEN commission_status IN ('eligible', 'paid', 'partially_paid') THEN 'ready'
    ELSE 'not_ready'
  END,
  payment_status = CASE
    WHEN commission_status = 'paid' THEN 'paid'
    WHEN commission_status = 'partially_paid' THEN 'partially_paid'
    ELSE 'unpaid'
  END,
  expected_amount = COALESCE(expected_amount, commission_amount),
  snapshot_currency = COALESCE(snapshot_currency, tuition_currency, 'CAD'),
  invoice_currency = COALESCE(invoice_currency, tuition_currency, 'CAD'),
  receipt_currency = COALESCE(receipt_currency, tuition_currency, 'CAD'),
  base_currency = COALESCE(base_currency, tuition_currency, 'CAD')
WHERE eligibility_status IS NULL OR eligibility_status = 'pending';

-- Sync legacy commission_status from three-axis (for existing UI)
CREATE OR REPLACE FUNCTION public.sync_ucs_legacy_commission_status()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.commission_status := CASE
    WHEN NEW.payment_status = 'paid' THEN 'paid'
    WHEN NEW.payment_status = 'partially_paid' THEN 'partially_paid'
    WHEN NEW.claim_status = 'carried_forward' THEN 'carried_forward'
    WHEN NEW.eligibility_status = 'cancelled' OR NEW.eligibility_status = 'ineligible' THEN 'blocked'
    WHEN NEW.eligibility_status = 'eligible' THEN 'eligible'
    ELSE 'pending'
  END;
  NEW.commission_amount := COALESCE(NEW.amended_expected_amount, NEW.expected_amount, NEW.commission_amount);
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_sync_ucs_legacy_status ON public.upi_commission_students;
CREATE TRIGGER trg_sync_ucs_legacy_status
  BEFORE INSERT OR UPDATE OF eligibility_status, claim_status, payment_status,
    expected_amount, amended_expected_amount ON public.upi_commission_students
  FOR EACH ROW EXECUTE FUNCTION public.sync_ucs_legacy_commission_status();

-- ---------------------------------------------------------------------------
-- Snapshot expansion (immutable audit record)
-- ---------------------------------------------------------------------------
ALTER TABLE public.upi_commission_snapshots
  ADD COLUMN IF NOT EXISTS student_commission_id uuid
    REFERENCES public.upi_commission_students(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS agreement_version_id uuid
    REFERENCES public.upi_agreement_versions(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS matched_rule_id uuid
    REFERENCES public.upi_commission_rules(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS country text,
  ADD COLUMN IF NOT EXISTS campus text,
  ADD COLUMN IF NOT EXISTS program_name text,
  ADD COLUMN IF NOT EXISTS program_category text,
  ADD COLUMN IF NOT EXISTS intake_term text,
  ADD COLUMN IF NOT EXISTS expected_amount numeric(14,2),
  ADD COLUMN IF NOT EXISTS eligibility_date date,
  ADD COLUMN IF NOT EXISTS snapshot_payload jsonb NOT NULL DEFAULT '{}';

CREATE OR REPLACE FUNCTION public.block_commission_snapshot_mutation()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  RAISE EXCEPTION 'upi_commission_snapshots are immutable';
END;
$$;

DROP TRIGGER IF EXISTS trg_block_snapshot_update ON public.upi_commission_snapshots;
CREATE TRIGGER trg_block_snapshot_update
  BEFORE UPDATE OR DELETE ON public.upi_commission_snapshots
  FOR EACH ROW EXECUTE FUNCTION public.block_commission_snapshot_mutation();

DROP POLICY IF EXISTS upi_commission_snapshots_confidential_update ON public.upi_commission_snapshots;
DROP POLICY IF EXISTS upi_commission_snapshots_confidential_delete ON public.upi_commission_snapshots;

-- ---------------------------------------------------------------------------
-- Transfer events (never mutate snapshots)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.upi_commission_transfer_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  institution_id uuid NOT NULL REFERENCES public.upi_institutions(id) ON DELETE CASCADE,
  source_student_commission_id uuid NOT NULL
    REFERENCES public.upi_commission_students(id) ON DELETE CASCADE,
  replacement_student_commission_id uuid
    REFERENCES public.upi_commission_students(id) ON DELETE SET NULL,
  from_route_id uuid REFERENCES public.upi_partnership_routes(id) ON DELETE SET NULL,
  to_route_id uuid REFERENCES public.upi_partnership_routes(id) ON DELETE SET NULL,
  from_institution_id uuid REFERENCES public.upi_institutions(id) ON DELETE SET NULL,
  to_institution_id uuid REFERENCES public.upi_institutions(id) ON DELETE SET NULL,
  event_status text NOT NULL DEFAULT 'open'
    CHECK (event_status IN ('open', 'resolved', 'cancelled')),
  outcome text
    CHECK (outcome IS NULL OR outcome IN (
      'unchanged', 'amended', 'cancelled', 'replaced', 'under_review'
    )),
  transfer_reason text,
  notes text,
  initiated_by uuid,
  initiated_at timestamptz NOT NULL DEFAULT now(),
  resolved_at timestamptz,
  metadata jsonb NOT NULL DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_transfer_events_source
  ON public.upi_commission_transfer_events (source_student_commission_id, event_status);

DROP TRIGGER IF EXISTS trg_transfer_events_updated_at ON public.upi_commission_transfer_events;
CREATE TRIGGER trg_transfer_events_updated_at
  BEFORE UPDATE ON public.upi_commission_transfer_events
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

ALTER TABLE public.upi_commission_transfer_events ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS upi_transfer_events_confidential ON public.upi_commission_transfer_events;
CREATE POLICY upi_transfer_events_confidential ON public.upi_commission_transfer_events
  FOR ALL TO authenticated
  USING (public.can_view_upi_confidential(auth.uid()))
  WITH CHECK (public.can_view_upi_confidential(auth.uid()));

-- ---------------------------------------------------------------------------
-- Invoice billing profile + currency + line item period
-- ---------------------------------------------------------------------------
ALTER TABLE public.upi_commission_invoices
  ADD COLUMN IF NOT EXISTS billing_profile_id uuid
    REFERENCES public.upi_billing_profiles(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS invoice_currency text DEFAULT 'CAD',
  ADD COLUMN IF NOT EXISTS receipt_currency text DEFAULT 'CAD',
  ADD COLUMN IF NOT EXISTS base_currency text DEFAULT 'CAD';

ALTER TABLE public.upi_invoice_line_items
  ADD COLUMN IF NOT EXISTS commission_period_code text
    REFERENCES public.upi_commission_periods(code) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS snapshot_id uuid
    REFERENCES public.upi_commission_snapshots(id) ON DELETE SET NULL;
