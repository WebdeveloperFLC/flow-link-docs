
-- Student-level commission tracking
CREATE TABLE public.upi_commission_students (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  claim_cycle_id uuid NOT NULL REFERENCES public.upi_claim_cycles(id) ON DELETE CASCADE,
  institution_id uuid REFERENCES public.upi_institutions(id) ON DELETE SET NULL,
  commission_id uuid REFERENCES public.upi_commissions(id) ON DELETE SET NULL,
  client_id uuid,
  student_name text NOT NULL,
  student_email text,
  student_id_at_institution text,
  passport_number text,
  nationality text,
  country_of_origin text,
  program_name text NOT NULL,
  program_level text,
  campus text,
  intake_term text,
  intake_month text,
  intake_year int,
  program_duration text,
  study_permit_number text,
  study_permit_approved_date date,
  study_permit_expiry date,
  cas_issued_date date,
  consent_form_submitted boolean DEFAULT false,
  consent_form_date date,
  consent_form_withdrawn boolean DEFAULT false,
  consent_withdrawal_date date,
  consent_withdrawal_before_sp boolean,
  enrollment_status text DEFAULT 'pending' CHECK (enrollment_status IN ('pending','enrolled','withdrawn','deferred','dismissed','graduated','on_leave')),
  enrollment_confirmed_date date,
  registered_credits int,
  is_full_time boolean DEFAULT true,
  tuition_amount numeric(12,2),
  tuition_currency text DEFAULT 'CAD',
  tuition_paid_amount numeric(12,2),
  tuition_paid_date date,
  tuition_payment_plan boolean DEFAULT false,
  tuition_full_payment_date date,
  commission_status text DEFAULT 'pending' CHECK (commission_status IN ('pending','eligible','blocked','paid','rejected','carried_forward','partially_paid')),
  commission_amount numeric(12,2),
  commission_rate_applied numeric(5,2),
  commission_calculated_date date,
  commission_paid_date date,
  block_reason text CHECK (block_reason IN ('no_consent_form','consent_withdrawn_before_sp','not_full_time','tuition_not_paid','open_studies','duplicate_claim','agency_changed','insufficient_credits','enrollment_not_confirmed','other')),
  block_notes text,
  is_carried_forward boolean DEFAULT false,
  carried_from_cycle_id uuid,
  carry_forward_reason text,
  carry_forward_to_cycle_id uuid,
  invoice_id uuid,
  submitted_by_agency_date date,
  validated_by_institution_date date,
  institution_validation_notes text,
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX idx_ucs_cycle ON public.upi_commission_students(claim_cycle_id);
CREATE INDEX idx_ucs_inst ON public.upi_commission_students(institution_id);
CREATE INDEX idx_ucs_status ON public.upi_commission_students(commission_status);
CREATE INDEX idx_ucs_invoice ON public.upi_commission_students(invoice_id);

CREATE TABLE public.upi_commission_invoices (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  institution_id uuid REFERENCES public.upi_institutions(id) ON DELETE SET NULL,
  claim_cycle_id uuid REFERENCES public.upi_claim_cycles(id) ON DELETE SET NULL,
  commission_id uuid REFERENCES public.upi_commissions(id) ON DELETE SET NULL,
  invoice_number text NOT NULL UNIQUE,
  invoice_date date NOT NULL,
  due_date date,
  agency_name text DEFAULT 'Future Link Consultants Inc.',
  agency_address text DEFAULT '5 Vandorf Street, Toronto, Ontario, Canada M1B 4Y3',
  agency_phone text DEFAULT '+1 416 902 4524',
  agency_email text DEFAULT 'overseasrelations@futurelinkconsultants.com',
  agency_gst_hst_number text,
  institution_name text,
  institution_address text,
  institution_contact text,
  institution_email text,
  subtotal numeric(12,2) NOT NULL DEFAULT 0,
  tax_amount numeric(10,2) DEFAULT 0,
  tax_type text,
  total_amount numeric(12,2) NOT NULL DEFAULT 0,
  currency text DEFAULT 'CAD',
  total_students int DEFAULT 0,
  eligible_students int DEFAULT 0,
  status text DEFAULT 'draft' CHECK (status IN ('draft','sent','submitted','approved','paid','partially_paid','overdue','disputed','cancelled')),
  payment_method text,
  payment_reference text,
  payment_received_date date,
  payment_received_amount numeric(12,2),
  submitted_date date,
  approved_date date,
  paid_date date,
  overdue_since date,
  notes text,
  internal_notes text,
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX idx_uci_inst_cycle ON public.upi_commission_invoices(institution_id, claim_cycle_id);

CREATE TABLE public.upi_invoice_line_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_id uuid NOT NULL REFERENCES public.upi_commission_invoices(id) ON DELETE CASCADE,
  student_id uuid REFERENCES public.upi_commission_students(id) ON DELETE SET NULL,
  description text NOT NULL,
  student_name text,
  program_name text,
  intake_term text,
  tuition_amount numeric(12,2),
  commission_rate numeric(5,2),
  line_amount numeric(12,2) NOT NULL,
  notes text,
  sort_order int DEFAULT 0
);

CREATE INDEX idx_uili_invoice ON public.upi_invoice_line_items(invoice_id);

ALTER TABLE public.upi_commission_students ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.upi_commission_invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.upi_invoice_line_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "auth_all_ucs" ON public.upi_commission_students FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "auth_all_uci" ON public.upi_commission_invoices FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "auth_all_uili" ON public.upi_invoice_line_items FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE TRIGGER trg_ucs_updated_at BEFORE UPDATE ON public.upi_commission_students FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();
CREATE TRIGGER trg_uci_updated_at BEFORE UPDATE ON public.upi_commission_invoices FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();
