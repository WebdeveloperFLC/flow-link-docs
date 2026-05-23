
-- ============================================================
-- 1. EXTEND client_invoices (additive only)
-- ============================================================

ALTER TABLE public.client_invoices
  ADD COLUMN IF NOT EXISTS branch_id uuid REFERENCES public.branches(id),
  ADD COLUMN IF NOT EXISTS department_id uuid REFERENCES public.departments(id),
  ADD COLUMN IF NOT EXISTS firm_entity_id uuid REFERENCES public.firm_profile(id),
  ADD COLUMN IF NOT EXISTS assigned_counselor_id uuid,
  ADD COLUMN IF NOT EXISTS assigned_accounts_user_id uuid,
  ADD COLUMN IF NOT EXISTS invoice_category text,
  ADD COLUMN IF NOT EXISTS invoice_stage text,
  ADD COLUMN IF NOT EXISTS invoice_locked boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS invoice_locked_by uuid,
  ADD COLUMN IF NOT EXISTS invoice_locked_at timestamptz,
  ADD COLUMN IF NOT EXISTS invoice_sent_at timestamptz,
  ADD COLUMN IF NOT EXISTS invoice_viewed_at timestamptz,
  ADD COLUMN IF NOT EXISTS invoice_reminder_last_sent_at timestamptz,
  ADD COLUMN IF NOT EXISTS invoice_reminder_locked_until timestamptz,
  ADD COLUMN IF NOT EXISTS payment_posted_by uuid,
  ADD COLUMN IF NOT EXISTS receipt_generated_by uuid,
  ADD COLUMN IF NOT EXISTS receipt_generated_at timestamptz,
  ADD COLUMN IF NOT EXISTS fx_snapshot_date date,
  ADD COLUMN IF NOT EXISTS fx_rate_to_inr numeric,
  ADD COLUMN IF NOT EXISTS fx_rate_to_cad numeric,
  ADD COLUMN IF NOT EXISTS fx_rate_to_usd numeric,
  ADD COLUMN IF NOT EXISTS fx_provider text,
  ADD COLUMN IF NOT EXISTS fx_manual_override boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS fx_locked boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS subtotal_in_inr numeric,
  ADD COLUMN IF NOT EXISTS subtotal_in_cad numeric,
  ADD COLUMN IF NOT EXISTS subtotal_in_usd numeric,
  ADD COLUMN IF NOT EXISTS amount_paid numeric DEFAULT 0,
  ADD COLUMN IF NOT EXISTS amount_paid_in_inr numeric DEFAULT 0,
  ADD COLUMN IF NOT EXISTS amount_paid_in_cad numeric DEFAULT 0,
  ADD COLUMN IF NOT EXISTS amount_paid_in_usd numeric DEFAULT 0,
  ADD COLUMN IF NOT EXISTS balance_due_in_inr numeric,
  ADD COLUMN IF NOT EXISTS balance_due_in_cad numeric,
  ADD COLUMN IF NOT EXISTS balance_due_in_usd numeric,
  ADD COLUMN IF NOT EXISTS foreign_payment_due_currency text,
  ADD COLUMN IF NOT EXISTS foreign_payment_due_amount numeric,
  ADD COLUMN IF NOT EXISTS foreign_payment_status text,
  ADD COLUMN IF NOT EXISTS reminder_lock_status text,
  ADD COLUMN IF NOT EXISTS external_request_sent_today boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS payment_processing_lock boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS payment_processing_lock_by uuid,
  ADD COLUMN IF NOT EXISTS payment_processing_lock_at timestamptz,
  ADD COLUMN IF NOT EXISTS receipt_prefix text,
  ADD COLUMN IF NOT EXISTS receipt_sequence integer,
  ADD COLUMN IF NOT EXISTS followed_up_by uuid,
  ADD COLUMN IF NOT EXISTS collected_by uuid,
  ADD COLUMN IF NOT EXISTS converted_by uuid,
  ADD COLUMN IF NOT EXISTS invoice_prefix text,
  ADD COLUMN IF NOT EXISTS invoice_sequence integer,
  ADD COLUMN IF NOT EXISTS invoice_year integer,
  ADD COLUMN IF NOT EXISTS invoice_branch_code text,
  ADD COLUMN IF NOT EXISTS invoice_entity_code text,
  ADD COLUMN IF NOT EXISTS invoice_number_generated boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS payment_allocations jsonb DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS due_schedule jsonb DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS escalation_level integer DEFAULT 0,
  ADD COLUMN IF NOT EXISTS escalation_locked boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS archived_at timestamptz,
  ADD COLUMN IF NOT EXISTS archived_by uuid,
  ADD COLUMN IF NOT EXISTS bank_reconciled boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS bank_reconciled_by uuid,
  ADD COLUMN IF NOT EXISTS bank_reconciled_at timestamptz,
  ADD COLUMN IF NOT EXISTS bank_reconciliation_ref text,
  ADD COLUMN IF NOT EXISTS immutable_after_paid boolean DEFAULT true,
  ADD COLUMN IF NOT EXISTS invoice_locked_for_edit boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS invoice_snapshot_jsonb jsonb,
  ADD COLUMN IF NOT EXISTS invoice_snapshot_taken_at timestamptz,
  ADD COLUMN IF NOT EXISTS invoice_snapshot_version integer DEFAULT 0;

