-- Currency master (single source under CRM Masters) + lead/client journey fields.

INSERT INTO public.master_lists (key, label, description)
VALUES (
  'currencies',
  'Currencies',
  'Currency codes and exchange rates for CRM fees, Service Library, and lead budget conversion.'
)
ON CONFLICT (key) DO NOTHING;

INSERT INTO public.master_items (list_key, code, label, sort_order, metadata) VALUES
  ('currencies', 'INR', 'Indian Rupee', 10, '{"symbol":"₹","countries":["India"],"is_default":true}'::jsonb),
  ('currencies', 'CAD', 'Canadian Dollar', 20, '{"symbol":"C$","countries":["Canada"]}'::jsonb),
  ('currencies', 'USD', 'US Dollar', 30, '{"symbol":"$","countries":["United States"]}'::jsonb),
  ('currencies', 'GBP', 'British Pound', 40, '{"symbol":"£","countries":["United Kingdom"]}'::jsonb),
  ('currencies', 'EUR', 'Euro', 50, '{"symbol":"€","countries":["Germany","France","Netherlands","Italy","Ireland","Spain"]}'::jsonb),
  ('currencies', 'AUD', 'Australian Dollar', 60, '{"symbol":"A$","countries":["Australia"]}'::jsonb),
  ('currencies', 'NZD', 'New Zealand Dollar', 70, '{"symbol":"NZ$","countries":["New Zealand"]}'::jsonb),
  ('currencies', 'AED', 'UAE Dirham', 80, '{"symbol":"AED","countries":["United Arab Emirates"]}'::jsonb),
  ('currencies', 'SGD', 'Singapore Dollar', 90, '{"symbol":"S$","countries":["Singapore"]}'::jsonb)
ON CONFLICT (list_key, code) DO NOTHING;

-- Student journey fields on leads (warm/hot only in UI; columns available for all).
ALTER TABLE public.leads
  ADD COLUMN IF NOT EXISTS sponsor text,
  ADD COLUMN IF NOT EXISTS sponsor_other text,
  ADD COLUMN IF NOT EXISTS has_budget text,
  ADD COLUMN IF NOT EXISTS budget_currency text DEFAULT 'INR',
  ADD COLUMN IF NOT EXISTS budget_min numeric,
  ADD COLUMN IF NOT EXISTS budget_max numeric;

-- Same fields on clients (persist through registration).
ALTER TABLE public.clients
  ADD COLUMN IF NOT EXISTS sponsor text,
  ADD COLUMN IF NOT EXISTS sponsor_other text,
  ADD COLUMN IF NOT EXISTS has_budget text,
  ADD COLUMN IF NOT EXISTS budget_currency text DEFAULT 'INR',
  ADD COLUMN IF NOT EXISTS budget_min numeric,
  ADD COLUMN IF NOT EXISTS budget_max numeric,
  ADD COLUMN IF NOT EXISTS start_timeline text,
  ADD COLUMN IF NOT EXISTS phone_alternate_country_code text;

-- Year of passing: store as date (YYYY-MM-DD). Column is integer today — use make_date, not ::date cast.
ALTER TABLE public.clients
  ALTER COLUMN year_of_passing TYPE date
  USING (
    CASE
      WHEN year_of_passing IS NULL THEN NULL
      ELSE make_date(year_of_passing, 6, 30)
    END
  );

-- Extend lead draft RPCs with journey fields.
CREATE OR REPLACE FUNCTION public.create_lead_draft(_data jsonb)
RETURNS public.leads
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  uid uuid := auth.uid();
  rec public.leads;
