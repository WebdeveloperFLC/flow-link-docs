-- Lead→Client SSOT: profile journey fields, location preferences, payment/receipt controls.

-- 0) Journey columns on leads/clients (from 20260718120015 — idempotent if that migration was skipped).
ALTER TABLE public.leads
  ADD COLUMN IF NOT EXISTS sponsor text,
  ADD COLUMN IF NOT EXISTS sponsor_other text,
  ADD COLUMN IF NOT EXISTS has_budget text,
  ADD COLUMN IF NOT EXISTS budget_currency text DEFAULT 'INR',
  ADD COLUMN IF NOT EXISTS budget_min numeric,
  ADD COLUMN IF NOT EXISTS budget_max numeric;

ALTER TABLE public.clients
  ADD COLUMN IF NOT EXISTS sponsor text,
  ADD COLUMN IF NOT EXISTS sponsor_other text,
  ADD COLUMN IF NOT EXISTS has_budget text,
  ADD COLUMN IF NOT EXISTS budget_currency text DEFAULT 'INR',
  ADD COLUMN IF NOT EXISTS budget_min numeric,
  ADD COLUMN IF NOT EXISTS budget_max numeric,
  ADD COLUMN IF NOT EXISTS start_timeline text,
  ADD COLUMN IF NOT EXISTS phone_alternate_country_code text;

-- 1) Extend client_profile with journey + source fields (canonical after conversion).
ALTER TABLE public.client_profile
  ADD COLUMN IF NOT EXISTS sponsor text,
  ADD COLUMN IF NOT EXISTS sponsor_other text,
  ADD COLUMN IF NOT EXISTS start_timeline text,
  ADD COLUMN IF NOT EXISTS has_budget text,
  ADD COLUMN IF NOT EXISTS budget_currency text DEFAULT 'INR',
  ADD COLUMN IF NOT EXISTS budget_min numeric,
  ADD COLUMN IF NOT EXISTS budget_max numeric,
  ADD COLUMN IF NOT EXISTS interested_countries text[] DEFAULT '{}'::text[],
  ADD COLUMN IF NOT EXISTS lead_source text,
  ADD COLUMN IF NOT EXISTS counselor_notes text;

-- 2) Student location preferences (multiple per client; profile-only, optional).
CREATE TABLE IF NOT EXISTS public.client_location_preferences (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  country text NOT NULL,
  province_state text NOT NULL,
  province_code text,
  city text NOT NULL,
  sort_order integer NOT NULL DEFAULT 0,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_clp_client ON public.client_location_preferences(client_id);

ALTER TABLE public.client_location_preferences ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS clp_select ON public.client_location_preferences;
CREATE POLICY clp_select ON public.client_location_preferences FOR SELECT
  USING (public.can_view_client(auth.uid(), client_id));

DROP POLICY IF EXISTS clp_write ON public.client_location_preferences;
CREATE POLICY clp_write ON public.client_location_preferences FOR ALL TO authenticated
  USING (public.can_edit_client(auth.uid(), client_id))
  WITH CHECK (public.can_edit_client(auth.uid(), client_id));

DROP TRIGGER IF EXISTS trg_clp_touch ON public.client_location_preferences;
CREATE TRIGGER trg_clp_touch BEFORE UPDATE ON public.client_location_preferences
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- Seed province/city masters for structured location preferences (expand over time).
INSERT INTO public.master_lists (key, label, description)
VALUES
  ('location_provinces', 'Location provinces / states', 'Provinces and states for student location preferences'),
  ('location_cities', 'Location cities', 'Cities filtered by province for student location preferences')
ON CONFLICT (key) DO NOTHING;

INSERT INTO public.master_items (list_key, code, label, sort_order, metadata) VALUES
  ('location_provinces', 'CA-ON', 'Ontario', 10, '{"country":"Canada","country_code":"CA"}'::jsonb),
  ('location_provinces', 'CA-BC', 'British Columbia', 20, '{"country":"Canada","country_code":"CA"}'::jsonb),
  ('location_provinces', 'AU-VIC', 'Victoria', 30, '{"country":"Australia","country_code":"AU"}'::jsonb),
  ('location_provinces', 'GB-ENG', 'England', 40, '{"country":"United Kingdom","country_code":"GB"}'::jsonb),
  ('location_provinces', 'US-CA', 'California', 50, '{"country":"United States","country_code":"US"}'::jsonb),
  ('location_cities', 'CA-ON-TOR', 'Toronto', 10, '{"country":"Canada","province_code":"CA-ON"}'::jsonb),
  ('location_cities', 'CA-BC-VAN', 'Vancouver', 20, '{"country":"Canada","province_code":"CA-BC"}'::jsonb),
  ('location_cities', 'AU-VIC-MEL', 'Melbourne', 30, '{"country":"Australia","province_code":"AU-VIC"}'::jsonb),
  ('location_cities', 'GB-ENG-LON', 'London', 40, '{"country":"United Kingdom","province_code":"GB-ENG"}'::jsonb),
  ('location_cities', 'US-CA-LA', 'Los Angeles', 50, '{"country":"United States","province_code":"US-CA"}'::jsonb)
ON CONFLICT (list_key, code) DO NOTHING;

-- Configurable branch-manager payment approvers.
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS can_approve_payments boolean NOT NULL DEFAULT false;

-- 3) Receipt draft vs final.
ALTER TABLE public.client_invoice_receipts
  ADD COLUMN IF NOT EXISTS receipt_status text NOT NULL DEFAULT 'final'
    CHECK (receipt_status IN ('draft', 'final'));

