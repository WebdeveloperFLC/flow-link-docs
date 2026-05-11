-- Replace overly-permissive SELECT policy on offers
DROP POLICY IF EXISTS offers_select ON public.offers;

-- Staff: admins, counselors, and telecallers can see all offers (needed for the admin offers page)
CREATE POLICY offers_select_staff
ON public.offers
FOR SELECT
TO authenticated
USING (
  public.has_role(auth.uid(), 'admin'::app_role)
  OR public.has_role(auth.uid(), 'counselor'::app_role)
  OR public.has_role(auth.uid(), 'telecaller'::app_role)
);

-- Clients: only offers they're eligible for, within the active date window
CREATE POLICY offers_select_client
ON public.offers
FOR SELECT
TO authenticated
USING (
  public.user_can_see_offer(auth.uid(), id)
);