-- Replace status check with full list
ALTER TABLE public.client_invoices DROP CONSTRAINT IF EXISTS client_invoices_status_check;
ALTER TABLE public.client_invoices
  ADD CONSTRAINT client_invoices_status_check
  CHECK (status = ANY (ARRAY[
    'draft','sent','viewed','pending_payment','partially_paid','paid','overdue','cancelled','refunded'
  ]));

CREATE INDEX IF NOT EXISTS idx_client_invoices_client_active
  ON public.client_invoices(client_id) WHERE archived_at IS NULL;

-- ============================================================
-- 2. NUMBERING SEQUENCES + GENERATORS
-- ============================================================

CREATE TABLE IF NOT EXISTS public.invoice_number_sequences (
  year integer NOT NULL,
  entity_code text NOT NULL DEFAULT 'FLC',
  branch_code text NOT NULL DEFAULT 'GEN',
  last_number integer NOT NULL DEFAULT 0,
  PRIMARY KEY (year, entity_code, branch_code)
);
ALTER TABLE public.invoice_number_sequences ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS ins_seq_read ON public.invoice_number_sequences;
CREATE POLICY ins_seq_read ON public.invoice_number_sequences FOR SELECT TO authenticated USING (true);

CREATE TABLE IF NOT EXISTS public.receipt_number_sequences (
  year integer NOT NULL,
  entity_code text NOT NULL DEFAULT 'FLC',
  branch_code text NOT NULL DEFAULT 'GEN',
  last_number integer NOT NULL DEFAULT 0,
  PRIMARY KEY (year, entity_code, branch_code)
);
ALTER TABLE public.receipt_number_sequences ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS rcpt_seq_read ON public.receipt_number_sequences;
CREATE POLICY rcpt_seq_read ON public.receipt_number_sequences FOR SELECT TO authenticated USING (true);

CREATE OR REPLACE FUNCTION public.generate_invoice_number(p_entity_code text, p_branch_code text)
RETURNS text LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_year int := EXTRACT(YEAR FROM now())::int;
        v_next int;
        v_entity text := COALESCE(NULLIF(p_entity_code,''), 'FLC');
        v_branch text := COALESCE(NULLIF(p_branch_code,''), 'GEN');
BEGIN
  INSERT INTO public.invoice_number_sequences (year, entity_code, branch_code, last_number)
  VALUES (v_year, v_entity, v_branch, 1)
  ON CONFLICT (year, entity_code, branch_code) DO UPDATE
    SET last_number = public.invoice_number_sequences.last_number + 1
  RETURNING last_number INTO v_next;
  RETURN 'FLC-' || v_entity || '-' || v_branch || '-' || v_year::text || '-' || LPAD(v_next::text, 4, '0');
END $$;

CREATE OR REPLACE FUNCTION public.generate_receipt_number(p_entity_code text, p_branch_code text)
RETURNS text LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_year int := EXTRACT(YEAR FROM now())::int;
        v_next int;
        v_entity text := COALESCE(NULLIF(p_entity_code,''), 'FLC');
        v_branch text := COALESCE(NULLIF(p_branch_code,''), 'GEN');
BEGIN
  INSERT INTO public.receipt_number_sequences (year, entity_code, branch_code, last_number)
  VALUES (v_year, v_entity, v_branch, 1)
  ON CONFLICT (year, entity_code, branch_code) DO UPDATE
    SET last_number = public.receipt_number_sequences.last_number + 1
  RETURNING last_number INTO v_next;
  RETURN 'RCPT-' || v_entity || '-' || v_branch || '-' || v_year::text || '-' || LPAD(v_next::text, 4, '0');
END $$;

-- Auto-assign invoice number on insert if missing/blank
CREATE OR REPLACE FUNCTION public.fn_assign_invoice_number()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.invoice_number IS NULL OR NEW.invoice_number = '' OR NEW.invoice_number ~ '^TEMP' THEN
    NEW.invoice_number := public.generate_invoice_number(NEW.invoice_entity_code, NEW.invoice_branch_code);
    NEW.invoice_number_generated := true;
    NEW.invoice_year := EXTRACT(YEAR FROM now())::int;
  END IF;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trg_assign_invoice_number ON public.client_invoices;
CREATE TRIGGER trg_assign_invoice_number
  BEFORE INSERT ON public.client_invoices
  FOR EACH ROW EXECUTE FUNCTION public.fn_assign_invoice_number();

-- ============================================================
-- 3. NEW TABLES
-- ============================================================

-- 3a. payments
CREATE TABLE IF NOT EXISTS public.client_invoice_payments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_id uuid NOT NULL REFERENCES public.client_invoices(id) ON DELETE CASCADE,
  client_id uuid NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  paid_at timestamptz NOT NULL DEFAULT now(),
  method text NOT NULL CHECK (method IN ('cash','bank_transfer','card','upi','etransfer','cheque','wallet','referral_credits','points')),
  currency text NOT NULL DEFAULT 'INR',
  amount numeric NOT NULL CHECK (amount >= 0),
  amount_in_inr numeric,
  amount_in_cad numeric,
  amount_in_usd numeric,
  fx_rate numeric,
  reference text,
  notes text,
  posted_by uuid,
  is_refund boolean DEFAULT false,
  payer_person_id uuid,
  payer_type text,
  payment_proof_file_id uuid,
  payment_proof_status text DEFAULT 'pending',
  verified_by uuid,
  verified_at timestamptz,
  split_group_id uuid,
  archived_at timestamptz,
  archived_by uuid,
  bank_reconciled boolean DEFAULT false,
  bank_reconciled_by uuid,
  bank_reconciled_at timestamptz,
  bank_reconciliation_ref text,
  refund_request_id uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.client_invoice_payments ENABLE ROW LEVEL SECURITY;
