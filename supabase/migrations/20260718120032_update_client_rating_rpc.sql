-- RPC for counselor star rating (works once clients.client_rating exists).
CREATE OR REPLACE FUNCTION public.update_client_rating(_client_id uuid, _rating smallint)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO public
AS $$
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  IF NOT (
    public.is_client_staff_editor(auth.uid())
    OR public.can_edit_client(auth.uid(), _client_id)
  ) THEN
    RAISE EXCEPTION 'Permission denied';
  END IF;

  IF _rating IS NOT NULL AND (_rating < 1 OR _rating > 5) THEN
    RAISE EXCEPTION 'Rating must be between 1 and 5';
  END IF;

  UPDATE public.clients
  SET client_rating = _rating
  WHERE id = _client_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Client not found';
  END IF;
END;
$$;

GRANT EXECUTE ON FUNCTION public.update_client_rating(uuid, smallint) TO authenticated;

NOTIFY pgrst, 'reload schema';
