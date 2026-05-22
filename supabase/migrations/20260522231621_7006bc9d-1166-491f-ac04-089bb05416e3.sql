
-- Rewrite the CRM → Accounting client sync trigger to copy lead-form fields
CREATE OR REPLACE FUNCTION public.fn_sync_accounting_client()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_currency text := 'INR';
  v_country text;
  v_client_type text := 'STUDENT';
  v_visa text;
  v_service text;
  v_counselor_name text;
  v_app text := COALESCE(NEW.application_type, '');
BEGIN
  v_country := COALESCE(NEW.country_of_residence, NEW.country, 'India');

  -- currency from common country labels
  IF v_country ILIKE 'canada%' OR v_country = 'CA' THEN v_currency := 'CAD';
  ELSIF v_country ILIKE 'united states%' OR v_country = 'US' OR v_country ILIKE 'usa%' THEN v_currency := 'USD';
  ELSIF v_country ILIKE 'united kingdom%' OR v_country = 'GB' OR v_country ILIKE 'uk%' THEN v_currency := 'GBP';
  ELSIF v_country ILIKE 'australia%' OR v_country = 'AU' THEN v_currency := 'AUD';
  ELSE v_currency := 'INR';
  END IF;

  -- map application_type → client_type
  IF v_app ILIKE '%student%' THEN v_client_type := 'STUDENT';
  ELSIF v_app ILIKE '%work%' OR v_app ILIKE '%pr %' OR v_app ILIKE '%permanent%' OR v_app ILIKE '%immigration%' THEN v_client_type := 'IMMIGRATION';
  ELSIF v_app ILIKE '%depend%' THEN v_client_type := 'DEPENDENT';
  ELSIF v_app ILIKE '%coach%' OR v_app ILIKE '%ielts%' OR v_app ILIKE '%pte%' THEN v_client_type := 'COACHING';
  ELSIF v_app ILIKE '%corporate%' OR v_app ILIKE '%business%' THEN v_client_type := 'CORPORATE';
  ELSIF v_app ILIKE '%family%' THEN v_client_type := 'FAMILY';
  END IF;

  -- visa category: first visa_service code, else application_type
  IF NEW.visa_services IS NOT NULL AND array_length(NEW.visa_services, 1) > 0 THEN
    v_visa := NEW.visa_services[1];
  ELSE
    v_visa := NULLIF(v_app, '');
  END IF;

  -- service package: concat of all service arrays
  v_service := NULLIF(array_to_string(
    ARRAY(
      SELECT unnest(COALESCE(NEW.coaching_services, '{}'::text[]))
      UNION ALL SELECT unnest(COALESCE(NEW.admission_services, '{}'::text[]))
      UNION ALL SELECT unnest(COALESCE(NEW.allied_services, '{}'::text[]))
      UNION ALL SELECT unnest(COALESCE(NEW.visa_services, '{}'::text[]))
    ),
    ', '
  ), '');

  -- counselor name from profiles
  IF NEW.assigned_counselor_id IS NOT NULL THEN
    SELECT full_name INTO v_counselor_name FROM public.profiles WHERE id = NEW.assigned_counselor_id LIMIT 1;
  END IF;

  INSERT INTO public.accounting_clients (
    id, linked_crm_client_id, name, legal_name,
    segment, client_type, country, currency, status,
    email, phone, payment_terms, created_by,
    intake, visa_category, service_package,
    counselor_id, counselor_name, lead_source
  ) VALUES (
    gen_random_uuid(),
    NEW.id,
    COALESCE(NEW.full_name, 'Unnamed'),
    COALESCE(NEW.full_name, 'Unnamed'),
    'INDIVIDUAL',
    v_client_type,
    v_country,
    v_currency,
    'ACTIVE',
    NEW.email,
    NEW.phone,
    COALESCE(NULLIF(NEW.payment_terms::text, ''), 'Due on receipt'),
    NEW.created_by,
    NULLIF(NEW.intake, ''),
    v_visa,
    v_service,
    NEW.assigned_counselor_id::text,
    v_counselor_name,
    NULLIF(NEW.lead_source, '')
  )
  ON CONFLICT (linked_crm_client_id) WHERE linked_crm_client_id IS NOT NULL
  DO UPDATE SET
    name             = EXCLUDED.name,
    email            = COALESCE(EXCLUDED.email, public.accounting_clients.email),
    phone            = COALESCE(EXCLUDED.phone, public.accounting_clients.phone),
    country          = COALESCE(EXCLUDED.country, public.accounting_clients.country),
    currency         = COALESCE(EXCLUDED.currency, public.accounting_clients.currency),
    client_type      = COALESCE(EXCLUDED.client_type, public.accounting_clients.client_type),
    intake           = COALESCE(EXCLUDED.intake, public.accounting_clients.intake),
    visa_category    = COALESCE(EXCLUDED.visa_category, public.accounting_clients.visa_category),
    service_package  = COALESCE(EXCLUDED.service_package, public.accounting_clients.service_package),
    counselor_id     = COALESCE(EXCLUDED.counselor_id, public.accounting_clients.counselor_id),
    counselor_name   = COALESCE(EXCLUDED.counselor_name, public.accounting_clients.counselor_name),
    lead_source      = COALESCE(EXCLUDED.lead_source, public.accounting_clients.lead_source),
    payment_terms    = COALESCE(EXCLUDED.payment_terms, public.accounting_clients.payment_terms);

  RETURN NEW;
