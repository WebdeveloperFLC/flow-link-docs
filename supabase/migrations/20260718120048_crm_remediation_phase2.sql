-- CRM remediation phase 2: branch-scoped RLS + atomic lead → client conversion RPC.

-- ---------------------------------------------------------------------------
-- 1) branch_id on leads/clients (backfill from legacy branch text)
-- ---------------------------------------------------------------------------
ALTER TABLE public.leads
  ADD COLUMN IF NOT EXISTS branch_id uuid REFERENCES public.branches(id) ON DELETE SET NULL;

ALTER TABLE public.clients
  ADD COLUMN IF NOT EXISTS branch_id uuid REFERENCES public.branches(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_leads_branch_id ON public.leads(branch_id);
CREATE INDEX IF NOT EXISTS idx_clients_branch_id ON public.clients(branch_id);

UPDATE public.leads l
   SET branch_id = b.id
  FROM public.branches b
 WHERE l.branch_id IS NULL
   AND l.branch IS NOT NULL
   AND btrim(l.branch) <> ''
   AND lower(btrim(b.name)) = lower(btrim(l.branch));

UPDATE public.clients c
   SET branch_id = b.id
  FROM public.branches b
 WHERE c.branch_id IS NULL
   AND c.branch IS NOT NULL
   AND btrim(c.branch) <> ''
   AND lower(btrim(b.name)) = lower(btrim(b.branch));

-- Keep branch text ↔ branch_id in sync on write
CREATE OR REPLACE FUNCTION public.fn_sync_branch_id_from_text()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF NEW.branch IS NOT NULL AND btrim(NEW.branch) <> '' THEN
    SELECT b.id INTO NEW.branch_id
      FROM public.branches b
     WHERE lower(btrim(b.name)) = lower(btrim(NEW.branch))
     LIMIT 1;
  END IF;
  IF NEW.branch_id IS NOT NULL AND (NEW.branch IS NULL OR btrim(NEW.branch) = '') THEN
    SELECT b.name INTO NEW.branch FROM public.branches b WHERE b.id = NEW.branch_id;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_leads_sync_branch_id ON public.leads;
CREATE TRIGGER trg_leads_sync_branch_id
  BEFORE INSERT OR UPDATE OF branch, branch_id ON public.leads
  FOR EACH ROW EXECUTE FUNCTION public.fn_sync_branch_id_from_text();

DROP TRIGGER IF EXISTS trg_clients_sync_branch_id ON public.clients;
CREATE TRIGGER trg_clients_sync_branch_id
  BEFORE INSERT OR UPDATE OF branch, branch_id ON public.clients
  FOR EACH ROW EXECUTE FUNCTION public.fn_sync_branch_id_from_text();

CREATE OR REPLACE FUNCTION public.fn_leads_default_branch_from_creator()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  v_branch_id uuid;
  v_branch_name text;
BEGIN
  IF NEW.branch_id IS NULL AND (NEW.branch IS NULL OR btrim(NEW.branch) = '') THEN
    SELECT p.branch_id, b.name
      INTO v_branch_id, v_branch_name
      FROM public.profiles p
      LEFT JOIN public.branches b ON b.id = p.branch_id
     WHERE p.id = COALESCE(NEW.created_by, auth.uid())
     LIMIT 1;
    NEW.branch_id := v_branch_id;
    NEW.branch := v_branch_name;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_leads_default_branch ON public.leads;
CREATE TRIGGER trg_leads_default_branch
  BEFORE INSERT ON public.leads
  FOR EACH ROW EXECUTE FUNCTION public.fn_leads_default_branch_from_creator();

-- ---------------------------------------------------------------------------
-- 2) Branch visibility helpers
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.fn_user_branch_id(_uid uuid)
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT branch_id FROM public.profiles WHERE id = _uid;
$$;

