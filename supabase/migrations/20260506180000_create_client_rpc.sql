CREATE OR REPLACE FUNCTION public.create_client(
  _full_name text,
  _country text,
  _application_type text,
  _email text DEFAULT NULL,
  _phone text DEFAULT NULL,
  _template_id uuid DEFAULT NULL
) RETURNS public.clients
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  uid uuid := auth.uid();
  new_row public.clients;
BEGIN
  IF uid IS NULL THEN
    RAISE EXCEPTION 'Not authenticated' USING ERRCODE = '28000';
  END IF;
  IF _full_name IS NULL OR length(btrim(_full_name)) < 2 THEN
    RAISE EXCEPTION 'Full name required' USING ERRCODE = '22023';
  END IF;
  IF _country IS NULL OR _application_type IS NULL THEN
    RAISE EXCEPTION 'Country and application type required' USING ERRCODE = '22023';
  END IF;

  INSERT INTO public.clients (full_name, email, phone, country, application_type, template_id, owner_id, created_by)
  VALUES (btrim(_full_name), NULLIF(_email,''), NULLIF(_phone,''), _country, _application_type, _template_id, uid, uid)
  RETURNING * INTO new_row;

  RETURN new_row;
END;
$$;

REVOKE ALL ON FUNCTION public.create_client(text,text,text,text,text,uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.create_client(text,text,text,text,text,uuid) TO authenticated;
