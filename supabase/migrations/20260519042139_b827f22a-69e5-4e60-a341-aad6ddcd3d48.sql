
-- ============================================================
-- STAGE 3: Client Registration
-- ============================================================

-- 1) Sequence + helper for registration numbers (FL-YYYY-NNNN)
CREATE SEQUENCE IF NOT EXISTS public.client_registration_seq START 1;

CREATE OR REPLACE FUNCTION public.generate_client_registration_number()
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_year int := EXTRACT(YEAR FROM now())::int;
  v_next int;
BEGIN
  v_next := nextval('public.client_registration_seq');
  RETURN 'FL-' || v_year::text || '-' || LPAD(v_next::text, 4, '0');
END $$;

-- 2) Extend public.clients (all nullable to preserve legacy rows)
ALTER TABLE public.clients
  ADD COLUMN IF NOT EXISTS registration_number text UNIQUE,
  ADD COLUMN IF NOT EXISTS source_lead_id uuid REFERENCES public.leads(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS converted_at timestamptz,
  ADD COLUMN IF NOT EXISTS first_name text,
  ADD COLUMN IF NOT EXISTS middle_name text,
  ADD COLUMN IF NOT EXISTS last_name text,
  ADD COLUMN IF NOT EXISTS date_of_birth date,
  ADD COLUMN IF NOT EXISTS gender text,
  ADD COLUMN IF NOT EXISTS marital_status text,
  ADD COLUMN IF NOT EXISTS phone_country_code text,
  ADD COLUMN IF NOT EXISTS phone_alternate text,
  ADD COLUMN IF NOT EXISTS email_alternate text,
  ADD COLUMN IF NOT EXISTS country_of_citizenship text,
  ADD COLUMN IF NOT EXISTS country_of_residence text,
  ADD COLUMN IF NOT EXISTS passport_number text,
  ADD COLUMN IF NOT EXISTS passport_expiry date,
  ADD COLUMN IF NOT EXISTS national_id_last4 text,
  ADD COLUMN IF NOT EXISTS pan_number text,
  ADD COLUMN IF NOT EXISTS tax_id text,
  ADD COLUMN IF NOT EXISTS last_education text,
  ADD COLUMN IF NOT EXISTS last_education_other text,
  ADD COLUMN IF NOT EXISTS institution_name text,
  ADD COLUMN IF NOT EXISTS year_of_passing int,
  ADD COLUMN IF NOT EXISTS percentage_cgpa text,
  ADD COLUMN IF NOT EXISTS english_test text,
  ADD COLUMN IF NOT EXISTS english_overall text,
  ADD COLUMN IF NOT EXISTS english_test_date date,
  ADD COLUMN IF NOT EXISTS english_test_expiry date,
  ADD COLUMN IF NOT EXISTS other_tests jsonb NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS branch text,
  ADD COLUMN IF NOT EXISTS department text,
  ADD COLUMN IF NOT EXISTS assigned_counselor_id uuid,
  ADD COLUMN IF NOT EXISTS interested_countries text[] NOT NULL DEFAULT '{}'::text[],
  ADD COLUMN IF NOT EXISTS client_type text,
  ADD COLUMN IF NOT EXISTS billing_entity text,
  ADD COLUMN IF NOT EXISTS payment_terms text,
  ADD COLUMN IF NOT EXISTS workflow_template_id uuid,
  ADD COLUMN IF NOT EXISTS counselor_notes text,
  ADD COLUMN IF NOT EXISTS counselor_notes_locked boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS counselor_notes_locked_at timestamptz,
  ADD COLUMN IF NOT EXISTS counselor_notes_unlock_reason text,
  ADD COLUMN IF NOT EXISTS coaching_services text[] NOT NULL DEFAULT '{}'::text[],
  ADD COLUMN IF NOT EXISTS visa_services text[] NOT NULL DEFAULT '{}'::text[],
  ADD COLUMN IF NOT EXISTS admission_services text[] NOT NULL DEFAULT '{}'::text[],
  ADD COLUMN IF NOT EXISTS allied_services text[] NOT NULL DEFAULT '{}'::text[],
  ADD COLUMN IF NOT EXISTS travel_financial_services text[] NOT NULL DEFAULT '{}'::text[],
  ADD COLUMN IF NOT EXISTS service_fees jsonb NOT NULL DEFAULT '{}'::jsonb;

-- 3) Lead-conversion trigger
CREATE OR REPLACE FUNCTION public.fn_mark_lead_converted_on_client()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.source_lead_id IS NOT NULL
     AND (TG_OP = 'INSERT' OR OLD.source_lead_id IS DISTINCT FROM NEW.source_lead_id) THEN
    UPDATE public.leads
       SET status = 'converted',
           converted_to_client_id = NEW.id,
           converted_at = COALESCE(converted_at, now())
     WHERE id = NEW.source_lead_id;
  END IF;
  IF NEW.registration_number IS NULL THEN
    NEW.registration_number := public.generate_client_registration_number();
  END IF;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trg_mark_lead_converted_on_client ON public.clients;
