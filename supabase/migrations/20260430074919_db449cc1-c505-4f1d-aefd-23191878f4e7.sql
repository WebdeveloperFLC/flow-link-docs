-- Allow 'documentation' role to create/update clients and case_people, matching upload rights
DROP POLICY IF EXISTS "counselors+admins create clients" ON public.clients;
DROP POLICY IF EXISTS "counselors+admins update clients" ON public.clients;

CREATE POLICY "team creates clients"
ON public.clients FOR INSERT TO authenticated
WITH CHECK (
  has_role(auth.uid(), 'admin'::app_role)
  OR has_role(auth.uid(), 'counselor'::app_role)
  OR has_role(auth.uid(), 'documentation'::app_role)
);

CREATE POLICY "team updates clients"
ON public.clients FOR UPDATE TO authenticated
USING (
  has_role(auth.uid(), 'admin'::app_role)
  OR has_role(auth.uid(), 'counselor'::app_role)
  OR has_role(auth.uid(), 'documentation'::app_role)
);

DROP POLICY IF EXISTS "team inserts case_people" ON public.case_people;
DROP POLICY IF EXISTS "team updates case_people" ON public.case_people;

CREATE POLICY "team inserts case_people"
ON public.case_people FOR INSERT TO authenticated
WITH CHECK (
  has_role(auth.uid(), 'admin'::app_role)
  OR has_role(auth.uid(), 'counselor'::app_role)
  OR has_role(auth.uid(), 'documentation'::app_role)
);

CREATE POLICY "team updates case_people"
ON public.case_people FOR UPDATE TO authenticated
USING (
  has_role(auth.uid(), 'admin'::app_role)
  OR has_role(auth.uid(), 'counselor'::app_role)
  OR has_role(auth.uid(), 'documentation'::app_role)
);