BEGIN
  PERFORM public._assert_can_manage_leads(uid);

  INSERT INTO public.leads (
    lead_type, lead_temperature, status, is_cold_pool,
    first_name, middle_name, last_name, email, phone, phone_country_code,
    gender, marital_status, country_of_citizenship, country_of_residence,
    interested_countries, coaching_services, visa_services, admission_services, allied_services,
    visa_locked, visa_lock_reason, last_education, last_education_other,
    start_timeline, sponsor, sponsor_other, has_budget, budget_currency, budget_min, budget_max,
    lead_source, branch, department, cold_pool_campaign, notes, created_by
  ) VALUES (
    COALESCE(NULLIF(_data ->> 'lead_type', ''), 'warm'),
    COALESCE(NULLIF(_data ->> 'lead_temperature', ''), 'warm'),
    COALESCE(NULLIF(_data ->> 'status', ''), 'new'),
    COALESCE((_data ->> 'is_cold_pool')::boolean, false),
    COALESCE(_data ->> 'first_name', ''),
    NULLIF(_data ->> 'middle_name', ''),
    COALESCE(_data ->> 'last_name', ''),
    NULLIF(_data ->> 'email', ''),
    NULLIF(_data ->> 'phone', ''),
    NULLIF(_data ->> 'phone_country_code', ''),
    NULLIF(_data ->> 'gender', ''),
    NULLIF(_data ->> 'marital_status', ''),
    NULLIF(_data ->> 'country_of_citizenship', ''),
    NULLIF(_data ->> 'country_of_residence', ''),
    public._lead_json_text_array(_data, 'interested_countries'),
    public._lead_json_text_array(_data, 'coaching_services'),
    public._lead_json_text_array(_data, 'visa_services'),
    public._lead_json_text_array(_data, 'admission_services'),
    public._lead_json_text_array(_data, 'allied_services'),
    COALESCE((_data ->> 'visa_locked')::boolean, false),
    NULLIF(_data ->> 'visa_lock_reason', ''),
    NULLIF(_data ->> 'last_education', ''),
    NULLIF(_data ->> 'last_education_other', ''),
    NULLIF(_data ->> 'start_timeline', ''),
    NULLIF(_data ->> 'sponsor', ''),
    NULLIF(_data ->> 'sponsor_other', ''),
    NULLIF(_data ->> 'has_budget', ''),
    COALESCE(NULLIF(_data ->> 'budget_currency', ''), 'INR'),
    NULLIF(_data ->> 'budget_min', '')::numeric,
    NULLIF(_data ->> 'budget_max', '')::numeric,
    NULLIF(_data ->> 'lead_source', ''),
    NULLIF(_data ->> 'branch', ''),
    NULLIF(_data ->> 'department', ''),
    NULLIF(_data ->> 'cold_pool_campaign', ''),
    NULLIF(_data ->> 'notes', ''),
    uid
  )
  RETURNING * INTO rec;

  RETURN rec;
END;
$$;

CREATE OR REPLACE FUNCTION public.patch_lead_draft(_id uuid, _data jsonb)
RETURNS public.leads
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  uid uuid := auth.uid();
  rec public.leads;