-- Payment audit: who last modified (supplements posted_by / verified_by).
ALTER TABLE public.client_invoice_payments
  ADD COLUMN IF NOT EXISTS last_modified_by uuid,
  ADD COLUMN IF NOT EXISTS last_modified_at timestamptz;

-- 4) Payment approver helper (Accountant, Finance, authorized Branch Manager, Super Admin).
CREATE OR REPLACE FUNCTION public.can_approve_payment(_uid uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(_uid IS NOT NULL, false)
     AND (
       public.is_accounting_user(_uid)
       OR public.has_role(_uid, 'admin'::app_role)
       OR (
         public.has_role(_uid, 'manager'::app_role)
         AND EXISTS (
           SELECT 1 FROM public.profiles p
            WHERE p.id = _uid AND COALESCE(p.can_approve_payments, false)
         )
       )
     );
$$;

GRANT EXECUTE ON FUNCTION public.can_approve_payment(uuid) TO authenticated;

-- 5) Enforce payment status on insert/update — counsellors cannot set verified.
CREATE OR REPLACE FUNCTION public.trg_enforce_payment_status_permissions()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    IF NEW.payment_status = 'verified' AND NOT public.can_approve_payment(auth.uid()) THEN
      NEW.payment_status := 'awaiting_verification';
    ELSIF NEW.payment_status IS NULL OR NEW.payment_status = '' THEN
      NEW.payment_status := 'awaiting_verification';
    ELSIF NEW.payment_status NOT IN ('awaiting_verification', 'rejected', 'cancelled')
          AND NOT public.can_approve_payment(auth.uid()) THEN
      NEW.payment_status := 'awaiting_verification';
    END IF;
    IF NEW.posted_by IS NULL THEN
      NEW.posted_by := auth.uid();
    END IF;
    RETURN NEW;
  END IF;

  IF TG_OP = 'UPDATE' THEN
    IF NEW.payment_status IS DISTINCT FROM OLD.payment_status
       AND NEW.payment_status = 'verified'
       AND NOT public.can_approve_payment(auth.uid()) THEN
      RAISE EXCEPTION 'PAYMENT_APPROVAL_DENIED: only authorized finance users may confirm payments';
    END IF;
    IF NEW.payment_status IS DISTINCT FROM OLD.payment_status
       AND NEW.payment_status = 'verified'
       AND OLD.payment_status NOT IN ('awaiting_verification', 'rejected') THEN
      IF NEW.verified_by IS NULL THEN
        NEW.verified_by := auth.uid();
      END IF;
      IF NEW.verified_at IS NULL THEN
        NEW.verified_at := now();
      END IF;
    END IF;
    IF NEW IS DISTINCT FROM OLD THEN
      NEW.last_modified_by := auth.uid();
      NEW.last_modified_at := now();
    END IF;
    RETURN NEW;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_enforce_payment_status_permissions ON public.client_invoice_payments;