CREATE INDEX IF NOT EXISTS idx_cip_invoice ON public.client_invoice_payments(invoice_id) WHERE archived_at IS NULL;

DROP POLICY IF EXISTS cip_view ON public.client_invoice_payments;
CREATE POLICY cip_view ON public.client_invoice_payments FOR SELECT
  USING (public.is_portal_user_for(auth.uid(), client_id) OR public.can_view_client(auth.uid(), client_id));

DROP POLICY IF EXISTS cip_insert ON public.client_invoice_payments;
CREATE POLICY cip_insert ON public.client_invoice_payments FOR INSERT TO authenticated
  WITH CHECK (
    (public.is_accounting_user(auth.uid()) OR public.has_role(auth.uid(),'admin'::app_role))
    AND public.can_view_client(auth.uid(), client_id)
  );

DROP POLICY IF EXISTS cip_update ON public.client_invoice_payments;
CREATE POLICY cip_update ON public.client_invoice_payments FOR UPDATE TO authenticated
  USING (public.is_accounting_user(auth.uid()) OR public.has_role(auth.uid(),'admin'::app_role))
  WITH CHECK (public.is_accounting_user(auth.uid()) OR public.has_role(auth.uid(),'admin'::app_role));

DROP TRIGGER IF EXISTS trg_cip_touch ON public.client_invoice_payments;
CREATE TRIGGER trg_cip_touch BEFORE UPDATE ON public.client_invoice_payments
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- 3b. allocations
CREATE TABLE IF NOT EXISTS public.client_invoice_payment_allocations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  payment_id uuid NOT NULL REFERENCES public.client_invoice_payments(id) ON DELETE CASCADE,
  invoice_id uuid NOT NULL REFERENCES public.client_invoices(id) ON DELETE CASCADE,
  line_item_key text,
  service_id uuid,
  installment_id uuid,
  amount_allocated numeric NOT NULL CHECK (amount_allocated >= 0),
  amount_in_inr numeric,
  amount_in_cad numeric,
  amount_in_usd numeric,
  allocated_at timestamptz NOT NULL DEFAULT now(),
  allocated_by uuid
);
ALTER TABLE public.client_invoice_payment_allocations ENABLE ROW LEVEL SECURITY;
CREATE INDEX IF NOT EXISTS idx_cipa_invoice ON public.client_invoice_payment_allocations(invoice_id);
CREATE INDEX IF NOT EXISTS idx_cipa_payment ON public.client_invoice_payment_allocations(payment_id);

DROP POLICY IF EXISTS cipa_view ON public.client_invoice_payment_allocations;
CREATE POLICY cipa_view ON public.client_invoice_payment_allocations FOR SELECT
  USING (EXISTS (SELECT 1 FROM public.client_invoices i WHERE i.id = invoice_id
    AND (public.is_portal_user_for(auth.uid(), i.client_id) OR public.can_view_client(auth.uid(), i.client_id))));

DROP POLICY IF EXISTS cipa_write ON public.client_invoice_payment_allocations;
CREATE POLICY cipa_write ON public.client_invoice_payment_allocations FOR ALL TO authenticated
  USING (public.is_accounting_user(auth.uid()) OR public.has_role(auth.uid(),'admin'::app_role))
  WITH CHECK (public.is_accounting_user(auth.uid()) OR public.has_role(auth.uid(),'admin'::app_role));

-- 3c. installments
CREATE TABLE IF NOT EXISTS public.client_invoice_installments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_id uuid NOT NULL REFERENCES public.client_invoices(id) ON DELETE CASCADE,
  installment_number integer NOT NULL,
  installment_label text,
  installment_due_date date,
  installment_amount numeric NOT NULL DEFAULT 0,
  currency text NOT NULL DEFAULT 'INR',
  amount_in_inr numeric,
  amount_in_cad numeric,
  amount_in_usd numeric,
  installment_status text NOT NULL DEFAULT 'pending' CHECK (installment_status IN ('pending','partially_paid','paid','waived','overdue')),
  paid_amount numeric DEFAULT 0,
  paid_at timestamptz,
  fee_category text,
  archived_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.client_invoice_installments ENABLE ROW LEVEL SECURITY;
CREATE INDEX IF NOT EXISTS idx_cii_invoice ON public.client_invoice_installments(invoice_id) WHERE archived_at IS NULL;

DROP POLICY IF EXISTS cii_view ON public.client_invoice_installments;
CREATE POLICY cii_view ON public.client_invoice_installments FOR SELECT
  USING (EXISTS (SELECT 1 FROM public.client_invoices i WHERE i.id = invoice_id
    AND (public.is_portal_user_for(auth.uid(), i.client_id) OR public.can_view_client(auth.uid(), i.client_id))));

DROP POLICY IF EXISTS cii_write ON public.client_invoice_installments;
CREATE POLICY cii_write ON public.client_invoice_installments FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.client_invoices i WHERE i.id = invoice_id AND public.can_edit_client(auth.uid(), i.client_id)))
  WITH CHECK (EXISTS (SELECT 1 FROM public.client_invoices i WHERE i.id = invoice_id AND public.can_edit_client(auth.uid(), i.client_id)));