CREATE TRIGGER trg_mark_lead_converted_on_client
BEFORE INSERT OR UPDATE OF source_lead_id ON public.clients
FOR EACH ROW EXECUTE FUNCTION public.fn_mark_lead_converted_on_client();

-- 4) client_family_members
CREATE TABLE IF NOT EXISTS public.client_family_members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  primary_lead_id uuid REFERENCES public.leads(id) ON DELETE CASCADE,
  primary_client_id uuid REFERENCES public.clients(id) ON DELETE CASCADE,
  relationship text NOT NULL CHECK (relationship IN ('spouse','child','parent','sibling','other')),
  first_name text NOT NULL,
  last_name text NOT NULL,
  date_of_birth date,
  passport_number text,
  passport_expiry date,
  application_mode text NOT NULL DEFAULT 'together'
    CHECK (application_mode IN ('together','separate_later')),
  visa_services text[] NOT NULL DEFAULT '{}'::text[],
  separate_lead_id uuid REFERENCES public.leads(id),
  separate_applied_at timestamptz,
  notes text,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_cfm_primary_client ON public.client_family_members(primary_client_id);
CREATE INDEX IF NOT EXISTS idx_cfm_primary_lead   ON public.client_family_members(primary_lead_id);

ALTER TABLE public.client_family_members ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "cfm select" ON public.client_family_members;
CREATE POLICY "cfm select"
ON public.client_family_members FOR SELECT
TO authenticated
USING (
  has_role(auth.uid(), 'admin'::app_role)
  OR (primary_client_id IS NOT NULL AND public.can_view_client(auth.uid(), primary_client_id))
  OR (primary_lead_id IS NOT NULL AND EXISTS (
      SELECT 1 FROM public.leads l
       WHERE l.id = primary_lead_id
         AND (l.created_by = auth.uid() OR l.assigned_counselor_id = auth.uid())
  ))
  OR has_role(auth.uid(), 'counselor'::app_role)
);

DROP POLICY IF EXISTS "cfm insert" ON public.client_family_members;
CREATE POLICY "cfm insert"
ON public.client_family_members FOR INSERT
TO authenticated
WITH CHECK (
  has_role(auth.uid(), 'admin'::app_role)
  OR has_role(auth.uid(), 'counselor'::app_role)
);

DROP POLICY IF EXISTS "cfm update" ON public.client_family_members;
CREATE POLICY "cfm update"
ON public.client_family_members FOR UPDATE
TO authenticated
USING (
  has_role(auth.uid(), 'admin'::app_role)
  OR has_role(auth.uid(), 'counselor'::app_role)
)
WITH CHECK (
  has_role(auth.uid(), 'admin'::app_role)
  OR has_role(auth.uid(), 'counselor'::app_role)
);

DROP POLICY IF EXISTS "cfm delete" ON public.client_family_members;
CREATE POLICY "cfm delete"
ON public.client_family_members FOR DELETE
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role));

DROP TRIGGER IF EXISTS trg_cfm_updated_at ON public.client_family_members;
CREATE TRIGGER trg_cfm_updated_at
BEFORE UPDATE ON public.client_family_members
FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- 5) Relax accounting_ar_invoices to allow counselors to insert DRAFT
DROP POLICY IF EXISTS "counselors create draft invoices" ON public.accounting_ar_invoices;
CREATE POLICY "counselors create draft invoices"
ON public.accounting_ar_invoices FOR INSERT
TO authenticated
WITH CHECK (
  status = 'DRAFT'
  AND (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'counselor'::app_role))
  AND created_by = auth.uid()
);