CREATE TRIGGER trg_enforce_payment_status_permissions
  BEFORE INSERT OR UPDATE ON public.client_invoice_payments
  FOR EACH ROW EXECUTE FUNCTION public.trg_enforce_payment_status_permissions();

-- Counsellors may INSERT pending payments; approvers may insert verified.
DROP POLICY IF EXISTS cip_insert ON public.client_invoice_payments;
CREATE POLICY cip_insert ON public.client_invoice_payments FOR INSERT TO authenticated
  WITH CHECK (
    public.can_view_client(auth.uid(), client_id)
    AND (
      public.can_approve_payment(auth.uid())
      OR COALESCE(payment_status, 'awaiting_verification') IN ('awaiting_verification', 'rejected')
    )
  );

DROP POLICY IF EXISTS cip_update ON public.client_invoice_payments;
CREATE POLICY cip_update ON public.client_invoice_payments FOR UPDATE TO authenticated
  USING (
    public.can_approve_payment(auth.uid())
    OR (
      public.can_edit_client(auth.uid(), client_id)
      AND COALESCE(payment_status, 'awaiting_verification') = 'awaiting_verification'
      AND posted_by = auth.uid()
    )
  )
  WITH CHECK (
    public.can_approve_payment(auth.uid())
    OR (
      public.can_edit_client(auth.uid(), client_id)
      AND COALESCE(payment_status, 'awaiting_verification') = 'awaiting_verification'
    )
  );

-- Receipt write: approvers only; draft receipts allowed for internal preview.
DROP POLICY IF EXISTS cir_write ON public.client_invoice_receipts;
CREATE POLICY cir_write ON public.client_invoice_receipts FOR ALL TO authenticated
  USING (
    public.can_approve_payment(auth.uid())
    OR (receipt_status = 'draft' AND public.can_edit_client(auth.uid(), (
      SELECT i.client_id FROM public.client_invoices i WHERE i.id = invoice_id LIMIT 1
    )))
  )
  WITH CHECK (
    (receipt_status = 'final' AND public.can_approve_payment(auth.uid()))
    OR (receipt_status = 'draft' AND public.can_edit_client(auth.uid(), (
      SELECT i.client_id FROM public.client_invoices i WHERE i.id = invoice_id LIMIT 1
    )))
  );

-- 6) Link family members from lead on client conversion.
CREATE OR REPLACE FUNCTION public.fn_link_lead_family_on_client()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.source_lead_id IS NOT NULL AND TG_OP = 'INSERT' THEN
    UPDATE public.client_family_members
       SET primary_client_id = NEW.id
     WHERE primary_lead_id = NEW.source_lead_id
       AND primary_client_id IS NULL;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_link_lead_family_on_client ON public.clients;
CREATE TRIGGER trg_link_lead_family_on_client
  AFTER INSERT ON public.clients
  FOR EACH ROW EXECUTE FUNCTION public.fn_link_lead_family_on_client();

-- 7) Extended profile sync from clients (journey + source + notes).
DROP TRIGGER IF EXISTS clients_sync_client_profile ON public.clients;