END $function$;

-- Ensure trigger fires on UPDATE too
DROP TRIGGER IF EXISTS trg_sync_accounting_client ON public.clients;
CREATE TRIGGER trg_sync_accounting_client
AFTER INSERT OR UPDATE ON public.clients
FOR EACH ROW EXECUTE FUNCTION public.fn_sync_accounting_client();

-- Backfill existing accounting_clients rows that are linked to a CRM client
UPDATE public.accounting_clients ac
SET
  client_type = CASE
    WHEN COALESCE(c.application_type,'') ILIKE '%student%' THEN 'STUDENT'
    WHEN COALESCE(c.application_type,'') ILIKE '%work%'
      OR COALESCE(c.application_type,'') ILIKE '%permanent%'
      OR COALESCE(c.application_type,'') ILIKE '%immigration%' THEN 'IMMIGRATION'
    WHEN COALESCE(c.application_type,'') ILIKE '%depend%' THEN 'DEPENDENT'
    WHEN COALESCE(c.application_type,'') ILIKE '%coach%'
      OR COALESCE(c.application_type,'') ILIKE '%ielts%'
      OR COALESCE(c.application_type,'') ILIKE '%pte%' THEN 'COACHING'
    WHEN COALESCE(c.application_type,'') ILIKE '%corporate%' THEN 'CORPORATE'
    WHEN COALESCE(c.application_type,'') ILIKE '%family%' THEN 'FAMILY'
    ELSE COALESCE(ac.client_type, 'STUDENT')
  END,
  country = COALESCE(c.country_of_residence, c.country, ac.country),
  intake = COALESCE(NULLIF(c.intake,''), ac.intake),
  visa_category = COALESCE(
    CASE WHEN c.visa_services IS NOT NULL AND array_length(c.visa_services,1) > 0
         THEN c.visa_services[1] ELSE NULLIF(c.application_type,'') END,
    ac.visa_category
  ),
  service_package = COALESCE(
    NULLIF(array_to_string(
      ARRAY(
        SELECT unnest(COALESCE(c.coaching_services,'{}'::text[]))
        UNION ALL SELECT unnest(COALESCE(c.admission_services,'{}'::text[]))
        UNION ALL SELECT unnest(COALESCE(c.allied_services,'{}'::text[]))
        UNION ALL SELECT unnest(COALESCE(c.visa_services,'{}'::text[]))
      ), ', '
    ), ''),
    ac.service_package
  ),
  counselor_id = COALESCE(c.assigned_counselor_id::text, ac.counselor_id),
  counselor_name = COALESCE(
    (SELECT full_name FROM public.profiles WHERE id = c.assigned_counselor_id LIMIT 1),
    ac.counselor_name
  ),
  lead_source = COALESCE(NULLIF(c.lead_source,''), ac.lead_source)
FROM public.clients c
WHERE ac.linked_crm_client_id = c.id;
