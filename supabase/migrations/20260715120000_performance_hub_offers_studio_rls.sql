-- PH-BUG-001 / PH-UAT-OFFERS-004 — MarCom offers library lifecycle (activate, save, wizard)
-- offers table previously allowed ALL only for admin role; MarCom module edit users
-- could SELECT (counselor role) but not INSERT/UPDATE. Lifecycle RPCs are SECURITY DEFINER,
-- but direct saves and consistent RLS require studio write policy.

-- ── SELECT: module viewers + managers (not only counselor/telecaller) ───────────
DROP POLICY IF EXISTS offers_select_staff ON public.offers;

CREATE POLICY offers_select_staff
ON public.offers
FOR SELECT
TO authenticated
USING (
  public.has_role(auth.uid(), 'admin'::public.app_role)
  OR public.has_role(auth.uid(), 'administrator'::public.app_role)
  OR public.has_role(auth.uid(), 'manager'::public.app_role)
  OR public.has_role(auth.uid(), 'counselor'::public.app_role)
  OR public.has_role(auth.uid(), 'telecaller'::public.app_role)
  OR public.user_has_module(auth.uid(), 'offers', 'view')
);

-- ── INSERT / UPDATE / DELETE for offers studio editors ─────────────────────────
DO $pol$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE policyname = 'offers_studio_write' AND tablename = 'offers'
  ) THEN
    CREATE POLICY offers_studio_write ON public.offers
      FOR ALL
      TO authenticated
      USING (public.fn_can_manage_offers_studio(auth.uid()))
      WITH CHECK (public.fn_can_manage_offers_studio(auth.uid()));
  END IF;
END
$pol$;

-- ── Harden lifecycle RPC (director read-only guard) ───────────────────────────
CREATE OR REPLACE FUNCTION public.fn_offer_set_status(
  _offer_id uuid,
  _to_status public.offer_status,
  _note text DEFAULT NULL
)
RETURNS public.offers
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_old public.offer_status;
  v_offer public.offers%ROWTYPE;
  v_uid uuid := auth.uid();
BEGIN
  PERFORM public.fn_assert_not_director_read_only();

  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'authentication required';
  END IF;

  IF NOT public.fn_can_manage_offers_studio(v_uid) THEN
    RAISE EXCEPTION 'forbidden: offers edit permission required';
  END IF;

  SELECT status INTO v_old FROM public.offers WHERE id = _offer_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'offer not found';
  END IF;

  IF v_old = _to_status THEN
    SELECT * INTO v_offer FROM public.offers WHERE id = _offer_id;
    RETURN v_offer;
  END IF;

  UPDATE public.offers
     SET status = _to_status,
         updated_at = now()
   WHERE id = _offer_id
   RETURNING * INTO v_offer;

  INSERT INTO public.offer_status_history (offer_id, from_status, to_status, changed_by, note)
  VALUES (_offer_id, v_old, _to_status, v_uid, _note);

  RETURN v_offer;
END;
$$;

GRANT EXECUTE ON FUNCTION public.fn_offer_set_status(uuid, public.offer_status, text) TO authenticated;

COMMENT ON FUNCTION public.fn_offer_set_status IS
  'Offer lifecycle transition — MarCom/admin via fn_can_manage_offers_studio; logs offer_status_history';