DROP POLICY IF EXISTS "counselors read own draft invoices" ON public.accounting_ar_invoices;
CREATE POLICY "counselors read own draft invoices"
ON public.accounting_ar_invoices FOR SELECT
TO authenticated
USING (
  (status = 'DRAFT' AND created_by = auth.uid())
  OR (client_id IS NOT NULL AND public.can_view_client(auth.uid(), client_id)
      AND (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'counselor'::app_role)))
);

-- 6) ar_invoice_line_items
CREATE TABLE IF NOT EXISTS public.ar_invoice_line_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_id uuid NOT NULL REFERENCES public.accounting_ar_invoices(id) ON DELETE CASCADE,
  service_code text REFERENCES public.service_catalogue(service_code),
  service_name text NOT NULL,
  person_type text NOT NULL CHECK (person_type IN ('primary','spouse','dependent','other')),
  person_name text,
  family_member_id uuid REFERENCES public.client_family_members(id) ON DELETE SET NULL,
  quantity numeric NOT NULL DEFAULT 1,
  unit_price numeric NOT NULL,
  discount_amount numeric NOT NULL DEFAULT 0,
  gst_rate numeric NOT NULL DEFAULT 18,
  gst_amount numeric NOT NULL,
  line_total numeric NOT NULL,
  is_complimentary boolean NOT NULL DEFAULT false,
  offer_id uuid REFERENCES public.service_offers(id),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_arili_invoice ON public.ar_invoice_line_items(invoice_id);

ALTER TABLE public.ar_invoice_line_items ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "arili accounting users all" ON public.ar_invoice_line_items;
CREATE POLICY "arili accounting users all"
ON public.ar_invoice_line_items FOR ALL
TO authenticated
USING (is_accounting_user(auth.uid()))
WITH CHECK (is_accounting_user(auth.uid()));

DROP POLICY IF EXISTS "arili counselors select" ON public.ar_invoice_line_items;
CREATE POLICY "arili counselors select"
ON public.ar_invoice_line_items FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.accounting_ar_invoices i
     WHERE i.id = invoice_id
       AND ((i.status = 'DRAFT' AND i.created_by = auth.uid())
            OR (i.client_id IS NOT NULL
                AND public.can_view_client(auth.uid(), i.client_id)
                AND (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'counselor'::app_role))))
  )
);

DROP POLICY IF EXISTS "arili counselors insert draft" ON public.ar_invoice_line_items;
CREATE POLICY "arili counselors insert draft"
ON public.ar_invoice_line_items FOR INSERT
TO authenticated
WITH CHECK (
  (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'counselor'::app_role))
  AND EXISTS (
    SELECT 1 FROM public.accounting_ar_invoices i
     WHERE i.id = invoice_id
       AND i.status = 'DRAFT'
       AND i.created_by = auth.uid()
  )
);

-- 7) RPC: convert a separate-later family member into a new lead
CREATE OR REPLACE FUNCTION public.create_lead_from_family_member(_family_member_id uuid)
RETURNS public.leads
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  uid uuid := auth.uid();
  fam public.client_family_members;
  new_lead public.leads;
BEGIN
  IF uid IS NULL THEN RAISE EXCEPTION 'Not authenticated' USING ERRCODE = '28000'; END IF;
  IF NOT (has_role(uid,'admin'::app_role) OR has_role(uid,'counselor'::app_role)) THEN
    RAISE EXCEPTION 'Forbidden' USING ERRCODE = '42501';
  END IF;

  SELECT * INTO fam FROM public.client_family_members WHERE id = _family_member_id;
  IF fam.id IS NULL THEN RAISE EXCEPTION 'Family member not found'; END IF;
  IF fam.separate_lead_id IS NOT NULL THEN
    SELECT * INTO new_lead FROM public.leads WHERE id = fam.separate_lead_id;
    RETURN new_lead;
  END IF;

  INSERT INTO public.leads (
    lead_type, lead_temperature, status,
    first_name, last_name, notes,
    visa_services, created_by
  ) VALUES (
    'warm', 'warm', 'new',
    fam.first_name, fam.last_name,
    'Created from family member of primary client',
    COALESCE(fam.visa_services, '{}'::text[]),
    uid
  ) RETURNING * INTO new_lead;

  UPDATE public.client_family_members
     SET separate_lead_id = new_lead.id,
         separate_applied_at = now()
   WHERE id = _family_member_id;

  RETURN new_lead;
END $$;