CREATE OR REPLACE FUNCTION public.fn_bypass_branch_scope(_uid uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(_uid IS NOT NULL, false)
     AND (
       public.is_client_admin(_uid)
       OR public.is_accounting_admin(_uid)
       OR public.is_commission_admin(_uid)
       OR public.has_role(_uid, 'director'::public.app_role)
       OR public.has_role(_uid, 'manager'::public.app_role)
     );
$$;

CREATE OR REPLACE FUNCTION public.fn_branch_record_visible(
  _uid uuid,
  _branch_id uuid,
  _branch_text text DEFAULT NULL
)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    public.fn_bypass_branch_scope(_uid)
    OR NOT EXISTS (
      SELECT 1 FROM public.profiles p WHERE p.id = _uid AND p.branch_id IS NOT NULL
    )
    OR _branch_id IS NOT NULL AND _branch_id = public.fn_user_branch_id(_uid)
    OR (
      _branch_id IS NULL
      AND (_branch_text IS NULL OR btrim(_branch_text) = '')
    )
    OR (
      _branch_text IS NOT NULL
      AND btrim(_branch_text) <> ''
      AND EXISTS (
        SELECT 1
          FROM public.profiles p
          JOIN public.branches ub ON ub.id = p.branch_id
         WHERE p.id = _uid
           AND lower(btrim(ub.name)) = lower(btrim(_branch_text))
      )
    );
$$;

REVOKE ALL ON FUNCTION public.fn_user_branch_id(uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.fn_bypass_branch_scope(uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.fn_branch_record_visible(uuid, uuid, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.fn_user_branch_id(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.fn_bypass_branch_scope(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.fn_branch_record_visible(uuid, uuid, text) TO authenticated;

-- ---------------------------------------------------------------------------
-- 3) Branch-scoped RLS on leads + clients
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS "leads staff view" ON public.leads;
CREATE POLICY "leads staff view"
  ON public.leads
  FOR SELECT
  TO authenticated
  USING (
    auth.uid() = created_by
    OR auth.uid() = assigned_counselor_id
    OR (
      public.is_client_staff_viewer(auth.uid())
      AND public.fn_branch_record_visible(auth.uid(), branch_id, branch)
    )
  );

DROP POLICY IF EXISTS "leads staff update" ON public.leads;
CREATE POLICY "leads staff update"
  ON public.leads
  FOR UPDATE
  TO authenticated
  USING (
    public.is_client_staff_editor(auth.uid())
    AND public.fn_branch_record_visible(auth.uid(), branch_id, branch)
    OR (auth.uid() = created_by AND NOT public.has_any_app_role(auth.uid(), ARRAY['viewer','client']))
    OR (auth.uid() = assigned_counselor_id AND NOT public.has_any_app_role(auth.uid(), ARRAY['viewer','client']))
  )
  WITH CHECK (
    public.is_client_staff_editor(auth.uid())
    AND public.fn_branch_record_visible(auth.uid(), branch_id, branch)
    OR (auth.uid() = created_by AND NOT public.has_any_app_role(auth.uid(), ARRAY['viewer','client']))
    OR (auth.uid() = assigned_counselor_id AND NOT public.has_any_app_role(auth.uid(), ARRAY['viewer','client']))
  );

DROP POLICY IF EXISTS "leads staff create" ON public.leads;
CREATE POLICY "leads staff create"
  ON public.leads
  FOR INSERT
  TO authenticated
  WITH CHECK (public.is_client_staff_editor(auth.uid()));

DROP POLICY IF EXISTS "clients staff and assigned view" ON public.clients;
CREATE POLICY "clients staff and assigned view"
  ON public.clients
  FOR SELECT
  TO authenticated
  USING (
    public.can_view_client(auth.uid(), id)
    OR public.is_portal_user_for(auth.uid(), id)
    OR (
      public.is_client_staff_viewer(auth.uid())
      AND public.fn_branch_record_visible(auth.uid(), branch_id, branch)
    )
  );

DROP POLICY IF EXISTS "clients staff and assigned update" ON public.clients;
CREATE POLICY "clients staff and assigned update"
  ON public.clients
  FOR UPDATE
  TO authenticated
  USING (
    public.can_edit_client(auth.uid(), id)
    OR (
      public.is_client_staff_editor(auth.uid())
      AND public.fn_branch_record_visible(auth.uid(), branch_id, branch)
    )
  )
  WITH CHECK (
    public.can_edit_client(auth.uid(), id)
    OR (
      public.is_client_staff_editor(auth.uid())
      AND public.fn_branch_record_visible(auth.uid(), branch_id, branch)
    )
  );

-- ---------------------------------------------------------------------------
-- 4) Atomic lead → client conversion
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.convert_lead_to_client(
  _lead_id uuid,
  _opts jsonb DEFAULT '{}'::jsonb
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  uid uuid := auth.uid();
  v_lead public.leads%ROWTYPE;
  v_client public.clients%ROWTYPE;
  v_existing_id uuid;
  v_counselor_notes text;
  v_full_name text;
  v_app_type text;
  v_e0 jsonb;
  v_institution text;
  v_pct text;
  v_year int;
  v_last_education text;
BEGIN
  IF uid IS NULL THEN
    RAISE EXCEPTION 'Not authenticated' USING ERRCODE = '28000';
  END IF;

  PERFORM public._assert_can_edit_lead(uid, _lead_id);

  SELECT * INTO v_lead FROM public.leads WHERE id = _lead_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Lead not found' USING ERRCODE = 'P0002';
  END IF;

  IF v_lead.converted_to_client_id IS NOT NULL THEN
    SELECT registration_number INTO v_client.registration_number
      FROM public.clients WHERE id = v_lead.converted_to_client_id;
    RETURN jsonb_build_object(
      'client_id', v_lead.converted_to_client_id,
      'registration_number', v_client.registration_number,
      'already_converted', true
    );
  END IF;

  SELECT id INTO v_existing_id FROM public.clients WHERE source_lead_id = _lead_id LIMIT 1;
  IF v_existing_id IS NOT NULL THEN
    SELECT registration_number INTO v_client.registration_number
      FROM public.clients WHERE id = v_existing_id;
    RETURN jsonb_build_object(
      'client_id', v_existing_id,
      'registration_number', v_client.registration_number,
      'already_converted', true
    );
  END IF;

  v_counselor_notes := COALESCE(
    NULLIF(btrim(_opts ->> 'counselor_notes'), ''),
    NULLIF(btrim(v_lead.notes), '')
  );
  v_full_name := btrim(concat_ws(' ', v_lead.first_name, v_lead.middle_name, v_lead.last_name));

  IF v_full_name = '' THEN
    RAISE EXCEPTION 'Lead name required for conversion' USING ERRCODE = '22023';
  END IF;

  v_e0 := CASE
    WHEN jsonb_array_length(COALESCE(v_lead.education_history, '[]'::jsonb)) > 0
      THEN v_lead.education_history -> 0
    ELSE NULL
  END;
  v_institution := NULLIF(btrim(v_e0 ->> 'institution'), '');
  v_pct := NULLIF(btrim(v_e0 ->> 'percentage_cgpa'), '');
  v_year := NULLIF(substring(v_e0 ->> 'year' from '\d{4}'), '')::int;
  v_last_education := COALESCE(NULLIF(v_lead.last_education, ''), NULLIF(v_e0 ->> 'level', ''));

  v_app_type := CASE
    WHEN COALESCE(v_lead.visa_services[1], '') LIKE '%::%' THEN 'Visa application'
    WHEN COALESCE(v_lead.visa_services[1], '') <> '' THEN v_lead.visa_services[1]
    ELSE 'Student Visa'
  END;

  INSERT INTO public.clients (
    source_lead_id,
    first_name, middle_name, last_name, full_name,
    email, phone, phone_country_code,
    gender, marital_status,
    country_of_citizenship, country_of_residence, country,
    last_education, last_education_other, institution_name, year_of_passing, percentage_cgpa,
    education_history,
    english_test, english_test_status, english_overall,
    english_test_date, english_test_expiry, english_sections, other_tests, work_experience, language_tests,
    interested_countries, branch, branch_id, department,
    assigned_counselor_id, owner_id, created_by, converted_by,
    coaching_services, visa_services, admission_services, allied_services, travel_financial_services,
    application_type, lead_source, counselor_notes, lead_temperature,
    sponsor, sponsor_other, start_timeline,
    has_budget, budget_currency, budget_min, budget_max, budget,
    next_followup_at
  )
  VALUES (
    v_lead.id,
    v_lead.first_name, v_lead.middle_name, v_lead.last_name, v_full_name,
    v_lead.email, v_lead.phone, v_lead.phone_country_code,
    v_lead.gender, v_lead.marital_status,
    v_lead.country_of_citizenship,
    v_lead.country_of_residence,
    COALESCE(v_lead.country_of_residence, 'India'),
    v_last_education, v_lead.last_education_other, v_institution, v_year, v_pct,
    COALESCE(v_lead.education_history, '[]'::jsonb),
    v_lead.english_test, v_lead.english_test_status, v_lead.english_overall,
    v_lead.english_test_date, v_lead.english_test_expiry,
    COALESCE(v_lead.english_sections, '{}'::jsonb),
    COALESCE(v_lead.other_tests, '[]'::jsonb),
    COALESCE(v_lead.work_experience, '[]'::jsonb),
    COALESCE(v_lead.language_tests, '{}'::jsonb),
    COALESCE(v_lead.interested_countries, '{}'::text[]),
    v_lead.branch, v_lead.branch_id, v_lead.department,
    v_lead.assigned_counselor_id,
    COALESCE(v_lead.assigned_counselor_id, uid),
    uid, uid,
    COALESCE(v_lead.coaching_services, '{}'::text[]),
    COALESCE(v_lead.visa_services, '{}'::text[]),
    COALESCE(v_lead.admission_services, '{}'::text[]),
    COALESCE(v_lead.allied_services, '{}'::text[]),
    COALESCE(v_lead.travel_financial_services, '{}'::text[]),
    v_app_type,
    v_lead.lead_source,
    v_counselor_notes,
    v_lead.lead_temperature,
    v_lead.sponsor, v_lead.sponsor_other, v_lead.start_timeline,
    v_lead.has_budget, v_lead.budget_currency, v_lead.budget_min, v_lead.budget_max,
    CASE
      WHEN v_lead.has_budget = 'yes' AND (v_lead.budget_max IS NOT NULL OR v_lead.budget_min IS NOT NULL)
        THEN COALESCE(v_lead.budget_max, v_lead.budget_min)
      ELSE NULL
    END,
    v_lead.next_followup_at
  )
  RETURNING * INTO v_client;

  PERFORM public.assign_client_registration_number(v_client.id);
  PERFORM public.sync_client_profile_from_client(v_client.id);

  UPDATE public.call_queue_items
     SET status = 'done',
         lead_status = 'converted',
         updated_at = now()
   WHERE lead_id = _lead_id
     AND status IN ('queued', 'calling', 'callback');

  SELECT * INTO v_client FROM public.clients WHERE id = v_client.id;

  RETURN jsonb_build_object(
    'client_id', v_client.id,
    'registration_number', v_client.registration_number,
    'already_converted', false
  );
END;
$$;

REVOKE ALL ON FUNCTION public.convert_lead_to_client(uuid, jsonb) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.convert_lead_to_client(uuid, jsonb) TO authenticated;

NOTIFY pgrst, 'reload schema';
