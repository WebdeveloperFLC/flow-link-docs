
DROP POLICY IF EXISTS "clients insert scoped" ON public.clients;

CREATE POLICY "clients insert scoped"
ON public.clients
FOR INSERT
TO authenticated
WITH CHECK (
  auth.uid() IS NOT NULL
  AND (owner_id IS NULL OR owner_id = auth.uid())
  AND (created_by IS NULL OR created_by = auth.uid())
);

CREATE OR REPLACE FUNCTION public.set_client_owner_defaults()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.owner_id IS NULL THEN NEW.owner_id := auth.uid(); END IF;
  IF NEW.created_by IS NULL THEN NEW.created_by := auth.uid(); END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_set_client_owner_defaults ON public.clients;
CREATE TRIGGER trg_set_client_owner_defaults
BEFORE INSERT ON public.clients
FOR EACH ROW EXECUTE FUNCTION public.set_client_owner_defaults();
