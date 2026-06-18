-- Numbering standardization (go-live):
--   Leads:        FL-H|W|C|B-YYYY-NNNN  (hot/warm/cold/B2B)
--   Client file:  FL-CF-YYYY-NNNN       (clients.application_id)
--   Registration: FL-YYYY-NNNN          (clients.registration_number, assigned on demand)

-- ---------------------------------------------------------------------------
-- 1) Client file numbers (FL-CF-YYYY-NNNN) → clients.application_id
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.client_file_sequences (
  year integer PRIMARY KEY,
  last_number integer NOT NULL DEFAULT 0
);
ALTER TABLE public.client_file_sequences ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.generate_client_file_number()
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_year integer := EXTRACT(YEAR FROM now())::int;
  v_next integer;
BEGIN
  INSERT INTO public.client_file_sequences (year, last_number)
  VALUES (v_year, 1)
  ON CONFLICT (year) DO UPDATE
    SET last_number = public.client_file_sequences.last_number + 1
  RETURNING last_number INTO v_next;
  RETURN 'FL-CF-' || v_year::text || '-' || LPAD(v_next::text, 4, '0');
END;
$$;

ALTER TABLE public.clients ALTER COLUMN application_id DROP DEFAULT;

CREATE OR REPLACE FUNCTION public.fn_assign_client_file_number()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.application_id IS NULL OR btrim(NEW.application_id) = '' THEN
    NEW.application_id := public.generate_client_file_number();
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_assign_client_file_number ON public.clients;
CREATE TRIGGER trg_assign_client_file_number
BEFORE INSERT ON public.clients
FOR EACH ROW EXECUTE FUNCTION public.fn_assign_client_file_number();

-- ---------------------------------------------------------------------------
-- 2) Registration numbers (FL-YYYY-NNNN) — year-scoped, assigned on demand only
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.client_registration_sequences (
  year integer PRIMARY KEY,
  last_number integer NOT NULL DEFAULT 0
);
ALTER TABLE public.client_registration_sequences ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.generate_client_registration_number()
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_year integer := EXTRACT(YEAR FROM now())::int;
  v_next integer;
BEGIN
  INSERT INTO public.client_registration_sequences (year, last_number)
  VALUES (v_year, 1)
  ON CONFLICT (year) DO UPDATE
    SET last_number = public.client_registration_sequences.last_number + 1
  RETURNING last_number INTO v_next;
  RETURN 'FL-' || v_year::text || '-' || LPAD(v_next::text, 4, '0');
END;
$$;

ALTER TABLE public.clients
  ADD COLUMN IF NOT EXISTS source_lead_number text,
  ADD COLUMN IF NOT EXISTS registered_at timestamptz;

CREATE OR REPLACE FUNCTION public.assign_client_registration_number(_client_id uuid)
RETURNS public.clients
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_row public.clients;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Not authenticated' USING ERRCODE = '28000';
  END IF;

  SELECT * INTO v_row FROM public.clients WHERE id = _client_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Client not found' USING ERRCODE = 'P0002';
  END IF;

  IF v_row.registration_number IS NOT NULL THEN
    RETURN v_row;
  END IF;

  UPDATE public.clients
     SET registration_number = public.generate_client_registration_number(),
         registered_at = COALESCE(registered_at, now())
   WHERE id = _client_id
   RETURNING * INTO v_row;

  RETURN v_row;
END;
$$;

REVOKE ALL ON FUNCTION public.assign_client_registration_number(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.assign_client_registration_number(uuid) TO authenticated;

-- ---------------------------------------------------------------------------
-- 3) Lead numbers — H/W/C (was L for warm/hot) + B for B2B
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.fn_assign_lead_number()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_type text;
BEGIN
  IF NEW.lead_number IS NULL OR NEW.lead_number = '' THEN
    v_type := CASE
      WHEN NEW.b2b_partner_id IS NOT NULL THEN 'B'
      WHEN NEW.is_cold_pool OR NEW.lead_type = 'cold'
           OR COALESCE(NEW.lead_temperature, '') = 'cold' THEN 'C'
      WHEN NEW.lead_type = 'hot' OR COALESCE(NEW.lead_temperature, '') = 'hot' THEN 'H'
      ELSE 'W'
    END;
    NEW.lead_number := public.generate_lead_number(v_type);
  END IF;
  IF NEW.created_by IS NULL THEN NEW.created_by := auth.uid(); END IF;
  RETURN NEW;
END;
$$;

-- ---------------------------------------------------------------------------
-- 4) Lead conversion trigger — file # only; no auto registration #
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.fn_mark_lead_converted_on_client()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_lead_number text;
BEGIN
  IF NEW.source_lead_id IS NOT NULL
     AND (TG_OP = 'INSERT' OR OLD.source_lead_id IS DISTINCT FROM NEW.source_lead_id) THEN
    SELECT lead_number INTO v_lead_number
      FROM public.leads
     WHERE id = NEW.source_lead_id;

    IF v_lead_number IS NOT NULL THEN
      NEW.source_lead_number := COALESCE(NEW.source_lead_number, v_lead_number);
    END IF;

    UPDATE public.leads
       SET status = 'converted',
           converted_to_client_id = NEW.id,
           converted_at = COALESCE(converted_at, now())
     WHERE id = NEW.source_lead_id;
  END IF;
  RETURN NEW;
END;
$$;

NOTIFY pgrst, 'reload schema';