DROP TRIGGER IF EXISTS trg_cii_touch ON public.client_invoice_installments;
CREATE TRIGGER trg_cii_touch BEFORE UPDATE ON public.client_invoice_installments
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- 3d. receipts
CREATE TABLE IF NOT EXISTS public.client_invoice_receipts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_id uuid NOT NULL REFERENCES public.client_invoices(id) ON DELETE CASCADE,
  payment_id uuid REFERENCES public.client_invoice_payments(id) ON DELETE SET NULL,
  receipt_number text NOT NULL UNIQUE,
  receipt_prefix text,
  receipt_sequence integer,
  firm_entity_id uuid REFERENCES public.firm_profile(id),
  branch_id uuid REFERENCES public.branches(id),
  currency text NOT NULL DEFAULT 'INR',
  amount numeric NOT NULL DEFAULT 0,
  generated_by uuid,
  generated_at timestamptz NOT NULL DEFAULT now(),
  pdf_path text,
  receipt_voided boolean DEFAULT false,
  receipt_voided_by uuid,
  receipt_voided_at timestamptz,
  receipt_void_reason text,
  archived_at timestamptz,
  archived_by uuid,
  receipt_snapshot_jsonb jsonb,
  receipt_snapshot_taken_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.client_invoice_receipts ENABLE ROW LEVEL SECURITY;
CREATE INDEX IF NOT EXISTS idx_cir_invoice ON public.client_invoice_receipts(invoice_id) WHERE archived_at IS NULL;

DROP POLICY IF EXISTS cir_view ON public.client_invoice_receipts;
CREATE POLICY cir_view ON public.client_invoice_receipts FOR SELECT
  USING (EXISTS (SELECT 1 FROM public.client_invoices i WHERE i.id = invoice_id
    AND (public.is_portal_user_for(auth.uid(), i.client_id) OR public.can_view_client(auth.uid(), i.client_id))));

DROP POLICY IF EXISTS cir_write ON public.client_invoice_receipts;
CREATE POLICY cir_write ON public.client_invoice_receipts FOR ALL TO authenticated
  USING (public.is_accounting_user(auth.uid()) OR public.has_role(auth.uid(),'admin'::app_role))
  WITH CHECK (public.is_accounting_user(auth.uid()) OR public.has_role(auth.uid(),'admin'::app_role));

-- 3e. reminders
CREATE TABLE IF NOT EXISTS public.client_invoice_reminders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_id uuid NOT NULL REFERENCES public.client_invoices(id) ON DELETE CASCADE,
  client_id uuid NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  channel text NOT NULL CHECK (channel IN ('whatsapp','email','sms','portal','internal')),
  reminder_status text NOT NULL DEFAULT 'scheduled' CHECK (reminder_status IN ('scheduled','sent','failed','cancelled')),
  scheduled_for timestamptz,
  sent_at timestamptz,
  created_by uuid,
  reminder_created_by uuid,
  locked_by uuid,
  locked_until timestamptz,
  is_external boolean NOT NULL DEFAULT true,
  escalation_level integer DEFAULT 0,
  archived_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.client_invoice_reminders ENABLE ROW LEVEL SECURITY;
CREATE UNIQUE INDEX IF NOT EXISTS uq_invoice_external_reminder_per_day
  ON public.client_invoice_reminders(invoice_id, ((sent_at AT TIME ZONE 'UTC')::date))
  WHERE is_external AND reminder_status = 'sent' AND archived_at IS NULL;

DROP POLICY IF EXISTS cire_view ON public.client_invoice_reminders;
CREATE POLICY cire_view ON public.client_invoice_reminders FOR SELECT
  USING (public.can_view_client(auth.uid(), client_id));

DROP POLICY IF EXISTS cire_write ON public.client_invoice_reminders;
CREATE POLICY cire_write ON public.client_invoice_reminders FOR ALL TO authenticated
  USING (public.can_edit_client(auth.uid(), client_id))
  WITH CHECK (public.can_edit_client(auth.uid(), client_id));

-- 3f. refund requests
CREATE TABLE IF NOT EXISTS public.client_invoice_refund_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_id uuid NOT NULL REFERENCES public.client_invoices(id) ON DELETE CASCADE,
  payment_id uuid REFERENCES public.client_invoice_payments(id) ON DELETE SET NULL,
  client_id uuid NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  amount numeric NOT NULL CHECK (amount > 0),
  currency text NOT NULL DEFAULT 'INR',
  refund_reason text,
  refund_requested_by uuid,
  requested_at timestamptz NOT NULL DEFAULT now(),
  refund_status text NOT NULL DEFAULT 'requested' CHECK (refund_status IN ('requested','approved','rejected','processed')),
  refund_approved_by uuid,
  approved_at timestamptz,
  refund_processed_by uuid,
  refund_processed_at timestamptz,
  processor_reference text,
  archived_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.client_invoice_refund_requests ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS cirr_view ON public.client_invoice_refund_requests;
CREATE POLICY cirr_view ON public.client_invoice_refund_requests FOR SELECT
  USING (public.can_view_client(auth.uid(), client_id));

DROP POLICY IF EXISTS cirr_insert ON public.client_invoice_refund_requests;
CREATE POLICY cirr_insert ON public.client_invoice_refund_requests FOR INSERT TO authenticated
  WITH CHECK (public.can_edit_client(auth.uid(), client_id));

DROP POLICY IF EXISTS cirr_update ON public.client_invoice_refund_requests;
CREATE POLICY cirr_update ON public.client_invoice_refund_requests FOR UPDATE TO authenticated
  USING (public.is_accounting_user(auth.uid()) OR public.has_role(auth.uid(),'admin'::app_role))
  WITH CHECK (public.is_accounting_user(auth.uid()) OR public.has_role(auth.uid(),'admin'::app_role));