BEGIN
  PERFORM public._assert_can_edit_lead(uid, _id);

  UPDATE public.leads l
     SET
       lead_type = CASE WHEN _data ? 'lead_type' THEN COALESCE(NULLIF(_data ->> 'lead_type', ''), l.lead_type) ELSE l.lead_type END,
       lead_temperature = CASE WHEN _data ? 'lead_temperature' THEN COALESCE(NULLIF(_data ->> 'lead_temperature', ''), l.lead_temperature) ELSE l.lead_temperature END,
       status = CASE WHEN _data ? 'status' THEN COALESCE(NULLIF(_data ->> 'status', ''), l.status) ELSE l.status END,
       is_cold_pool = CASE WHEN _data ? 'is_cold_pool' THEN COALESCE((_data ->> 'is_cold_pool')::boolean, l.is_cold_pool) ELSE l.is_cold_pool END,
       first_name = CASE WHEN _data ? 'first_name' THEN COALESCE(_data ->> 'first_name', l.first_name) ELSE l.first_name END,
       middle_name = CASE WHEN _data ? 'middle_name' THEN NULLIF(_data ->> 'middle_name', '') ELSE l.middle_name END,
       last_name = CASE WHEN _data ? 'last_name' THEN COALESCE(_data ->> 'last_name', l.last_name) ELSE l.last_name END,
       email = CASE WHEN _data ? 'email' THEN NULLIF(_data ->> 'email', '') ELSE l.email END,
       phone = CASE WHEN _data ? 'phone' THEN NULLIF(_data ->> 'phone', '') ELSE l.phone END,
       phone_country_code = CASE WHEN _data ? 'phone_country_code' THEN NULLIF(_data ->> 'phone_country_code', '') ELSE l.phone_country_code END,
       gender = CASE WHEN _data ? 'gender' THEN NULLIF(_data ->> 'gender', '') ELSE l.gender END,
       marital_status = CASE WHEN _data ? 'marital_status' THEN NULLIF(_data ->> 'marital_status', '') ELSE l.marital_status END,
       country_of_citizenship = CASE WHEN _data ? 'country_of_citizenship' THEN NULLIF(_data ->> 'country_of_citizenship', '') ELSE l.country_of_citizenship END,
       country_of_residence = CASE WHEN _data ? 'country_of_residence' THEN NULLIF(_data ->> 'country_of_residence', '') ELSE l.country_of_residence END,
       interested_countries = CASE WHEN _data ? 'interested_countries' THEN public._lead_json_text_array(_data, 'interested_countries') ELSE l.interested_countries END,
       coaching_services = CASE WHEN _data ? 'coaching_services' THEN public._lead_json_text_array(_data, 'coaching_services') ELSE l.coaching_services END,
       visa_services = CASE WHEN _data ? 'visa_services' THEN public._lead_json_text_array(_data, 'visa_services') ELSE l.visa_services END,
       admission_services = CASE WHEN _data ? 'admission_services' THEN public._lead_json_text_array(_data, 'admission_services') ELSE l.admission_services END,
       allied_services = CASE WHEN _data ? 'allied_services' THEN public._lead_json_text_array(_data, 'allied_services') ELSE l.allied_services END,
       visa_locked = CASE WHEN _data ? 'visa_locked' THEN COALESCE((_data ->> 'visa_locked')::boolean, l.visa_locked) ELSE l.visa_locked END,
       visa_lock_reason = CASE WHEN _data ? 'visa_lock_reason' THEN NULLIF(_data ->> 'visa_lock_reason', '') ELSE l.visa_lock_reason END,
       last_education = CASE WHEN _data ? 'last_education' THEN NULLIF(_data ->> 'last_education', '') ELSE l.last_education END,
       last_education_other = CASE WHEN _data ? 'last_education_other' THEN NULLIF(_data ->> 'last_education_other', '') ELSE l.last_education_other END,
       start_timeline = CASE WHEN _data ? 'start_timeline' THEN NULLIF(_data ->> 'start_timeline', '') ELSE l.start_timeline END,
       sponsor = CASE WHEN _data ? 'sponsor' THEN NULLIF(_data ->> 'sponsor', '') ELSE l.sponsor END,
       sponsor_other = CASE WHEN _data ? 'sponsor_other' THEN NULLIF(_data ->> 'sponsor_other', '') ELSE l.sponsor_other END,
       has_budget = CASE WHEN _data ? 'has_budget' THEN NULLIF(_data ->> 'has_budget', '') ELSE l.has_budget END,
       budget_currency = CASE WHEN _data ? 'budget_currency' THEN COALESCE(NULLIF(_data ->> 'budget_currency', ''), l.budget_currency) ELSE l.budget_currency END,
       budget_min = CASE WHEN _data ? 'budget_min' THEN NULLIF(_data ->> 'budget_min', '')::numeric ELSE l.budget_min END,
       budget_max = CASE WHEN _data ? 'budget_max' THEN NULLIF(_data ->> 'budget_max', '')::numeric ELSE l.budget_max END,
       lead_source = CASE WHEN _data ? 'lead_source' THEN NULLIF(_data ->> 'lead_source', '') ELSE l.lead_source END,
       branch = CASE WHEN _data ? 'branch' THEN NULLIF(_data ->> 'branch', '') ELSE l.branch END,
       department = CASE WHEN _data ? 'department' THEN NULLIF(_data ->> 'department', '') ELSE l.department END,
       cold_pool_campaign = CASE WHEN _data ? 'cold_pool_campaign' THEN NULLIF(_data ->> 'cold_pool_campaign', '') ELSE l.cold_pool_campaign END,
       notes = CASE WHEN _data ? 'notes' THEN NULLIF(_data ->> 'notes', '') ELSE l.notes END
   WHERE l.id = _id
  RETURNING * INTO rec;

  RETURN rec;
END;
$$;
