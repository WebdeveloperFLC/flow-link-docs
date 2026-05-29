-- ============================================================
-- Offers Module — Phase 1 Step 3: Redemption Tracking & Code Generator
--
-- Three additive pieces, all operating only on the offers-family tables
-- created in Step 1 (offers, client_offers, offer_tracking_codes,
-- offer_events). NO change to client_invoices or any financial logic.
--
-- 1. generate_offer_tracking_code(offer_id, counselor_id)
--      → returns a unique per-counselor code; idempotent (reuses existing).
-- 2. fn_increment_redemption_count() + trigger on client_offers
--      → bumps offers.redemption_count when a claim flips to 'used'.
-- 3. log_offer_event(...)
--      → security-gated append helper for the offer_events analytics log.
--
-- Idempotent: CREATE OR REPLACE on functions; trigger dropped+recreated;
-- no table/column changes.
--
-- Rollback:
--   DROP TRIGGER IF EXISTS trg_client_offers_redemption ON public.client_offers;
--   DROP FUNCTION IF EXISTS public.fn_increment_redemption_count();
--   DROP FUNCTION IF EXISTS public.generate_offer_tracking_code(uuid, uuid);
--   DROP FUNCTION IF EXISTS public.log_offer_event(uuid, uuid, uuid, text, text, numeric, text);
-- ============================================================

-- ─────────────────────────────────────────────────────────────
-- 1. generate_offer_tracking_code(offer_id, counselor_id)
--    Unique per-counselor code. Idempotent: if a code already exists
--    for this (offer, counselor) pair, return it instead of creating
--    a duplicate. Code format: <PROMO-or-OFFR>-<4 hex chars>.
-- ─────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.generate_offer_tracking_code(
  _offer_id uuid,
  _counselor_id uuid
)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _existing text;
  _prefix text;
  _candidate text;
  _tries int := 0;
BEGIN
  -- Caller must be staff (not a portal/client role). Admins always allowed.
  IF NOT (
    public.has_role(auth.uid(), 'admin'::public.app_role)
    OR public.has_role(auth.uid(), 'counselor'::public.app_role)
  ) THEN
    RAISE EXCEPTION 'Not authorized to generate tracking codes';
  END IF;

  -- Reuse existing code for this offer + counselor (idempotent)
  SELECT code INTO _existing
    FROM public.offer_tracking_codes
   WHERE offer_id = _offer_id AND counselor_id = _counselor_id
   LIMIT 1;

  IF _existing IS NOT NULL THEN
    RETURN _existing;
  END IF;

  -- Derive a prefix from the offer's promo_code, else 'OFFR'
  SELECT COALESCE(NULLIF(upper(regexp_replace(o.promo_code, '[^A-Za-z0-9]', '', 'g')), ''), 'OFFR')
    INTO _prefix
    FROM public.offers o
   WHERE o.id = _offer_id;

  IF _prefix IS NULL THEN
    RAISE EXCEPTION 'Offer % not found', _offer_id;
  END IF;

  -- Generate a unique candidate (prefix + 4 hex chars), retry on collision
  LOOP
    _tries := _tries + 1;
    _candidate := _prefix || '-' || upper(substr(encode(gen_random_bytes(2), 'hex'), 1, 4));

    BEGIN
      INSERT INTO public.offer_tracking_codes (offer_id, counselor_id, code)
      VALUES (_offer_id, _counselor_id, _candidate);
      RETURN _candidate;
    EXCEPTION WHEN unique_violation THEN
      IF _tries >= 10 THEN
        RAISE EXCEPTION 'Could not generate a unique tracking code after % attempts', _tries;
      END IF;
      -- loop and retry
    END;
  END LOOP;
END;
$$;

GRANT EXECUTE ON FUNCTION public.generate_offer_tracking_code(uuid, uuid) TO authenticated;

COMMENT ON FUNCTION public.generate_offer_tracking_code(uuid, uuid) IS
  'Phase 1 #8: returns a unique per-counselor tracking code for an offer. '
  'Idempotent per (offer, counselor). Staff-only (admin/counselor).';

-- ─────────────────────────────────────────────────────────────
-- 2. Redemption counter trigger on client_offers
--    When status transitions INTO 'used', increment the parent
--    offer's redemption_count. Decrement if it transitions back OUT
--    of 'used' (safety for corrections). Counter never goes negative.
-- ─────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.fn_increment_redemption_count()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    IF NEW.status = 'used' THEN
      UPDATE public.offers
         SET redemption_count = redemption_count + 1
       WHERE id = NEW.offer_id;
    END IF;
    RETURN NEW;
  ELSIF TG_OP = 'UPDATE' THEN
    -- transitioned INTO 'used'
    IF NEW.status = 'used' AND COALESCE(OLD.status, '') <> 'used' THEN
      UPDATE public.offers
         SET redemption_count = redemption_count + 1
       WHERE id = NEW.offer_id;
    -- transitioned OUT OF 'used' (correction)
    ELSIF OLD.status = 'used' AND COALESCE(NEW.status, '') <> 'used' THEN
      UPDATE public.offers
         SET redemption_count = GREATEST(redemption_count - 1, 0)
       WHERE id = NEW.offer_id;
    END IF;
    RETURN NEW;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_client_offers_redemption ON public.client_offers;
CREATE TRIGGER trg_client_offers_redemption
  AFTER INSERT OR UPDATE OF status ON public.client_offers
  FOR EACH ROW EXECUTE FUNCTION public.fn_increment_redemption_count();

-- ─────────────────────────────────────────────────────────────
-- 3. log_offer_event(...) — analytics append helper
--    Security-gated: caller must be staff OR a portal user for the
--    given client. Mirrors the offer_events RLS intent.
-- ─────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.log_offer_event(
  _offer_id uuid,
  _client_id uuid DEFAULT NULL,
  _counselor_id uuid DEFAULT NULL,
  _event_type text DEFAULT 'viewed',
  _channel text DEFAULT NULL,
  _revenue_amount numeric DEFAULT 0,
  _tracking_code text DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _id uuid;
BEGIN
  IF _event_type NOT IN ('viewed','claimed','redeemed','delivered') THEN
    RAISE EXCEPTION 'Invalid offer event_type: %', _event_type;
  END IF;

  -- Authorization: staff, OR the portal user tied to this client (if client given)
  IF NOT (
    public.has_role(auth.uid(), 'admin'::public.app_role)
    OR public.has_role(auth.uid(), 'counselor'::public.app_role)
    OR (_client_id IS NOT NULL AND public.can_view_client(auth.uid(), _client_id))
    OR (_client_id IS NOT NULL AND public.is_portal_user_for(auth.uid(), _client_id))
  ) THEN
    RAISE EXCEPTION 'Not authorized to log offer event';
  END IF;

  INSERT INTO public.offer_events (
    offer_id, client_id, counselor_id, event_type, channel, revenue_amount, tracking_code
  ) VALUES (
    _offer_id, _client_id, _counselor_id, _event_type, _channel, COALESCE(_revenue_amount, 0), _tracking_code
  )
  RETURNING id INTO _id;

  RETURN _id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.log_offer_event(uuid, uuid, uuid, text, text, numeric, text) TO authenticated;

COMMENT ON FUNCTION public.log_offer_event(uuid, uuid, uuid, text, text, numeric, text) IS
  'Phase 1 #9: append an offer_events analytics row. Gated to staff or the '
  'portal user for the client. event_type in (viewed,claimed,redeemed,delivered).';