DROP TRIGGER IF EXISTS trg_cirr_touch ON public.client_invoice_refund_requests;
CREATE TRIGGER trg_cirr_touch BEFORE UPDATE ON public.client_invoice_refund_requests
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- 3g. adjustments
CREATE TABLE IF NOT EXISTS public.client_invoice_adjustments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_id uuid NOT NULL REFERENCES public.client_invoices(id) ON DELETE CASCADE,
  client_id uuid NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  adjustment_type text NOT NULL CHECK (adjustment_type IN ('discount_correction','waiver','goodwill','penalty','fx_adjustment','write_off','other')),
  reason text,
  amount numeric NOT NULL,
  currency text NOT NULL DEFAULT 'INR',
  amount_in_inr numeric,
  amount_in_cad numeric,
  amount_in_usd numeric,
  target_line_item_key text,
  target_installment_id uuid,
  requested_by uuid,
  requested_at timestamptz NOT NULL DEFAULT now(),
  status text NOT NULL DEFAULT 'requested' CHECK (status IN ('requested','approved','rejected','applied','reversed')),
  approved_by uuid,
  approved_at timestamptz,
  applied_by uuid,
  applied_at timestamptz,
  reversed_by uuid,
  reversed_at timestamptz,
  archived_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.client_invoice_adjustments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS cia_view ON public.client_invoice_adjustments;
CREATE POLICY cia_view ON public.client_invoice_adjustments FOR SELECT
  USING (public.can_view_client(auth.uid(), client_id));

DROP POLICY IF EXISTS cia_insert ON public.client_invoice_adjustments;
CREATE POLICY cia_insert ON public.client_invoice_adjustments FOR INSERT TO authenticated
  WITH CHECK (public.can_edit_client(auth.uid(), client_id));

DROP POLICY IF EXISTS cia_update ON public.client_invoice_adjustments;
CREATE POLICY cia_update ON public.client_invoice_adjustments FOR UPDATE TO authenticated
  USING (public.is_accounting_user(auth.uid()) OR public.has_role(auth.uid(),'admin'::app_role))
  WITH CHECK (public.is_accounting_user(auth.uid()) OR public.has_role(auth.uid(),'admin'::app_role));

DROP TRIGGER IF EXISTS trg_cia_touch ON public.client_invoice_adjustments;
CREATE TRIGGER trg_cia_touch BEFORE UPDATE ON public.client_invoice_adjustments
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- 3h. snapshots (append-only history)
CREATE TABLE IF NOT EXISTS public.client_invoice_snapshots (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_id uuid NOT NULL REFERENCES public.client_invoices(id) ON DELETE CASCADE,
  version integer NOT NULL,
  snapshot_jsonb jsonb NOT NULL,
  reason text,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (invoice_id, version)
);
ALTER TABLE public.client_invoice_snapshots ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS cis_view ON public.client_invoice_snapshots;
CREATE POLICY cis_view ON public.client_invoice_snapshots FOR SELECT
  USING (EXISTS (SELECT 1 FROM public.client_invoices i WHERE i.id = invoice_id
    AND public.can_view_client(auth.uid(), i.client_id)));

DROP POLICY IF EXISTS cis_insert ON public.client_invoice_snapshots;
CREATE POLICY cis_insert ON public.client_invoice_snapshots FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM public.client_invoices i WHERE i.id = invoice_id
    AND public.can_edit_client(auth.uid(), i.client_id)));

-- ============================================================
-- 4. TOTALS RECOMPUTE + STATUS ROLL TRIGGER
-- ============================================================

CREATE OR REPLACE FUNCTION public.fn_recompute_invoice_totals()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_inv_id uuid;
        v_total numeric;
        v_paid numeric;
        v_paid_inr numeric;
        v_paid_cad numeric;
        v_paid_usd numeric;
        v_curr text;
        v_status text;
        v_old_status text;
        v_fx_inr numeric;
        v_fx_cad numeric;
        v_fx_usd numeric;
