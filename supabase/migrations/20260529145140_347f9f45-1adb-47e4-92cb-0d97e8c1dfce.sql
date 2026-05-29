-- ============================================================
-- Offers Module — Phase 1 Step 2: Eligibility RPC
--
-- offers_eligible_for_client(_client_id uuid)
--   Returns the set of currently-eligible offers for a given client,
--   evaluated STAFF-side (counselor attaching an offer, or analytics).
--   This is the staff counterpart to the existing portal-side
--   user_can_see_offer(_uid, _offer_id).
--
-- Eligibility rules (Phase 1 approved scope):
--   - offer is active
--   - within validity window (valid_from / valid_to)
--   - audience match:
--       global       → always
--       individual   → client is an explicit audience target
--       group        → client belongs to a targeted group
--   - country match (Gate A): target_countries empty OR
--       clients.interested_country is in target_countries
--   - service match (#3): applicable_services empty OR overlaps the
--       _service_codes argument (caller passes services being purchased;
--       NULL/empty = no service filter)
--   - usage caps:
--       max_redemptions   → offer.redemption_count < max_redemptions
--       per_client_limit  → client's used count for this offer < per_client_limit
--
-- Security: SECURITY DEFINER, but access-gated — the function itself
--   verifies the CALLER can view the client (can_view_client) before
--   returning anything. Non-authorized callers get an empty set.
--
-- This migration is ADDITIVE ONLY and idempotent (CREATE OR REPLACE).
-- No table, column, policy, trigger, or existing function is modified.
--
-- Rollback:
--   DROP FUNCTION IF EXISTS public.offers_eligible_for_client(uuid, text[]);
-- ============================================================

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
   WHERE
     -- caller authorization: must be able to view this client
     public.can_view_client(auth.uid(), _client_id)
     AND o.is_active
     AND (o.valid_from IS NULL OR o.valid_from <= now())
     AND (o.valid_to   IS NULL OR o.valid_to   >= now())
     -- audience match
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
     -- country match (Gate A: clients.interested_country)
     AND (
       cardinality(o.target_countries) = 0
       OR EXISTS (
         SELECT 1 FROM public.clients c
          WHERE c.id = _client_id
            AND c.interested_country = ANY (o.target_countries)
       )
     )
     -- service match (#3): empty offer list = no filter; else overlap
     AND (
       cardinality(o.applicable_services) = 0
       OR _service_codes IS NULL
       OR cardinality(_service_codes) = 0
       OR o.applicable_services && _service_codes
     )
     -- usage cap: total redemptions
     AND (
       o.max_redemptions IS NULL
       OR o.redemption_count < o.max_redemptions
     )
     -- usage cap: per-client limit (count this client's 'used' claims)
     AND (
       o.per_client_limit IS NULL
       OR (
         SELECT count(*) FROM public.client_offers co
          WHERE co.offer_id = o.id
            AND co.client_id = _client_id
            AND co.status = 'used'
       ) < o.per_client_limit
     )
   ORDER BY o.created_at DESC
$$;

-- Staff + portal users may call it; the function's internal can_view_client
-- check is the real gate, so EXECUTE can be broad.
GRANT EXECUTE ON FUNCTION public.offers_eligible_for_client(uuid, text[]) TO authenticated;

COMMENT ON FUNCTION public.offers_eligible_for_client(uuid, text[]) IS
  'Phase 1 staff-side offer eligibility for a client. Caller-gated via can_view_client. '
  'Country match uses clients.interested_country (Gate A). Service arg optional.';