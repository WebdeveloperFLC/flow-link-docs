
-- 1. Unique partial index so each CRM client maps to at most one accounting client
CREATE UNIQUE INDEX IF NOT EXISTS accounting_clients_linked_crm_client_id_uniq
  ON public.accounting_clients(linked_crm_client_id)
  WHERE linked_crm_client_id IS NOT NULL;

-- 2. Trigger function to auto-create accounting_clients row when a CRM client is created
CREATE OR REPLACE FUNCTION public.fn_sync_accounting_client()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_currency text := 'INR';
  v_country  text;
BEGIN
  v_country := COALESCE(NEW.country, 'IN');
  IF v_country = 'CA' THEN v_currency := 'CAD';
  ELSIF v_country = 'US' THEN v_currency := 'USD';
  ELSIF v_country = 'GB' THEN v_currency := 'GBP';
  END IF;

  INSERT INTO public.accounting_clients (
    id, linked_crm_client_id, name, legal_name,
    segment, client_type, country, currency, status,
    email, phone, payment_terms, created_by
  ) VALUES (
    gen_random_uuid(),
    NEW.id,
    COALESCE(NEW.full_name, 'Unnamed'),
    COALESCE(NEW.full_name, 'Unnamed'),
    'INDIVIDUAL',
    'STUDENT',
    v_country,
    v_currency,
    'ACTIVE',
    NEW.email,
    NEW.phone,
    'Due on receipt',
    NEW.created_by
  )
  ON CONFLICT (linked_crm_client_id) WHERE linked_crm_client_id IS NOT NULL
  DO UPDATE SET
    name  = EXCLUDED.name,
    email = COALESCE(EXCLUDED.email, public.accounting_clients.email),
    phone = COALESCE(EXCLUDED.phone, public.accounting_clients.phone),
    country = COALESCE(EXCLUDED.country, public.accounting_clients.country);

  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trg_sync_accounting_client ON public.clients;
CREATE TRIGGER trg_sync_accounting_client
  AFTER INSERT ON public.clients
  FOR EACH ROW
  EXECUTE FUNCTION public.fn_sync_accounting_client();

-- 3. Backfill: create accounting_clients rows for existing CRM clients with no link
INSERT INTO public.accounting_clients (
  id, linked_crm_client_id, name, legal_name,
  segment, client_type, country, currency, status,
  email, phone, payment_terms, created_by
)
SELECT
  gen_random_uuid(),
  c.id,
  COALESCE(c.full_name, 'Unnamed'),
  COALESCE(c.full_name, 'Unnamed'),
  'INDIVIDUAL',
  'STUDENT',
  COALESCE(c.country, 'IN'),
  CASE COALESCE(c.country, 'IN')
    WHEN 'CA' THEN 'CAD'
    WHEN 'US' THEN 'USD'
    WHEN 'GB' THEN 'GBP'
    ELSE 'INR'
  END,
  'ACTIVE',
  c.email,
  c.phone,
  'Due on receipt',
  c.created_by
FROM public.clients c
WHERE NOT EXISTS (
  SELECT 1 FROM public.accounting_clients ac
  WHERE ac.linked_crm_client_id = c.id
);