BEGIN
  v_inv_id := COALESCE(NEW.invoice_id, OLD.invoice_id);
  SELECT amount, currency, status,
         COALESCE(fx_rate_to_inr,1), COALESCE(fx_rate_to_cad,1), COALESCE(fx_rate_to_usd,1)
    INTO v_total, v_curr, v_old_status, v_fx_inr, v_fx_cad, v_fx_usd
    FROM public.client_invoices WHERE id = v_inv_id;

  SELECT
    COALESCE(SUM(CASE WHEN is_refund THEN -amount ELSE amount END), 0),
    COALESCE(SUM(CASE WHEN is_refund THEN -COALESCE(amount_in_inr, amount * v_fx_inr) ELSE COALESCE(amount_in_inr, amount * v_fx_inr) END), 0),
    COALESCE(SUM(CASE WHEN is_refund THEN -COALESCE(amount_in_cad, amount * v_fx_cad) ELSE COALESCE(amount_in_cad, amount * v_fx_cad) END), 0),
    COALESCE(SUM(CASE WHEN is_refund THEN -COALESCE(amount_in_usd, amount * v_fx_usd) ELSE COALESCE(amount_in_usd, amount * v_fx_usd) END), 0)
    INTO v_paid, v_paid_inr, v_paid_cad, v_paid_usd
    FROM public.client_invoice_payments
   WHERE invoice_id = v_inv_id AND archived_at IS NULL;

  v_status := v_old_status;
  IF v_old_status NOT IN ('cancelled','refunded') THEN
    IF v_paid <= 0 THEN
      v_status := CASE WHEN v_old_status IN ('draft') THEN 'draft' ELSE COALESCE(v_old_status,'pending_payment') END;
    ELSIF v_paid >= v_total THEN
      v_status := 'paid';
    ELSE
      v_status := 'partially_paid';
    END IF;
  END IF;

  UPDATE public.client_invoices
     SET amount_paid = v_paid,
         amount_paid_in_inr = v_paid_inr,
         amount_paid_in_cad = v_paid_cad,
         amount_paid_in_usd = v_paid_usd,
         balance_due_in_inr = GREATEST((COALESCE(subtotal_in_inr, v_total * v_fx_inr)) - v_paid_inr, 0),
         balance_due_in_cad = GREATEST((COALESCE(subtotal_in_cad, v_total * v_fx_cad)) - v_paid_cad, 0),
         balance_due_in_usd = GREATEST((COALESCE(subtotal_in_usd, v_total * v_fx_usd)) - v_paid_usd, 0),
         status = v_status,
         paid_at = CASE WHEN v_status = 'paid' AND paid_at IS NULL THEN now() ELSE paid_at END,
         invoice_locked_for_edit = CASE WHEN v_status = 'paid' AND immutable_after_paid THEN true ELSE invoice_locked_for_edit END
   WHERE id = v_inv_id;

  RETURN NULL;
END $$;

DROP TRIGGER IF EXISTS trg_cip_recompute ON public.client_invoice_payments;
CREATE TRIGGER trg_cip_recompute
  AFTER INSERT OR UPDATE OR DELETE ON public.client_invoice_payments
  FOR EACH ROW EXECUTE FUNCTION public.fn_recompute_invoice_totals();

-- ============================================================
-- 5. IMMUTABILITY ENFORCEMENT
-- ============================================================

CREATE OR REPLACE FUNCTION public.fn_enforce_invoice_immutability()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF OLD.status = 'paid' AND COALESCE(OLD.immutable_after_paid, true) AND OLD.invoice_locked_for_edit THEN
    IF NEW.line_items::text IS DISTINCT FROM OLD.line_items::text
       OR NEW.amount <> OLD.amount
       OR NEW.currency <> OLD.currency
       OR COALESCE(NEW.firm_entity_id::text,'') <> COALESCE(OLD.firm_entity_id::text,'')
       OR COALESCE(NEW.branch_id::text,'') <> COALESCE(OLD.branch_id::text,'')
       OR COALESCE(NEW.fx_rate_to_inr,0) <> COALESCE(OLD.fx_rate_to_inr,0)
       OR COALESCE(NEW.fx_rate_to_cad,0) <> COALESCE(OLD.fx_rate_to_cad,0)
       OR COALESCE(NEW.fx_rate_to_usd,0) <> COALESCE(OLD.fx_rate_to_usd,0)
    THEN
      RAISE EXCEPTION 'Invoice % is paid and locked. Use client_invoice_adjustments for any change.', OLD.invoice_number
        USING ERRCODE = '23514';
    END IF;
  END IF;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trg_invoice_immutability ON public.client_invoices;
CREATE TRIGGER trg_invoice_immutability
  BEFORE UPDATE ON public.client_invoices
  FOR EACH ROW EXECUTE FUNCTION public.fn_enforce_invoice_immutability();

-- ============================================================
-- 6. SNAPSHOT ON SENT / PAID
-- ============================================================

CREATE OR REPLACE FUNCTION public.fn_take_invoice_snapshot()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_snap jsonb;
        v_take boolean := false;
        v_reason text;
BEGIN
  IF TG_OP = 'INSERT' THEN RETURN NEW; END IF;
  IF OLD.status IS DISTINCT FROM NEW.status THEN
    IF NEW.status = 'sent' AND COALESCE(OLD.status,'') IN ('draft','') THEN
      v_take := true; v_reason := 'first_sent';
    ELSIF NEW.status = 'paid' AND COALESCE(OLD.status,'') <> 'paid' THEN
      v_take := true; v_reason := 'paid';
    END IF;
  END IF;
  IF v_take THEN
    v_snap := to_jsonb(NEW) || jsonb_build_object(
      'installments', COALESCE((SELECT jsonb_agg(to_jsonb(i)) FROM public.client_invoice_installments i WHERE i.invoice_id = NEW.id), '[]'::jsonb),
      'payments', COALESCE((SELECT jsonb_agg(to_jsonb(p)) FROM public.client_invoice_payments p WHERE p.invoice_id = NEW.id), '[]'::jsonb),
      'allocations', COALESCE((SELECT jsonb_agg(to_jsonb(a)) FROM public.client_invoice_payment_allocations a WHERE a.invoice_id = NEW.id), '[]'::jsonb)
    );
    NEW.invoice_snapshot_jsonb := v_snap;
    NEW.invoice_snapshot_taken_at := now();
    NEW.invoice_snapshot_version := COALESCE(OLD.invoice_snapshot_version,0) + 1;
    INSERT INTO public.client_invoice_snapshots(invoice_id, version, snapshot_jsonb, reason, created_by)
    VALUES (NEW.id, NEW.invoice_snapshot_version, v_snap, v_reason, auth.uid());
  END IF;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trg_invoice_snapshot ON public.client_invoices;
