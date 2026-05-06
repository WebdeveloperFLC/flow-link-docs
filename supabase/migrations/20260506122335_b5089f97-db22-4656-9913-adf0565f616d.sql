
DROP POLICY IF EXISTS "clients insert scoped" ON public.clients;
CREATE POLICY "clients insert scoped"
ON public.clients FOR INSERT TO authenticated
WITH CHECK (auth.uid() IS NOT NULL);

CREATE OR REPLACE FUNCTION public.set_client_owner_defaults()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  NEW.owner_id   := auth.uid();
  NEW.created_by := auth.uid();
  RETURN NEW;
END $$;
