-- Phase 5H — AI Offer Studio gate, audit log, L0 suggestion metadata

CREATE OR REPLACE FUNCTION public.fn_can_use_offer_ai_studio(_user_id uuid DEFAULT auth.uid())
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT _user_id IS NOT NULL AND (
    public.has_role(_user_id, 'admin'::public.app_role)
    OR public.has_role(_user_id, 'administrator'::public.app_role)
    OR public.user_has_module(_user_id, 'offers_ai', 'edit')
  );
$$;

GRANT EXECUTE ON FUNCTION public.fn_can_use_offer_ai_studio(uuid) TO authenticated;

CREATE TABLE IF NOT EXISTS public.offer_ai_generations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_by uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  brief jsonb NOT NULL DEFAULT '{}'::jsonb,
  result jsonb NOT NULL DEFAULT '{}'::jsonb,
  offer_id uuid REFERENCES public.offers(id) ON DELETE SET NULL,
  model text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_offer_ai_generations_created_by
  ON public.offer_ai_generations (created_by, created_at DESC);

ALTER TABLE public.offer_ai_generations ENABLE ROW LEVEL SECURITY;

DO $pol$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE policyname = 'offer_ai_generations_select' AND tablename = 'offer_ai_generations'
  ) THEN
    CREATE POLICY offer_ai_generations_select ON public.offer_ai_generations FOR SELECT TO authenticated
      USING (
        created_by = auth.uid()
        OR public.has_role(auth.uid(), 'admin'::public.app_role)
        OR public.has_role(auth.uid(), 'administrator'::public.app_role)
        OR public.user_has_module(auth.uid(), 'offers_ai', 'edit')
      );
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE policyname = 'offer_ai_generations_insert' AND tablename = 'offer_ai_generations'
  ) THEN
    CREATE POLICY offer_ai_generations_insert ON public.offer_ai_generations FOR INSERT TO authenticated
      WITH CHECK (
        created_by = auth.uid()
        AND public.fn_can_use_offer_ai_studio(auth.uid())
      );
  END IF;
END
$pol$;

GRANT SELECT, INSERT ON public.offer_ai_generations TO authenticated;

-- L0 suggestion payload: expose wallet + level for client strip
CREATE OR REPLACE FUNCTION public.fn_suggest_offer_for_client(_client_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_offer record;
  v_unlocked numeric := 0;
  v_potential numeric := 0;
  v_reason text;
  v_has_payment boolean;
BEGIN
  IF v_uid IS NULL THEN RETURN jsonb_build_object('found', false); END IF;

  SELECT EXISTS (
    SELECT 1 FROM public.client_invoice_payments p
    WHERE p.client_id = _client_id
      AND p.archived_at IS NULL
      AND p.is_refund IS DISTINCT FROM true
      AND (p.payment_status = 'verified' OR p.payment_proof_status = 'verified')
  ) INTO v_has_payment;

  SELECT coalesce(w.unlocked_amount, 0), coalesce(w.potential_wallet, 0)
    INTO v_unlocked, v_potential
    FROM public.discount_wallets w
   WHERE w.counselor_id = v_uid
     AND w.period_key = to_char(current_date, 'YYYY-MM')
     AND w.budget_kind = 'month_to_month'
   ORDER BY w.updated_at DESC
   LIMIT 1;

  SELECT o.id, o.title, o.discount_type, o.discount_value, o.funding_source
    INTO v_offer
    FROM public.offers_eligible_for_client(_client_id) o
   WHERE o.status IN ('active', 'expiring_soon')
   ORDER BY
     CASE WHEN NOT v_has_payment AND o.title ILIKE '%enrol%' THEN 0 ELSE 1 END,
     o.discount_value DESC NULLS LAST
   LIMIT 1;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('found', false, 'suggestion_level', 'L0');
  END IF;

  v_reason := CASE
    WHEN NOT v_has_payment AND v_unlocked > 0 THEN
      'No verified payment yet — you have ₹' || trim(to_char(v_unlocked, 'FM999,999,990')) || ' wallet unlocked for a conversion offer'
    WHEN NOT v_has_payment THEN
      'No verified payment yet — enrolment-style offer may help conversion'
    WHEN v_unlocked > 0 THEN
      'Eligible offer · ₹' || trim(to_char(v_unlocked, 'FM999,999,990')) || ' wallet unlocked this period'
    ELSE 'Eligible active offer from library'
  END;

  RETURN jsonb_build_object(
    'found', true,
    'suggestion_level', 'L0',
    'offer_id', v_offer.id,
    'title', v_offer.title,
    'discount_type', v_offer.discount_type,
    'discount_value', v_offer.discount_value,
    'funding_source', v_offer.funding_source,
    'reason', v_reason,
    'wallet_unlocked', v_unlocked,
    'wallet_potential', v_potential
  );
END;
$$;

COMMENT ON TABLE public.offer_ai_generations IS 'Phase 5H — AI Offer Studio generation audit (MarCom/Admin only)';
COMMENT ON FUNCTION public.fn_can_use_offer_ai_studio IS 'Gate for offer-ai-studio edge function and /performance/offers/ai-studio';