CREATE TRIGGER trg_invoice_snapshot
  BEFORE UPDATE ON public.client_invoices
  FOR EACH ROW EXECUTE FUNCTION public.fn_take_invoice_snapshot();

-- Receipt snapshot on insert
CREATE OR REPLACE FUNCTION public.fn_take_receipt_snapshot()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_inv jsonb; v_pay jsonb; v_firm jsonb; v_branch jsonb;
BEGIN
  IF NEW.receipt_snapshot_jsonb IS NOT NULL THEN RETURN NEW; END IF;
  SELECT to_jsonb(i) INTO v_inv FROM public.client_invoices i WHERE i.id = NEW.invoice_id;
  IF NEW.payment_id IS NOT NULL THEN
    SELECT to_jsonb(p) INTO v_pay FROM public.client_invoice_payments p WHERE p.id = NEW.payment_id;
  END IF;
  IF NEW.firm_entity_id IS NOT NULL THEN
    SELECT to_jsonb(f) INTO v_firm FROM public.firm_profile f WHERE f.id = NEW.firm_entity_id;
  END IF;
  IF NEW.branch_id IS NOT NULL THEN
    SELECT to_jsonb(b) INTO v_branch FROM public.branches b WHERE b.id = NEW.branch_id;
  END IF;
  NEW.receipt_snapshot_jsonb := jsonb_build_object(
    'invoice', v_inv, 'payment', v_pay, 'firm', v_firm, 'branch', v_branch,
    'receipt_number', NEW.receipt_number, 'currency', NEW.currency, 'amount', NEW.amount,
    'generated_at', NEW.generated_at
  );
  NEW.receipt_snapshot_taken_at := now();
  -- stamp header
  UPDATE public.client_invoices
     SET receipt_generated_by = NEW.generated_by, receipt_generated_at = NEW.generated_at
   WHERE id = NEW.invoice_id;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trg_receipt_snapshot ON public.client_invoice_receipts;
CREATE TRIGGER trg_receipt_snapshot
  BEFORE INSERT ON public.client_invoice_receipts
  FOR EACH ROW EXECUTE FUNCTION public.fn_take_receipt_snapshot();

-- ============================================================
-- 7. TIMELINE EVENTS
-- ============================================================

CREATE OR REPLACE FUNCTION public.fn_log_invoice_payment_timeline()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.client_timeline(client_id, event_type, actor_id, summary, metadata)
  VALUES (NEW.client_id,
    CASE WHEN NEW.is_refund THEN 'refund_processed' ELSE 'payment_received' END,
    COALESCE(NEW.posted_by, auth.uid()),
    CASE WHEN NEW.is_refund THEN 'Refund posted: ' ELSE 'Payment received: ' END
      || NEW.currency || ' ' || NEW.amount || ' via ' || NEW.method,
    jsonb_build_object('payment_id', NEW.id, 'invoice_id', NEW.invoice_id, 'reference', NEW.reference));
  RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS trg_log_cip ON public.client_invoice_payments;
CREATE TRIGGER trg_log_cip AFTER INSERT ON public.client_invoice_payments
  FOR EACH ROW EXECUTE FUNCTION public.fn_log_invoice_payment_timeline();

CREATE OR REPLACE FUNCTION public.fn_log_invoice_receipt_timeline()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_cid uuid;
BEGIN
  SELECT client_id INTO v_cid FROM public.client_invoices WHERE id = NEW.invoice_id;
  INSERT INTO public.client_timeline(client_id, event_type, actor_id, summary, metadata)
  VALUES (v_cid, 'receipt_generated', COALESCE(NEW.generated_by, auth.uid()),
    'Receipt ' || NEW.receipt_number || ' generated (' || NEW.currency || ' ' || NEW.amount || ')',
    jsonb_build_object('receipt_id', NEW.id, 'invoice_id', NEW.invoice_id));
  RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS trg_log_cir ON public.client_invoice_receipts;
CREATE TRIGGER trg_log_cir AFTER INSERT ON public.client_invoice_receipts
  FOR EACH ROW EXECUTE FUNCTION public.fn_log_invoice_receipt_timeline();

CREATE OR REPLACE FUNCTION public.fn_log_invoice_reminder_timeline()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    INSERT INTO public.client_timeline(client_id, event_type, actor_id, summary, metadata)
    VALUES (NEW.client_id,
      CASE WHEN NEW.reminder_status='sent' THEN 'reminder_sent' ELSE 'reminder_scheduled' END,
      COALESCE(NEW.created_by, auth.uid()),
      'Reminder ' || NEW.channel || ' (' || NEW.reminder_status || ')',
      jsonb_build_object('reminder_id', NEW.id, 'invoice_id', NEW.invoice_id, 'is_external', NEW.is_external));
    -- stamp invoice header for the day-lock
    IF NEW.is_external AND NEW.reminder_status = 'sent' THEN
      UPDATE public.client_invoices
         SET invoice_reminder_last_sent_at = COALESCE(NEW.sent_at, now()),
             external_request_sent_today = true,
             invoice_reminder_locked_until = (date_trunc('day', COALESCE(NEW.sent_at, now())) + interval '1 day')
       WHERE id = NEW.invoice_id;
    END IF;
  END IF;
  RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS trg_log_cire ON public.client_invoice_reminders;
CREATE TRIGGER trg_log_cire AFTER INSERT ON public.client_invoice_reminders
  FOR EACH ROW EXECUTE FUNCTION public.fn_log_invoice_reminder_timeline();

