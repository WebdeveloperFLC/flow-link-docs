-- 1. Trigger function: auto-create applicant case_people row for new clients
CREATE OR REPLACE FUNCTION public.ensure_applicant_for_client()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM public.case_people
     WHERE client_id = NEW.id AND role = 'applicant' AND NOT is_archived
  ) THEN
    INSERT INTO public.case_people (client_id, role, full_name)
    VALUES (NEW.id, 'applicant', NEW.full_name);
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS clients_ensure_applicant ON public.clients;
CREATE TRIGGER clients_ensure_applicant
  AFTER INSERT ON public.clients
  FOR EACH ROW EXECUTE FUNCTION public.ensure_applicant_for_client();

-- 2. One-time backfill for any client missing an active applicant
INSERT INTO public.case_people (client_id, role, full_name)
SELECT c.id, 'applicant', c.full_name
  FROM public.clients c
 WHERE NOT EXISTS (
   SELECT 1 FROM public.case_people p
    WHERE p.client_id = c.id AND p.role = 'applicant' AND NOT p.is_archived
 );

-- 3. Repoint orphaned documents/profile rows at the new applicant
UPDATE public.client_documents d
   SET person_id = p.id
  FROM public.case_people p
 WHERE p.client_id = d.client_id
   AND p.role = 'applicant'
   AND NOT p.is_archived
   AND d.person_id IS NULL;

UPDATE public.client_profile cp
   SET person_id = p.id
  FROM public.case_people p
 WHERE p.client_id = cp.client_id
   AND p.role = 'applicant'
   AND NOT p.is_archived
   AND cp.person_id IS NULL;