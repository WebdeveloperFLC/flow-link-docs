-- CMS Phase 3B — Offer eligibility rules + conflict columns (§5.2, §5.5)
-- Spec: docs/guides/FLC_CMS_Cursor_Package/01_Build_Guide/FLC_CMS_Transformation_Brief.md

ALTER TABLE public.offers
  ADD COLUMN IF NOT EXISTS priority integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS stackable boolean NOT NULL DEFAULT false;

COMMENT ON COLUMN public.offers.priority IS 'Higher priority wins offer conflict ties (CMS §5.5).';
COMMENT ON COLUMN public.offers.stackable IS 'When true, offer may stack with another stackable offer.';

CREATE TABLE IF NOT EXISTS public.offer_eligibility_rules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  offer_id uuid REFERENCES public.offers(id) ON DELETE CASCADE,
  audience text NOT NULL DEFAULT 'existing',
  block_if_active_service boolean NOT NULL DEFAULT true,
  evaluate_against text[] NOT NULL DEFAULT '{enrollments,invoices,payments}',
  scope_service_code text,
  scope_country_tag text,
  scope_master_key text,
  is_active boolean NOT NULL DEFAULT true,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid,
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_offer_eligibility_rules_offer
  ON public.offer_eligibility_rules (offer_id, is_active);

COMMENT ON TABLE public.offer_eligibility_rules IS
  'Per-offer or global eligibility policy — blocks offers when client already enrolled in scoped service.';

ALTER TABLE public.offer_eligibility_rules ENABLE ROW LEVEL SECURITY;

DO $pol$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE policyname = 'offer_eligibility_rules_select' AND tablename = 'offer_eligibility_rules'
  ) THEN
    CREATE POLICY offer_eligibility_rules_select ON public.offer_eligibility_rules
      FOR SELECT TO authenticated
      USING (
        public.has_role(auth.uid(), 'admin'::public.app_role)
        OR public.has_role(auth.uid(), 'administrator'::public.app_role)
        OR public.has_role(auth.uid(), 'manager'::public.app_role)
        OR public.has_role(auth.uid(), 'director'::public.app_role)
        OR public.user_has_module(auth.uid(), 'offers', 'view')
      );
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE policyname = 'offer_eligibility_rules_write' AND tablename = 'offer_eligibility_rules'
  ) THEN
    CREATE POLICY offer_eligibility_rules_write ON public.offer_eligibility_rules
      FOR ALL TO authenticated
      USING (
        public.has_role(auth.uid(), 'admin'::public.app_role)
        OR public.has_role(auth.uid(), 'administrator'::public.app_role)
        OR public.has_role(auth.uid(), 'manager'::public.app_role)
        OR public.fn_can_manage_offers_studio(auth.uid())
      )
      WITH CHECK (
        public.has_role(auth.uid(), 'admin'::public.app_role)
        OR public.has_role(auth.uid(), 'administrator'::public.app_role)
        OR public.has_role(auth.uid(), 'manager'::public.app_role)
        OR public.fn_can_manage_offers_studio(auth.uid())
      );
  END IF;
END
$pol$;

CREATE OR REPLACE FUNCTION public.fn_client_enrolled_service_codes(_client_id uuid)
RETURNS text[]
LANGUAGE sql
STABLE
SET search_path = public
AS $$
  SELECT COALESCE(
    ARRAY(
      SELECT DISTINCT code
      FROM (
        SELECT unnest(COALESCE(c.visa_services, '{}')) AS code FROM public.clients c WHERE c.id = _client_id
        UNION ALL SELECT unnest(COALESCE(c.coaching_services, '{}')) FROM public.clients c WHERE c.id = _client_id
        UNION ALL SELECT unnest(COALESCE(c.admission_services, '{}')) FROM public.clients c WHERE c.id = _client_id
        UNION ALL SELECT unnest(COALESCE(c.allied_services, '{}')) FROM public.clients c WHERE c.id = _client_id
        UNION ALL SELECT unnest(COALESCE(c.travel_financial_services, '{}')) FROM public.clients c WHERE c.id = _client_id
      ) s
      WHERE code IS NOT NULL AND btrim(code) <> ''
    ),
    '{}'::text[]
  );
$$;

CREATE OR REPLACE FUNCTION public.fn_client_matches_eligibility_audience(_client_id uuid, _audience text)
RETURNS boolean
LANGUAGE plpgsql
STABLE
SET search_path = public
AS $$
DECLARE
  v_converted timestamptz;
  v_has_paid boolean;
  v_has_services boolean;