CREATE OR REPLACE FUNCTION public.sync_client_profile_from_client(_client_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  c public.clients%ROWTYPE;
  spouse text;
BEGIN
  SELECT * INTO c FROM public.clients WHERE id = _client_id;
  IF NOT FOUND THEN
    RETURN;
  END IF;

  SELECT trim(concat_ws(' ', fm.first_name, fm.last_name))
    INTO spouse
    FROM public.client_family_members fm
   WHERE fm.primary_client_id = _client_id
     AND fm.relationship = 'spouse'
   ORDER BY fm.created_at
   LIMIT 1;

  INSERT INTO public.client_profile (
    client_id, date_of_birth, gender, marital_status, nationality,
    passport_number, passport_expiry, address_country, spouse_name,
    highest_qualification, institution_name, graduation_year, gpa_or_percentage,
    sponsor, sponsor_other, start_timeline, has_budget, budget_currency,
    budget_min, budget_max, interested_countries, lead_source, counselor_notes
  )
  VALUES (
    _client_id, c.date_of_birth, c.gender, c.marital_status, c.country_of_citizenship,
    c.passport_number, c.passport_expiry, c.country_of_residence, spouse,
    c.last_education, c.institution_name,
    CASE WHEN c.year_of_passing IS NULL THEN NULL ELSE EXTRACT(YEAR FROM c.year_of_passing)::int END,
    c.percentage_cgpa,
    c.sponsor, c.sponsor_other, c.start_timeline, c.has_budget, c.budget_currency,
    c.budget_min, c.budget_max,
    COALESCE(c.interested_countries, '{}'::text[]),
    c.lead_source, c.counselor_notes
  )
  ON CONFLICT (client_id) DO UPDATE SET
    date_of_birth = COALESCE(public.client_profile.date_of_birth, EXCLUDED.date_of_birth),
    gender = COALESCE(NULLIF(public.client_profile.gender, ''), EXCLUDED.gender),
    marital_status = COALESCE(NULLIF(public.client_profile.marital_status, ''), EXCLUDED.marital_status),
    nationality = COALESCE(NULLIF(public.client_profile.nationality, ''), EXCLUDED.nationality),
    passport_number = COALESCE(NULLIF(public.client_profile.passport_number, ''), EXCLUDED.passport_number),
    passport_expiry = COALESCE(public.client_profile.passport_expiry, EXCLUDED.passport_expiry),
    address_country = COALESCE(NULLIF(public.client_profile.address_country, ''), EXCLUDED.address_country),
    spouse_name = COALESCE(NULLIF(public.client_profile.spouse_name, ''), EXCLUDED.spouse_name),
    highest_qualification = COALESCE(NULLIF(public.client_profile.highest_qualification, ''), EXCLUDED.highest_qualification),
    institution_name = COALESCE(NULLIF(public.client_profile.institution_name, ''), EXCLUDED.institution_name),
    graduation_year = COALESCE(public.client_profile.graduation_year, EXCLUDED.graduation_year),
    gpa_or_percentage = COALESCE(NULLIF(public.client_profile.gpa_or_percentage, ''), EXCLUDED.gpa_or_percentage),
    sponsor = COALESCE(NULLIF(public.client_profile.sponsor, ''), EXCLUDED.sponsor),
    sponsor_other = COALESCE(NULLIF(public.client_profile.sponsor_other, ''), EXCLUDED.sponsor_other),
    start_timeline = COALESCE(NULLIF(public.client_profile.start_timeline, ''), EXCLUDED.start_timeline),
    has_budget = COALESCE(NULLIF(public.client_profile.has_budget, ''), EXCLUDED.has_budget),
    budget_currency = COALESCE(NULLIF(public.client_profile.budget_currency, ''), EXCLUDED.budget_currency),
    budget_min = COALESCE(public.client_profile.budget_min, EXCLUDED.budget_min),
    budget_max = COALESCE(public.client_profile.budget_max, EXCLUDED.budget_max),
    interested_countries = CASE
      WHEN COALESCE(array_length(public.client_profile.interested_countries, 1), 0) = 0
        THEN EXCLUDED.interested_countries
      ELSE public.client_profile.interested_countries
    END,
    lead_source = COALESCE(NULLIF(public.client_profile.lead_source, ''), EXCLUDED.lead_source),
    counselor_notes = COALESCE(NULLIF(public.client_profile.counselor_notes, ''), EXCLUDED.counselor_notes),
    updated_at = now();
END;
$$;

CREATE TRIGGER clients_sync_client_profile
  AFTER INSERT OR UPDATE OF
    date_of_birth, gender, marital_status, country_of_citizenship, country_of_residence,
    passport_number, passport_expiry, last_education, institution_name, year_of_passing,
    percentage_cgpa, sponsor, sponsor_other, start_timeline, has_budget, budget_currency,
    budget_min, budget_max, interested_countries, lead_source, counselor_notes
  ON public.clients
  FOR EACH ROW
  EXECUTE FUNCTION public.trg_sync_client_profile_from_client();

-- Backfill profile journey fields from clients.
DO $$
DECLARE cid uuid;
BEGIN
  FOR cid IN SELECT id FROM public.clients LOOP
    PERFORM public.sync_client_profile_from_client(cid);
  END LOOP;
END;
$$;
