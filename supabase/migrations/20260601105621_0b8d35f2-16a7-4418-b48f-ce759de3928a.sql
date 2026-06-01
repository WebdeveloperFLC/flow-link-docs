-- ============================================================
-- Offers Module — FIX: generate_offer_tracking_code search_path
--
-- The function called bare gen_random_bytes(2) while declaring
-- SET search_path = public. pgcrypto's gen_random_bytes lives in the
-- 'extensions' schema, so the bare call could not resolve →
-- "function gen_random_bytes(integer) does not exist" → INSERT threw →
-- UI showed "Failed to generate code".
--
-- FIX: widen search_path to 'public, extensions' so the call resolves.
-- This mirrors the existing precedent fix in migration 20260531210253.
--
-- The function body is otherwise IDENTICAL to its prior definition.
-- No table, column, RLS policy, trigger, other function, or UI is changed.
--
-- Rollback: re-apply the prior definition with SET search_path = public.
-- ============================================================
CREATE OR REPLACE FUNCTION public.generate_offer_tracking_code(
  _offer_id uuid,
  _counselor_id uuid
)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
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
  'Idempotent per (offer, counselor). Staff-only (admin/counselor). '
  'search_path includes extensions for pgcrypto gen_random_bytes.';