BEGIN
  SELECT converted_at INTO v_converted FROM public.clients WHERE id = _client_id;
  IF NOT FOUND THEN
    RETURN false;
  END IF;

  v_has_services := cardinality(public.fn_client_enrolled_service_codes(_client_id)) > 0;

  SELECT EXISTS (
    SELECT 1
      FROM public.client_invoices ci
     WHERE ci.client_id = _client_id
       AND ci.status IN ('paid', 'partially_paid', 'advance_received')
  ) INTO v_has_paid;

  CASE COALESCE(_audience, 'existing')
    WHEN 'new_lead' THEN RETURN v_converted IS NULL AND NOT v_has_paid;
    WHEN 'new_client' THEN RETURN v_converted IS NOT NULL AND NOT v_has_paid;
    WHEN 'existing' THEN RETURN v_has_paid OR v_has_services;
    WHEN 're_enrolled' THEN RETURN v_has_paid AND v_has_services;
    ELSE RETURN true;
  END CASE;
END;
$$;

CREATE OR REPLACE FUNCTION public.fn_offer_blocked_by_eligibility_rules(
  _client_id uuid,
  _offer_id uuid,
  _service_codes text[] DEFAULT NULL
)
RETURNS boolean
LANGUAGE sql
STABLE
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
      FROM public.offer_eligibility_rules er
      JOIN public.offers o ON o.id = _offer_id
     WHERE er.is_active
       AND (er.offer_id IS NULL OR er.offer_id = _offer_id)
       AND public.fn_client_matches_eligibility_audience(_client_id, er.audience)
       AND (
         NOT er.block_if_active_service
         OR (
           er.scope_service_code IS NOT NULL
           AND (
             er.scope_service_code = ANY(public.fn_client_enrolled_service_codes(_client_id))
             OR split_part(er.scope_service_code, '::', 1) = ANY(
               SELECT split_part(x, '::', 1)
               FROM unnest(public.fn_client_enrolled_service_codes(_client_id)) AS x
             )
           )
           AND (
             cardinality(o.applicable_services) = 0
             OR er.scope_service_code = ANY(o.applicable_services)
             OR split_part(er.scope_service_code, '::', 1) = ANY(
               SELECT split_part(x, '::', 1) FROM unnest(o.applicable_services) AS x
             )
           )
         )
       )
       AND (
         er.scope_country_tag IS NULL
         OR EXISTS (
           SELECT 1 FROM public.clients c
            WHERE c.id = _client_id
              AND (
                c.country ILIKE er.scope_country_tag
                OR c.interested_country ILIKE er.scope_country_tag
                OR er.scope_country_tag = ANY(COALESCE(c.interested_countries, '{}'))
              )
         )
       )
  );
$$;

CREATE OR REPLACE FUNCTION public.offers_eligible_for_client(
  _client_id uuid,
  _service_codes text[] DEFAULT NULL
)
RETURNS SETOF public.offers
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT o.*
    FROM public.offers o
   WHERE public.can_view_client(auth.uid(), _client_id)
     AND o.is_active
     AND o.status IN ('active', 'expiring_soon')
     AND (o.valid_from IS NULL OR o.valid_from <= now())
     AND (o.valid_to   IS NULL OR o.valid_to   >= now())
     AND (
       o.audience = 'global'
       OR (o.audience = 'individual' AND EXISTS (
         SELECT 1 FROM public.offer_audience_targets t
          WHERE t.offer_id = o.id AND t.client_id = _client_id
       ))
       OR (o.audience = 'group' AND EXISTS (
         SELECT 1 FROM public.offer_audience_targets t
          JOIN public.offer_group_members m ON m.group_id = t.group_id
          WHERE t.offer_id = o.id AND m.client_id = _client_id
       ))
     )
     AND (
       cardinality(o.target_countries) = 0
       OR EXISTS (
         SELECT 1 FROM public.clients c
          WHERE c.id = _client_id
            AND c.interested_country = ANY (o.target_countries)
       )
     )
     AND (
       cardinality(o.applicable_services) = 0
       OR _service_codes IS NULL
       OR cardinality(_service_codes) = 0
       OR o.applicable_services && _service_codes
     )
     AND (
       o.max_redemptions IS NULL
       OR o.redemption_count < o.max_redemptions
     )
     AND (
       o.per_client_limit IS NULL
       OR (
         SELECT count(*) FROM public.client_offers co
          WHERE co.offer_id = o.id
            AND co.client_id = _client_id
            AND co.status = 'used'
       ) < o.per_client_limit
     )
     AND NOT public.fn_offer_blocked_by_eligibility_rules(_client_id, o.id, _service_codes)
   ORDER BY o.priority DESC, o.created_at DESC
$$;

GRANT EXECUTE ON FUNCTION public.fn_client_enrolled_service_codes(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.fn_client_matches_eligibility_audience(uuid, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.fn_offer_blocked_by_eligibility_rules(uuid, uuid, text[]) TO authenticated;

COMMENT ON FUNCTION public.offers_eligible_for_client(uuid, text[]) IS
  'Eligible live offers for a client; extended with offer_eligibility_rules blocking + priority ordering.';
