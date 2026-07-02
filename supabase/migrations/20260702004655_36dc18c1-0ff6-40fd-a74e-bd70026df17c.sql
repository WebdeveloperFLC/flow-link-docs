CREATE OR REPLACE FUNCTION public.can_upload_client(_uid uuid, _cid uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT public.user_client_permission(_uid, _cid) IN ('edit', 'upload', 'full')
$$;

COMMENT ON FUNCTION public.can_upload_client(uuid, uuid) IS
  'True when user may upload client documents (edit, upload, or full client access).';