-- ============================================================
-- 8. AGING VIEW
-- ============================================================

CREATE OR REPLACE VIEW public.client_invoice_aging AS
SELECT
  i.id AS invoice_id,
  i.client_id,
  i.invoice_number,
  i.currency,
  i.amount,
  i.amount_paid,
  GREATEST(i.amount - COALESCE(i.amount_paid,0), 0) AS balance_due,
  i.due_date,
  CASE WHEN i.due_date IS NULL THEN 0
       ELSE GREATEST((CURRENT_DATE - i.due_date), 0) END AS days_overdue,
  CASE
    WHEN i.status = 'paid' OR i.due_date IS NULL OR i.due_date >= CURRENT_DATE THEN 'current'
    WHEN (CURRENT_DATE - i.due_date) BETWEEN 1 AND 7 THEN '0-7'
    WHEN (CURRENT_DATE - i.due_date) BETWEEN 8 AND 15 THEN '8-15'
    WHEN (CURRENT_DATE - i.due_date) BETWEEN 16 AND 30 THEN '16-30'
    ELSE '30+'
  END AS aging_bucket,
  i.status,
  i.escalation_level
FROM public.client_invoices i
WHERE i.archived_at IS NULL;

-- ============================================================
-- 9. AUTO-DRAFT RPC
-- ============================================================

CREATE OR REPLACE FUNCTION public.create_invoice_from_services(
  p_client_id uuid,
  p_service_ids uuid[],
  p_branch_id uuid DEFAULT NULL,
  p_firm_entity_id uuid DEFAULT NULL,
  p_currency text DEFAULT 'INR',
  p_installments jsonb DEFAULT NULL,
  p_due_date date DEFAULT NULL
) RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_inv_id uuid;
  v_total numeric := 0;
  v_items jsonb := '[]'::jsonb;
  v_entity_code text;
  v_branch_code text;
  v_inst jsonb;
  v_i jsonb;
  v_n int := 0;
BEGIN
  IF v_uid IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;
  IF NOT public.can_edit_client(v_uid, p_client_id) THEN RAISE EXCEPTION 'Forbidden' USING ERRCODE='42501'; END IF;

  -- Build line items
  IF p_service_ids IS NOT NULL THEN
    SELECT COALESCE(jsonb_agg(jsonb_build_object(
              'service_id', s.id,
              'service_name', s.service_name,
              'description', COALESCE(s.description, s.service_name),
              'quantity', 1,
              'currency', p_currency,
              'amount', COALESCE(s.base_price, 0),
              'discount', 0,
              'tax', 0,
              'total', COALESCE(s.base_price, 0)
           )), '[]'::jsonb),
           COALESCE(SUM(COALESCE(s.base_price,0)),0)
      INTO v_items, v_total
      FROM public.service_catalogue s
     WHERE s.id = ANY(p_service_ids);
  END IF;

  IF p_branch_id IS NOT NULL THEN
    SELECT UPPER(LEFT(REGEXP_REPLACE(name, '[^A-Za-z0-9]', '', 'g'), 3)) INTO v_branch_code
      FROM public.branches WHERE id = p_branch_id;
  END IF;
  v_branch_code := COALESCE(v_branch_code, 'GEN');
  v_entity_code := 'FLC';

  INSERT INTO public.client_invoices (
    client_id, invoice_number, amount, currency, status,
    line_items, due_date, created_by,
    branch_id, firm_entity_id,
    invoice_entity_code, invoice_branch_code, invoice_year,
    fx_snapshot_date, fx_rate_to_inr, fx_rate_to_cad, fx_rate_to_usd, fx_provider,
    subtotal_in_inr, subtotal_in_cad, subtotal_in_usd
  ) VALUES (
    p_client_id,
    'TEMP-' || gen_random_uuid()::text,
    v_total, p_currency, 'draft',
    v_items, p_due_date, v_uid,
    p_branch_id, p_firm_entity_id,
    v_entity_code, v_branch_code, EXTRACT(YEAR FROM now())::int,
    CURRENT_DATE, 1, 1, 1, 'manual',
    v_total, v_total, v_total
  ) RETURNING id INTO v_inv_id;

  -- Installments
  IF p_installments IS NOT NULL AND jsonb_typeof(p_installments) = 'array' THEN
    FOR v_i IN SELECT * FROM jsonb_array_elements(p_installments) LOOP
      v_n := v_n + 1;
      INSERT INTO public.client_invoice_installments(
        invoice_id, installment_number, installment_label, installment_due_date,
        installment_amount, currency, fee_category
      ) VALUES (
        v_inv_id, v_n,
        COALESCE(v_i->>'label','Installment ' || v_n),
        NULLIF(v_i->>'due_date','')::date,
        COALESCE((v_i->>'amount')::numeric, 0),
        COALESCE(v_i->>'currency', p_currency),
        v_i->>'fee_category'
      );
    END LOOP;
  END IF;

  INSERT INTO public.client_timeline(client_id, event_type, actor_id, summary, metadata)
  VALUES (p_client_id, 'invoice_drafted', v_uid,
    'Invoice drafted (' || p_currency || ' ' || v_total || ')',
    jsonb_build_object('invoice_id', v_inv_id));

  RETURN v_inv_id;
END $$;

-- ============================================================
-- 10. PORTAL UPDATE-OWN RIGHTS: allow portal user to set viewed_at
-- (kept additive; existing ci_view/ci_write policies untouched)
-- ============================================================
